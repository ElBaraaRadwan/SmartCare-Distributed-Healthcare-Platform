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
import { IsString } from 'class-validator';
import { AuthService } from './auth.service';
import { RegisterDto, Role } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';

// DTO for refresh token
class RefreshTokenDto {
  @IsString()
  refreshToken: string;
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
  @Throttle({ default: { limit: 5, ttl: 60000 } }) // 5 registrations per minute
  async register(@Body() registerDto: RegisterDto) {
    return this.authService.register(registerDto);
  }

  @Post('login')
  @Throttle({ default: { limit: 5, ttl: 60000 } }) // 5 login attempts per minute
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
}
