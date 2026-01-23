import {
  Controller,
  Post,
  Get,
  Delete,
  Param,
  Body,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  Res,
  Query,
} from '@nestjs/common';
import { FilesService } from './files.service';
import { AuthenticatedGuard, CurrentUser } from '@smartcare/common';
import type { IAuthenticatedUser } from '@smartcare/common';
import { AuditLoggingInterceptor } from '../common/prisma-audit-logger.service';
import type { Response } from 'express';

@Controller('files')
@UseGuards(AuthenticatedGuard)
@UseInterceptors(AuditLoggingInterceptor)
export class FilesController {
  constructor(private readonly filesService: FilesService) {}

  @Post('upload')
  async uploadFile(
    @UploadedFile() file: Express.Multer.File,
    @Body() body: { patientId?: string; appointmentId?: string; consultationId?: string; category?: string },
    @CurrentUser() user: IAuthenticatedUser,
  ) {
    const category = body.category as any || 'MEDICAL_DOCUMENT';

    return this.filesService.uploadFile(
      file,
      user.userId,
      user.role,
      body.patientId,
      body.appointmentId,
      body.consultationId,
      category,
    );
  }

  @Get(':id')
  async getFile(
    @Param('id') id: string,
    @CurrentUser() user: IAuthenticatedUser,
    @Res() res: Response,
  ) {
    const { file, stream } = await this.filesService.getFile(id, user.userId, user.role);

    res.setHeader('Content-Type', file.mimeType);
    res.setHeader('Content-Disposition', `attachment; filename="${file.originalName}"`);
    res.setHeader('Content-Length', file.size.toString());

    stream.pipe(res);
  }

  @Get('appointment/:appointmentId')
  async getFilesByAppointment(
    @Param('appointmentId') appointmentId: string,
    @CurrentUser() user: IAuthenticatedUser,
  ) {
    return this.filesService.getFilesByAppointment(appointmentId, user.userId, user.role);
  }

  @Delete(':id')
  async deleteFile(
    @Param('id') id: string,
    @CurrentUser() user: IAuthenticatedUser,
  ) {
    return this.filesService.deleteFile(id, user.userId, user.role);
  }
}