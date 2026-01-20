import { Injectable, UnauthorizedException, ConflictException, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as argon2 from 'argon2';
import { UsersService } from '../users/users.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { SecurityLoggerService, SecurityEventType } from '@smartcare/common';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
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
      this.logger.error(`Password verification error for ${loginDto.email}: ${error.message}`);
      this.securityLogger.logSecurityEvent(SecurityEventType.LOGIN_FAILURE, {
        userId: user.id,
        email: loginDto.email,
        reason: 'Password verification error'
      });
      throw new UnauthorizedException(genericError);
    }

    if (!isPasswordValid) {
      this.securityLogger.logSecurityEvent(SecurityEventType.LOGIN_FAILURE, {
        userId: user.id,
        email: loginDto.email,
        reason: 'Invalid password'
      });
      throw new UnauthorizedException(genericError);
    }

    // Generate JWT token
    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role
    };
    const accessToken = this.jwtService.sign(payload);

    this.securityLogger.logSecurityEvent(SecurityEventType.LOGIN_SUCCESS, {
      userId: user.id,
      email: user.email,
      role: user.role
    });

    return {
      accessToken,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
      },
    };
  }

  async validateUser(userId: string) {
    return this.usersService.findById(userId);
  }
}
