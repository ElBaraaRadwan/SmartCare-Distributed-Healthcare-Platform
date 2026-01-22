import {
  Controller,
  All,
  Req,
  Res,
  UseGuards,
  HttpStatus,
  Post,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { ProxyService } from './proxy.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import type { Method } from 'axios';
import type { IncomingHttpHeaders } from 'http';

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
  async proxyAuth(@Req() req: Request, @Res() res: Response) {
    const path = `/auth${getPathParam(req.params['path'])}`;
    const result = await this.proxyService.proxyRequest(
      'auth',
      path,
      req.method as Method,
      (req as any).rawBody,
      sanitizeHeaders(req.headers),
    );
    res.status(HttpStatus.OK).json(result);
  }

  // Clinic routes (protected)
  @All('appointments/*path')
  @UseGuards(JwtAuthGuard)
  async proxyAppointments(@Req() req: Request, @Res() res: Response) {
    const path = getPathParam(req.params['path']);
    const user = (req as any).user;
    const result = await this.proxyService.proxyRequest(
      'clinic',
      path,
      req.method as Method,
      req.body,
      sanitizeHeaders(req.headers),
      user,
    );
    res.status(HttpStatus.OK).json(result);
  }

  @Post('appointments')
  @UseGuards(JwtAuthGuard)
  async proxyAppointmentsList(@Req() req: Request, @Res() res: Response) {
    const path = req.path;
    const user = (req as any).user;
    const result = await this.proxyService.proxyRequest(
      'clinic',
      path,
      req.method as Method,
      req.body,
      sanitizeHeaders(req.headers),
      user,
    );
    res.status(HttpStatus.OK).json(result);
  }

  // Prescription routes (protected)
  @All('prescriptions/*path')
  @UseGuards(JwtAuthGuard)
  async proxyPrescriptions(@Req() req: Request, @Res() res: Response) {
    const path = getPathParam(req.params['path']);
    const user = (req as any).user;
    const result = await this.proxyService.proxyRequest(
      'prescription',
      path,
      req.method as Method,
      req.body,
      sanitizeHeaders(req.headers),
      user,
    );
    res.status(HttpStatus.OK).json(result);
  }

  @All('prescriptions')
  @UseGuards(JwtAuthGuard)
  async proxyPrescriptionsList(@Req() req: Request, @Res() res: Response) {
    const path = req.path;
    const user = (req as any).user;
    const result = await this.proxyService.proxyRequest(
      'prescription',
      path,
      req.method as Method,
      req.body,
      sanitizeHeaders(req.headers),
      user,
    );
    res.status(HttpStatus.OK).json(result);
  }

  // Pharmacy routes (protected)
  @All('pharmacy/orders')
  @UseGuards(JwtAuthGuard)
  async proxyPharmacyOrders(@Req() req: Request, @Res() res: Response) {
    const user = (req as any).user;
    const result = await this.proxyService.proxyRequest(
      'pharmacy',
      '/orders',
      req.method as Method,
      req.body,
      sanitizeHeaders(req.headers),
      user,
    );
    res.status(HttpStatus.OK).json(result);
  }

  @All('pharmacy/*path')
  @UseGuards(JwtAuthGuard)
  async proxyPharmacy(@Req() req: Request, @Res() res: Response) {
    const path = getPathParam(req.params['path']);
    const user = (req as any).user;
    const result = await this.proxyService.proxyRequest(
      'pharmacy',
      path,
      req.method as Method,
      req.body,
      sanitizeHeaders(req.headers),
      user,
    );
    res.status(HttpStatus.OK).json(result);
  }

  // Payments routes (protected)
  @All('payments/*path')
  @UseGuards(JwtAuthGuard)
  async proxyPayments(@Req() req: Request, @Res() res: Response) {
    const path = getPathParam(req.params['path']);
    const user = (req as any).user;
    const result = await this.proxyService.proxyRequest(
      'payments',
      path,
      req.method as Method,
      req.body,
      sanitizeHeaders(req.headers),
      user,
    );
    res.status(HttpStatus.OK).json(result);
  }

  // OCR routes (protected)
  @All('ocr/*path')
  @UseGuards(JwtAuthGuard)
  async proxyOcr(@Req() req: Request, @Res() res: Response) {
    const path = getPathParam(req.params['path']);
    const user = (req as any).user;
    const result = await this.proxyService.proxyRequest(
      'ocr',
      path,
      req.method as Method,
      req.body,
      sanitizeHeaders(req.headers),
      user,
    );
    res.status(HttpStatus.OK).json(result);
  }

  @All('ocr')
  @UseGuards(JwtAuthGuard)
  async proxyOcrList(@Req() req: Request, @Res() res: Response) {
    const path = req.path;
    const user = (req as any).user;
    const result = await this.proxyService.proxyRequest(
      'ocr',
      path,
      req.method as Method,
      req.body,
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
