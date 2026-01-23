import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { AppointmentsService } from './appointments.service';
import { AuthenticatedGuard, CurrentUser } from '@smartcare/common';
import type { IAuthenticatedUser } from '@smartcare/common';
import { CreateAppointmentDto } from './dto/create-appointment.dto';
import { UpdateAppointmentDto } from './dto/update-appointment.dto';
import { CompleteAppointmentDto } from './dto/complete.appointment.dto';
import { AuditLoggingInterceptor } from '../common/prisma-audit-logger.service';

@Controller('appointments')
@UseGuards(AuthenticatedGuard)
@UseInterceptors(AuditLoggingInterceptor)
export class AppointmentsController {
  constructor(private readonly appointmentsService: AppointmentsService) {}

  @Post()
  async create(
    @Body() createDto: CreateAppointmentDto,
    @CurrentUser() user: IAuthenticatedUser,
  ) {
    return this.appointmentsService.create(createDto, user);
  }

  @Get()
  async findAll(
    @Query('patientId') patientId?: string,
    @Query('doctorId') doctorId?: string,
    @Query('status') status?: string,
  ) {
    return this.appointmentsService.findAll({
      patientId,
      doctorId,
      status,
    });
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.appointmentsService.findOne(id);
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() updateDto: UpdateAppointmentDto,
  ) {
    return this.appointmentsService.update(id, updateDto);
  }

  @Patch(':id/complete')
  async complete(
    @Param('id') id: string,
    @Body() completeDto: CompleteAppointmentDto,
    @CurrentUser() user: IAuthenticatedUser,
  ) {
    return this.appointmentsService.complete(id, completeDto, user);
  }

  @Delete(':id')
  async cancel(@Param('id') id: string) {
    return this.appointmentsService.cancel(id);
  }
}
