import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';

/**
 * Guard to verify that request has user context injected by API Gateway
 * Use this in microservices instead of JwtAuthGuard
 */
@Injectable()
export class AuthenticatedGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    
    // Check if user context was injected by gateway
    const userId = request.headers['x-user-id'];
    
    if (!userId) {
      throw new UnauthorizedException(
        'Authentication required. Request must pass through API Gateway.'
      );
    }

    return true;
  }
}
