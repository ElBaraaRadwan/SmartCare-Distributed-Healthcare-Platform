import { Injectable, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { AxiosError, AxiosRequestHeaders, Method } from 'axios';

@Injectable()
export class ProxyService {
  private readonly logger = new Logger(ProxyService.name);

  constructor(
    private httpService: HttpService,
    private configService: ConfigService,
  ) {}

  async proxyRequest(
    serviceName: string,
    path: string,
    method: Method,
    body?: Buffer | Record<string, any>,
    headers?: Record<string, string>,
  ): Promise<unknown> {
    const serviceUrl = this.getServiceUrl(serviceName);
    const url = `${serviceUrl}${path}`;

    this.logger.log(`Proxying request to ${serviceName} service:`);
    this.logger.log(`  URL: ${url}`);
    this.logger.log(`  Method: ${method}`);
    this.logger.log(`  Body (type: ${typeof body}, length: ${body instanceof Buffer ? body.length : 'N/A'}): ${body instanceof Buffer ? '[Buffer]' : JSON.stringify(body)}`);
    this.logger.log(`  Headers: ${JSON.stringify(headers)}`);

    try {
      const response = await firstValueFrom(
        this.httpService.request({
          url,
          method,
          data: body,
          headers: {
            ...(headers as AxiosRequestHeaders),
            // Let Axios automatically set Content-Type and Content-Length for JSON data
          },
        }),
      );

      this.logger.log(`Successfully proxied request to ${serviceName} service.`);
      return response.data as unknown;
    } catch (error) {
      this.handleProxyError(error as AxiosError);
    }
  }

  private getServiceUrl(serviceName: string): string {
    const getOrThrow = (key: string): string => {
      const value = this.configService.get<string>(key);
      if (!value) {
        throw new HttpException(
          `Missing configuration for ${key}`,
          HttpStatus.INTERNAL_SERVER_ERROR,
        );
      }
      return value;
    };

    const serviceMap: Record<string, string> = {
      auth: getOrThrow('AUTH_SERVICE_URL'),
      clinic: getOrThrow('CLINIC_SERVICE_URL'),
      prescription: getOrThrow('PRESCRIPTION_SERVICE_URL'),
      pharmacy: getOrThrow('PHARMACY_SERVICE_URL'),
      payments: getOrThrow('PAYMENTS_SERVICE_URL'),
      notification: getOrThrow('NOTIFICATION_SERVICE_URL'),
      ocr: getOrThrow('OCR_SERVICE_URL'),
    };

    const url = serviceMap[serviceName];
    if (!url) {
      throw new HttpException(
        `Service ${serviceName} not configured`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
    this.logger.debug(`Resolved ${serviceName}_SERVICE_URL: ${url}`);
    return url;
  }

  private handleProxyError(error: AxiosError) {
    if (error.response) {
      throw new HttpException(
        error.response.data || 'Service error',
        error.response.status,
      );
    } else if (error.request) {
      throw new HttpException(
        'Service unavailable',
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    } else {
      throw new HttpException(
        'Internal server error',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
