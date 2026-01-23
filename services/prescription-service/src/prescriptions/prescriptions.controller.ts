import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import type { Express } from 'express';
import { FileInterceptor } from '@nestjs/platform-express';
import { PrescriptionsService } from './prescriptions.service';
import { AuthenticatedGuard, CurrentUser } from '@smartcare/common';
import { AuditLoggingInterceptor } from '../common/prisma-audit-logger.service';
import type { IAuthenticatedUser } from '@smartcare/common';
import { CreatePrescriptionDto } from './dto/create-prescription.dto';
import { CreatePrescriptionOcrDto } from './dto/create-prescription-ocr.dto';
import * as path from 'path';

@Controller('prescriptions')
@UseGuards(AuthenticatedGuard)
@UseInterceptors(AuditLoggingInterceptor)
export class PrescriptionsController {
  constructor(private readonly prescriptionsService: PrescriptionsService) {}

  @Post()
  async create(
    @Body() createDto: CreatePrescriptionDto,
    @CurrentUser() user: IAuthenticatedUser,
  ) {
    return this.prescriptionsService.create(createDto, user);
  }

  @Post('ocr')
  @UseInterceptors(
    FileInterceptor('image', {
      limits: {
        fileSize: 10 * 1024 * 1024, // 10MB limit
        files: 1,
      },
      fileFilter: (req, file, cb) => {
        // ✅ File type validation
        const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf'];
        if (!allowedMimeTypes.includes(file.mimetype)) {
          return cb(
            new BadRequestException('Invalid file type. Only JPEG, PNG, and PDF allowed'),
            false,
          );
        }

        // ✅ File extension validation
        const allowedExtensions = ['.jpg', '.jpeg', '.png', '.pdf'];
        const ext = path.extname(file.originalname).toLowerCase();
        if (!allowedExtensions.includes(ext)) {
          return cb(
            new BadRequestException('Invalid file extension'),
            false,
          );
        }

        cb(null, true);
      },
    }),
  )
  async createFromOcr(
    @Body() createDto: CreatePrescriptionOcrDto,
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() user: IAuthenticatedUser,
  ) {
    if (!file) {
      throw new BadRequestException('Image file is required');
    }

    // ✅ Additional size validation (double-check)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      throw new BadRequestException('File size exceeds 10MB limit');
    }

    return this.prescriptionsService.createFromOcr(
      createDto,
      file.buffer,
      file.originalname,
      user,
    );
  }

  @Get()
  async findAll(
    @Query('patientId') patientId?: string,
    @Query('doctorId') doctorId?: string,
    @Query('status') status?: string,
  ) {
    return this.prescriptionsService.findAll({
      patientId,
      doctorId,
      status,
    });
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.prescriptionsService.findOne(id);
  }

  @Delete(':id')
  async cancel(
    @Param('id') id: string,
    @CurrentUser() user: IAuthenticatedUser,
  ) {
    return this.prescriptionsService.cancel(id, user);
  }
}
