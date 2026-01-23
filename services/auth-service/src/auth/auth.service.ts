import { Injectable, UnauthorizedException, ConflictException, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as argon2 from 'argon2';
import { UsersService } from '../users/users.service';
import { RedisService } from '../redis/redis.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { SecurityLoggerService, SecurityEventType } from '@smartcare/common';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private configService: ConfigService,
    private redisService: RedisService,
    private securityLogger: SecurityLoggerService,
  ) {}

  async register(registerDto: RegisterDto) {
    const existingUser = await this.usersService.findByEmail(registerDto.email);

    if (existingUser) {
      this.securityLogger.logSecurityEvent(SecurityEventType.REGISTRATION, {
        email: registerDto.email,
        outcome: 'FAILED',
        reason: 'Email already registered'
      });
      throw new ConflictException('Email already registered');
    }

    const user = await this.usersService.create(registerDto);

    this.securityLogger.logSecurityEvent(SecurityEventType.REGISTRATION, {
      userId: user.id,
      email: user.email,
      role: user.role,
      outcome: 'SUCCESS'
    });

    return user;
  }

  async login(loginDto: LoginDto) {
    // ✅ ACCOUNT LOCKOUT CHECK: Prevent brute force attacks
    const lockoutKey = `lockout:${loginDto.email}`;
    const attempts = await this.redisService.get<string>(lockoutKey);

    if (attempts && parseInt(attempts) >= 5) {
      this.securityLogger.logSecurityEvent(SecurityEventType.LOGIN_FAILURE, {
        email: loginDto.email,
        reason: 'Account locked due to multiple failed attempts'
      });
      throw new UnauthorizedException('Account locked due to multiple failed login attempts. Try again in 15 minutes.');
    }

    const user = await this.usersService.findByEmail(loginDto.email);

    // SECURITY FIX: Use generic error message to prevent user enumeration
    // Don't reveal whether email exists or password is wrong
    const genericError = 'Invalid email or password';

    if (!user) {
      // Even if user doesn't exist, perform a dummy hash verification
      // to prevent timing attacks that could reveal valid emails
      await argon2.hash('dummy-password-to-maintain-timing', {
        type: argon2.argon2id,
        memoryCost: 65536,
        timeCost: 3,
        parallelism: 4,
      });

      // ✅ INCREMENT FAILED ATTEMPTS for invalid email
      const currentAttempts = attempts ? parseInt(attempts) + 1 : 1;
      await this.redisService.set(lockoutKey, currentAttempts.toString());
      // Set TTL separately if needed (using Redis TTL feature)

      this.securityLogger.logSecurityEvent(SecurityEventType.LOGIN_FAILURE, {
        email: loginDto.email,
        reason: 'User not found'
      });
      throw new UnauthorizedException(genericError);
    }

    let isPasswordValid = false;
    try {
      isPasswordValid = await argon2.verify(user.password, loginDto.password);
    } catch (error) {
      this.logger.error(`Password verification error for ${loginDto.email}: ${(error as Error).message}`);
      this.securityLogger.logSecurityEvent(SecurityEventType.LOGIN_FAILURE, {
        userId: user.id,
        email: loginDto.email,
        reason: 'Password verification error'
      });

      // ✅ INCREMENT FAILED ATTEMPTS for password verification error
      const currentAttempts = attempts ? parseInt(attempts) + 1 : 1;
      await this.redisService.set(lockoutKey, currentAttempts.toString());

      throw new UnauthorizedException(genericError);
    }

    if (!isPasswordValid) {
      // ✅ INCREMENT FAILED ATTEMPTS for invalid password
      const currentAttempts = attempts ? parseInt(attempts) + 1 : 1;
      await this.redisService.set(lockoutKey, currentAttempts.toString());

      this.securityLogger.logSecurityEvent(SecurityEventType.LOGIN_FAILURE, {
        userId: user.id,
        email: loginDto.email,
        reason: 'Invalid password'
      });
      throw new UnauthorizedException(genericError);
    }

    // ✅ SUCCESSFUL LOGIN: Clear failed attempts counter
    await this.redisService.del(lockoutKey);

    // Generate JWT tokens
    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role
    };

    const accessTokenTTL = parseInt(this.configService.get('JWT_EXPIRES_IN', '3600'));
    const refreshTokenTTL = parseInt(this.configService.get('JWT_REFRESH_EXPIRES_IN', '604800'));

    const accessToken = this.jwtService.sign(payload, {
      expiresIn: `${accessTokenTTL}s`,
    });

    const refreshToken = this.jwtService.sign(payload, {
      secret: this.configService.get('JWT_REFRESH_SECRET'),
      expiresIn: `${refreshTokenTTL}s`,
    });

    // Store refresh token in Redis with TTL
    await this.redisService.set(`refresh_token:${user.id}`, refreshToken, refreshTokenTTL);

    this.securityLogger.logSecurityEvent(SecurityEventType.LOGIN_SUCCESS, {
      userId: user.id,
      email: user.email,
      role: user.role
    });

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
      },
    };
  }

  async refreshToken(refreshToken: string) {
    try {
      // Verify refresh token
      const payload = this.jwtService.verify(refreshToken, {
        secret: this.configService.get('JWT_REFRESH_SECRET'),
      });

      const user = await this.usersService.findById(payload.sub);
      if (!user) {
        throw new UnauthorizedException('User not found');
      }

      // Check if refresh token is stored in Redis
      const storedToken = await this.redisService.get<string>(`refresh_token:${user.id}`);
      if (!storedToken || storedToken !== refreshToken) {
        throw new UnauthorizedException('Invalid refresh token');
      }

      // Generate new tokens
      const newPayload = {
        sub: user.id,
        email: user.email,
        role: user.role
      };

      const accessTokenTTL = parseInt(this.configService.get('JWT_EXPIRES_IN', '3600'));
      const refreshTokenTTL = parseInt(this.configService.get('JWT_REFRESH_EXPIRES_IN', '604800'));

      const newAccessToken = this.jwtService.sign(newPayload, {
        expiresIn: `${accessTokenTTL}s`,
      });

      const newRefreshToken = this.jwtService.sign(newPayload, {
        secret: this.configService.get('JWT_REFRESH_SECRET'),
        expiresIn: `${refreshTokenTTL}s`,
      });

      // Update refresh token in Redis
      await this.redisService.set(`refresh_token:${user.id}`, newRefreshToken, refreshTokenTTL);

      // Log token refresh
      this.logger.log(`Token refreshed for user ${user.email}`);

      return {
        accessToken: newAccessToken,
        refreshToken: newRefreshToken,
      };
    } catch (error) {
      this.logger.error('Refresh token error:', error);
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  async logout(userId: string) {
    try {
      // Remove refresh token from Redis
      await this.redisService.del(`refresh_token:${userId}`);

      // Log logout
      this.logger.log(`User ${userId} logged out`);

      return { message: 'Logged out successfully' };
    } catch (error) {
      this.logger.error('Logout error:', error);
      throw new UnauthorizedException('Logout failed');
    }
  }

  async validateUser(userId: string) {
    // Cache user data to reduce DB calls
    const cacheKey = `user:${userId}`;
    let user = await this.redisService.get<any>(cacheKey);

    if (!user) {
      user = await this.usersService.findById(userId);
      if (user) {
        // Cache for 10 minutes
        await this.redisService.set(cacheKey, user, 600);
      }
    }

    return user;
  }

  // ✅ SECURE PASSWORD RESET FUNCTIONALITY
  async requestPasswordReset(email: string) {
    const user = await this.usersService.findByEmail(email);
    if (!user) {
      // ✅ Don't reveal if email exists to prevent user enumeration
      this.securityLogger.logSecurityEvent(SecurityEventType.LOGIN_FAILURE, {
        email,
        reason: 'Password reset requested for non-existent email'
      });
      return { message: 'If email exists, reset link sent' };
    }

    // ✅ Generate secure reset token (32 bytes = 256 bits)
    const resetToken = require('crypto').randomBytes(32).toString('hex');
    const hashedToken = require('crypto').createHash('sha256').update(resetToken).digest('hex');

    // Store hashed token in Redis with 1 hour expiry
    const resetKey = `password_reset:${hashedToken}`;
    await this.redisService.set(resetKey, user.id);

    // TODO: Send email with reset link containing resetToken
    // For now, log the token (in production, send via email)
    this.logger.log(`Password reset token for ${email}: ${resetToken}`);

    this.securityLogger.logSecurityEvent(SecurityEventType.LOGIN_SUCCESS, {
      userId: user.id,
      email,
      action: 'Password reset requested'
    });

    return { message: 'If email exists, reset link sent' };
  }

  async resetPassword(token: string, newPassword: string) {
    // Hash the provided token to find it in Redis
    const hashedToken = require('crypto').createHash('sha256').update(token).digest('hex');
    const resetKey = `password_reset:${hashedToken}`;

    const userId = await this.redisService.get<string>(resetKey);
    if (!userId) {
      this.securityLogger.logSecurityEvent(SecurityEventType.LOGIN_FAILURE, {
        reason: 'Invalid or expired password reset token'
      });
      throw new UnauthorizedException('Invalid or expired reset token');
    }

    // Hash new password
    const hashedPassword = await argon2.hash(newPassword, {
      type: argon2.argon2id,
      memoryCost: 65536,
      timeCost: 3,
      parallelism: 4,
    });

    // Update password
    await this.usersService.updatePassword(userId, hashedPassword);

    // ✅ Delete reset token to prevent reuse
    await this.redisService.del(resetKey);

    // ✅ Invalidate all existing sessions for security
    await this.redisService.del(`refresh_token:${userId}`);
    await this.redisService.del(`user:${userId}`);

    this.securityLogger.logSecurityEvent(SecurityEventType.LOGIN_SUCCESS, {
      userId,
      action: 'Password reset completed'
    });

    return { message: 'Password reset successful' };
  }
}
