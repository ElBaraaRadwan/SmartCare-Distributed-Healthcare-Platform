import { Injectable, NestInterceptor, ExecutionContext, CallHandler, Logger } from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

export interface AuditLogger {
  log(entry: AuditEntry): Promise<void>;
}

export interface AuditEntry {
  userId?: string;
  userEmail?: string;
  userRole?: string;
  action: string;
  resource: string;
  ipAddress?: string;
  userAgent?: string;
  requestBody?: any;
  responseStatus?: number;
  timestamp: Date;
}

@Injectable()
export class AuditLoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger(AuditLoggingInterceptor.name);

  constructor(private auditLogger?: AuditLogger) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const { method, url, headers, body } = request;
    const userId = headers['x-user-id'];
    const userEmail = headers['x-user-email'];
    const userRole = headers['x-user-role'];

    // ✅ Identify PHI access
    const isPHIAccess = this.isPHIEndpoint(url);

    if (isPHIAccess) {
      return next.handle().pipe(
        tap(async (response) => {
          const auditEntry: AuditEntry = {
            userId,
            userEmail,
            userRole,
            action: method,
            resource: url,
            ipAddress: request.ip,
            userAgent: headers['user-agent'],
            requestBody: this.sanitize(body),
            responseStatus: context.switchToHttp().getResponse().statusCode,
            timestamp: new Date(),
          };

          if (this.auditLogger) {
            try {
              await this.auditLogger.log(auditEntry);
            } catch (error) {
              this.logger.error('Failed to log audit entry:', error);
            }
          } else {
            // Fallback to console logging if no audit logger provided
            this.logger.log(`PHI Access: ${JSON.stringify(auditEntry)}`);
          }
        }),
      );
    }

    return next.handle();
  }

  private isPHIEndpoint(url: string): boolean {
    const phiPatterns = [
      '/prescriptions',
      '/appointments',
      '/consultations',
      '/patients',
      '/medical-records',
    ];
    return phiPatterns.some(pattern => url.includes(pattern));
  }

  private sanitize(data: any): any {
    // Remove sensitive data before logging
    const { password, token, ...safe } = data || {};
    return safe;
  }
}