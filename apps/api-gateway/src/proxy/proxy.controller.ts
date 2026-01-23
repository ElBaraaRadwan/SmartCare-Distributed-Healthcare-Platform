import {
  Controller,
  All,
  Req,
  Res,
  UseGuards,
  HttpStatus,
  Post,
} from '@nestjs/common';
import type { Response } from 'express';
import { ProxyService } from './proxy.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import type { Method } from 'axios';
import type { IncomingHttpHeaders } from 'http';
import type { AuthenticatedRequest } from '../common/interfaces/authenticated-request.interface';
import { ServiceType } from '../common/enums';

// Utility to sanitize headers
function sanitizeHeaders(headers: IncomingHttpHeaders): Record<string, string> {
  const sanitized: Record<string, string> = {};
  for (const [key, value] of Object.entries(headers)) {
    if (typeof value === 'string') {
      sanitized[key] = value;
    } else if (Array.isArray(value)) {
      sanitized[key] = value.join(',');
    }
    // skip undefined
  }
  return sanitized;
}

// Utility to safely extract path param as string
function getPathParam(param: string | string[] | undefined): string {
  if (typeof param === 'string') {
    return `/${param}`;
  } else if (Array.isArray(param)) {
    return `/${param.join('/')}`;
  }
  return '';
}

@Controller()
export class ProxyController {
  constructor(private proxyService: ProxyService) {}

  // Auth routes (public)
  @All('auth/*path')
  async proxyAuth(@Req() req: AuthenticatedRequest, @Res() res: Response) {
    const path = `/auth${getPathParam(req.params['path'])}`;
    const result = await this.proxyService.proxyRequest(
      ServiceType.AUTH,
      path,
      req.method as Method,
      req.rawBody,
      sanitizeHeaders(req.headers),
    );
    res.status(HttpStatus.OK).json(result);
  }

  // Clinic routes (protected) - specific routes before wildcards
  @Post('appointments')
  @UseGuards(JwtAuthGuard)
  async proxyAppointmentsList(
    @Req() req: AuthenticatedRequest,
    @Res() res: Response,
  ) {
    const path = req.path;
    const user = req.user;
    const result = await this.proxyService.proxyRequest(
      ServiceType.CLINIC,
      path,
      req.method as Method,
      req.body as Record<string, any>,
      sanitizeHeaders(req.headers),
      user,
    );
    res.status(HttpStatus.OK).json(result);
  }

  @All('appointments/*path')
  @UseGuards(JwtAuthGuard)
  async proxyAppointments(
    @Req() req: AuthenticatedRequest,
    @Res() res: Response,
  ) {
    const path = getPathParam(req.params['path']);
    const user = req.user;
    const result = await this.proxyService.proxyRequest(
      ServiceType.CLINIC,
      path,
      req.method as Method,
      req.body as Record<string, any>,
      sanitizeHeaders(req.headers),
      user,
    );
    res.status(HttpStatus.OK).json(result);
  }

  // Prescription routes (protected) - specific routes before wildcards
  @All('prescriptions')
  @UseGuards(JwtAuthGuard)
  async proxyPrescriptionsList(
    @Req() req: AuthenticatedRequest,
    @Res() res: Response,
  ) {
    const path = req.path;
    const user = req.user;
    const result = await this.proxyService.proxyRequest(
      ServiceType.PRESCRIPTION,
      path,
      req.method as Method,
      req.body as Record<string, any>,
      sanitizeHeaders(req.headers),
      user,
    );
    res.status(HttpStatus.OK).json(result);
  }

  @All('prescriptions/*path')
  @UseGuards(JwtAuthGuard)
  async proxyPrescriptions(
    @Req() req: AuthenticatedRequest,
    @Res() res: Response,
  ) {
    const path = getPathParam(req.params['path']);
    const user = req.user;
    const result = await this.proxyService.proxyRequest(
      ServiceType.PRESCRIPTION,
      path,
      req.method as Method,
      req.body as Record<string, any>,
      sanitizeHeaders(req.headers),
      user,
    );
    res.status(HttpStatus.OK).json(result);
  }

  // Pharmacy routes (protected) - specific routes before wildcards
  @All('pharmacy/orders')
  @UseGuards(JwtAuthGuard)
  async proxyPharmacyOrders(
    @Req() req: AuthenticatedRequest,
    @Res() res: Response,
  ) {
    const user = req.user;
    const result = await this.proxyService.proxyRequest(
      ServiceType.PHARMACY,
      '/orders',
      req.method as Method,
      req.body as Record<string, any>,
      sanitizeHeaders(req.headers),
      user,
    );
    res.status(HttpStatus.OK).json(result);
  }

  @All('pharmacy/*path')
  @UseGuards(JwtAuthGuard)
  async proxyPharmacy(@Req() req: AuthenticatedRequest, @Res() res: Response) {
    const path = getPathParam(req.params['path']);
    const user = req.user;
    const result = await this.proxyService.proxyRequest(
      ServiceType.PHARMACY,
      path,
      req.method as Method,
      req.body as Record<string, any>,
      sanitizeHeaders(req.headers),
      user,
    );
    res.status(HttpStatus.OK).json(result);
  }

  // Payments routes - webhook is public, others protected
  @Post('payments/webhook')
  async proxyPaymentsWebhook(
    @Req() req: AuthenticatedRequest,
    @Res() res: Response,
  ) {
    const result = await this.proxyService.proxyRequest(
      ServiceType.PAYMENTS,
      '/payments/webhook',
      req.method as Method,
      req.rawBody,
      sanitizeHeaders(req.headers),
    );
    res.status(HttpStatus.OK).json(result);
  }

  @All('payments/*path')
  @UseGuards(JwtAuthGuard)
  async proxyPayments(@Req() req: AuthenticatedRequest, @Res() res: Response) {
    const path = getPathParam(req.params['path']);
    const user = req.user;
    const result = await this.proxyService.proxyRequest(
      ServiceType.PAYMENTS,
      path,
      req.method as Method,
      req.body as Record<string, any>,
      sanitizeHeaders(req.headers),
      user,
    );
    res.status(HttpStatus.OK).json(result);
  }

  // OCR routes (protected) - specific routes before wildcards
  @All('ocr')
  @UseGuards(JwtAuthGuard)
  async proxyOcrList(@Req() req: AuthenticatedRequest, @Res() res: Response) {
    const path = req.path;
    const user = req.user;
    const result = await this.proxyService.proxyRequest(
      ServiceType.OCR,
      path,
      req.method as Method,
      req.body as Record<string, any>,
      sanitizeHeaders(req.headers),
      user,
    );
    res.status(HttpStatus.OK).json(result);
  }

  @All('ocr/*path')
  @UseGuards(JwtAuthGuard)
  async proxyOcr(@Req() req: AuthenticatedRequest, @Res() res: Response) {
    const path = getPathParam(req.params['path']);
    const user = req.user;
    const result = await this.proxyService.proxyRequest(
      ServiceType.OCR,
      path,
      req.method as Method,
      req.body as Record<string, any>,
      sanitizeHeaders(req.headers),
      user,
    );
    res.status(HttpStatus.OK).json(result);
  }

  // Health check (public)
  @All('health')
  health(@Res() res: Response) {
    res.status(HttpStatus.OK).json({
      status: 'ok',
      service: 'api-gateway',
      timestamp: new Date().toISOString(),
    });
  }
}
