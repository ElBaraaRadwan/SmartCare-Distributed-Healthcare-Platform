import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
  Inject,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { PrismaService } from '../prisma/prisma.service';

// Define interfaces locally since they're not exported from common yet
interface AuditEntry {
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

interface AuditLogger {
  log(entry: AuditEntry): Promise<void>;
}

@Injectable()
export class PrismaAuditLogger implements AuditLogger {
  private readonly logger = new Logger(PrismaAuditLogger.name);

  constructor(private prisma: PrismaService) {}

  async log(entry: AuditEntry): Promise<void> {
    try {
      // Use raw query since Prisma client may not be regenerated yet
      await this.prisma.$executeRaw`
        INSERT INTO audit_logs (
          id, user_id, user_email, user_role, action, resource,
          ip_address, user_agent, request_body, response_status, timestamp
        ) VALUES (
          ${crypto.randomUUID()}::uuid,
          ${entry.userId}::uuid,
          ${entry.userEmail},
          ${entry.userRole},
          ${entry.action},
          ${entry.resource},
          ${entry.ipAddress},
          ${entry.userAgent},
          ${JSON.stringify(entry.requestBody)}::jsonb,
          ${entry.responseStatus},
          ${entry.timestamp}
        )
      `;

      this.logger.debug(
        `PHI access logged: ${entry.action} ${entry.resource} by ${entry.userEmail || 'unknown'}`,
      );
    } catch (error) {
      this.logger.error('Failed to save audit log:', error);
      // Don't throw - audit logging should not break the main flow
    }
  }
}

@Injectable()
export class AuditLoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger(AuditLoggingInterceptor.name);

  constructor(@Inject('AuditLogger') private auditLogger: AuditLogger) {}

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
      '/appointments',
      '/consultations',
      '/patients',
      '/medical-records',
    ];
    return phiPatterns.some((pattern) => url.includes(pattern));
  }

  private sanitize(data: any): any {
    // Remove sensitive data before logging
    const { password, token, ...safe } = data || {};
    return safe;
  }
}
