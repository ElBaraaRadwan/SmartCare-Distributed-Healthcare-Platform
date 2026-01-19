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
} from '@nestjs/common';
import type { Express } from 'express';
import { FileInterceptor } from '@nestjs/platform-express';
import { PrescriptionsService } from './prescriptions.service';
import { AuthenticatedGuard, CurrentUser } from '@smartcare/common';
import type { IAuthenticatedUser } from '@smartcare/common';
import { CreatePrescriptionDto } from './dto/create-prescription.dto';
import { CreatePrescriptionOcrDto } from './dto/create-prescription-ocr.dto';

@Controller('prescriptions')
@UseGuards(AuthenticatedGuard)
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
  @UseInterceptors(FileInterceptor('image'))
  async createFromOcr(
    @Body() createDto: CreatePrescriptionOcrDto,
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() user: IAuthenticatedUser,
  ) {
    if (!file) {
      throw new Error('Image file is required');
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
