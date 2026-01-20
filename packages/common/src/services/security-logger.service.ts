import { Injectable, Logger } from '@nestjs/common';

export enum SecurityEventType {
  LOGIN_SUCCESS = 'LOGIN_SUCCESS',
  LOGIN_FAILURE = 'LOGIN_FAILURE',
  REGISTRATION = 'REGISTRATION',
  UNAUTHORIZED_ACCESS = 'UNAUTHORIZED_ACCESS',
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
  INVALID_TOKEN = 'INVALID_TOKEN',
}

@Injectable()
export class SecurityLoggerService {
  private readonly logger = new Logger('SecurityAudit');

  logSecurityEvent(
    eventType: SecurityEventType,
    details: {
      userId?: string;
      email?: string;
      ipAddress?: string;
      userAgent?: string;
      resource?: string;
      [key: string]: any;
    }
  ): void {
    const logEntry = {
      timestamp: new Date().toISOString(),
      event: eventType,
      ...details,
    };

    this.logger.warn(JSON.stringify(logEntry));

    // In production, send to monitoring service (e.g., Datadog, CloudWatch)
    // this.sendToMonitoring(logEntry);
  }

  logSuspiciousActivity(
    description: string,
    details: Record<string, any>
  ): void {
    this.logger.error(`🚨 SUSPICIOUS ACTIVITY: ${description}`, details);
  }
}