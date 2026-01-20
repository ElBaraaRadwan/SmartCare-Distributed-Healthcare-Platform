import { createParamDecorator, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { IAuthenticatedUser, UserRole } from '../interfaces/user.interface';

export const CurrentUser = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): IAuthenticatedUser => {
    const request = ctx.switchToHttp().getRequest();

    // User info injected by API Gateway
    const userId = request.headers['x-user-id'];
    const email = request.headers['x-user-email'];
    const role = request.headers['x-user-role'];

    if (!userId || !email || !role) {
      throw new UnauthorizedException('User context not found in request headers. Ensure request passed through API Gateway.');
    }

    return {
      userId: userId as string,
      email: email as string,
      role: role as UserRole,
    };
  },
);
