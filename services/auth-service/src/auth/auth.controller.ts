import {
  Controller,
  Post,
  Body,
  Get,
  UseGuards,
  Request,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Throttle } from '@nestjs/throttler';
import { IsString, IsNotEmpty, MinLength } from 'class-validator';
import { AuthService } from './auth.service';
import { RegisterDto, Role } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';

// DTO for refresh token
class RefreshTokenDto {
  @IsString()
  refreshToken: string;
}

// DTO for password reset request
class RequestPasswordResetDto {
  @IsString()
  @IsNotEmpty()
  email: string;
}

// DTO for password reset
class ResetPasswordDto {
  @IsString()
  @IsNotEmpty()
  token: string;

  @IsString()
  @MinLength(8)
  newPassword: string;
}

// A type for the user object attached to the request by the JWT strategy
interface UserPayload {
  id: string;
  email: string;
  role: Role;
}

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('register')
  @Throttle({ auth: { limit: 3, ttl: 60000 } }) // ✅ 3 registrations per minute
  async register(@Body() registerDto: RegisterDto) {
    return this.authService.register(registerDto);
  }

  @Post('login')
  @Throttle({ auth: { limit: 3, ttl: 60000 } }) // ✅ 3 login attempts per minute (stricter)
  async login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }

  @Post('refresh')
  async refresh(@Body() refreshDto: RefreshTokenDto) {
    return this.authService.refreshToken(refreshDto.refreshToken);
  }

  @Post('logout')
  @UseGuards(AuthGuard('jwt'))
  async logout(@Request() req: { user: UserPayload }) {
    return this.authService.logout(req.user.id);
  }

  @Get('me')
  @UseGuards(AuthGuard('jwt'))
  getProfile(@Request() req: { user: UserPayload }) {
    return req.user;
  }

  @Post('request-password-reset')
  @Throttle({ default: { limit: 3, ttl: 60000 } }) // 3 requests per minute
  async requestPasswordReset(@Body() dto: RequestPasswordResetDto) {
    return this.authService.requestPasswordReset(dto.email);
  }

  @Post('reset-password')
  async resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto.token, dto.newPassword);
  }
}
