import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EventEmitterService } from '../events/event-emitter.service';
import { CreateAppointmentDto } from './dto/create-appointment.dto';
import { UpdateAppointmentDto } from './dto/update-appointment.dto';

interface CompleteAppointmentDto {
  notes: string;
  duration?: number;
  videoUrl?: string;
}

interface AppointmentFilters {
  patientId?: string;
  doctorId?: string;
  status?: string;
}

@Injectable()
export class AppointmentsService {
  constructor(
    private prisma: PrismaService,
    private eventEmitter: EventEmitterService,
  ) {}

  async create(dto: CreateAppointmentDto, user: any) {
    // Add user parameter
    // Validate scheduledAt is in the future
    const scheduledDate = new Date(dto.scheduledAt);
    if (scheduledDate <= new Date()) {
      throw new BadRequestException(
        'Appointment must be scheduled in the future',
      );
    }

    const appointment = await this.prisma.appointment.create({
      data: {
        patientId: dto.patientId,
        doctorId: dto.doctorId,
        scheduledAt: scheduledDate,
        status: 'PENDING',
        notes: dto.notes,
      },
    });

    // Emit event
    await this.eventEmitter.emit('APPOINTMENT_BOOKED', {
      appointmentId: appointment.id,
      patientId: appointment.patientId,
      doctorId: appointment.doctorId,
      scheduledAt: appointment.scheduledAt,
    });

    return appointment;
  }

  async findAll(filters: AppointmentFilters) {
    return this.prisma.appointment.findMany({
      where: {
        ...(filters.patientId && { patientId: filters.patientId }),
        ...(filters.doctorId && { doctorId: filters.doctorId }),
        ...(filters.status && { status: filters.status as any }), // Cast to bypass strict typing
      },
      include: {
        consultation: true,
      },
      orderBy: {
        scheduledAt: 'desc',
      },
    });
  }

  async findOne(id: string) {
    const appointment = await this.prisma.appointment.findUnique({
      where: { id },
      include: {
        consultation: true,
      },
    });

    if (!appointment) {
      throw new NotFoundException(`Appointment ${id} not found`);
    }

    return appointment;
  }

  async update(id: string, dto: UpdateAppointmentDto) {
    await this.findOne(id); // Ensure exists

    return this.prisma.appointment.update({
      where: { id },
      data: {
        ...(dto.scheduledAt ? { scheduledAt: new Date(dto.scheduledAt) } : {}),
        ...(dto.status ? { status: dto.status } : {}),
        ...(dto.notes !== undefined ? { notes: dto.notes } : {}),
      },
    });
  }

  async complete(id: string, dto: CompleteAppointmentDto, user: any) {
    // Add user parameter
    const appointment = await this.findOne(id);

    if (appointment.status === 'COMPLETED') {
      throw new BadRequestException('Appointment already completed');
    }

    const updated = await this.prisma.appointment.update({
      where: { id },
      data: {
        status: 'COMPLETED',
        consultation: {
          create: {
            notes: dto.notes,
            duration: dto.duration,
            videoUrl: dto.videoUrl,
          },
        },
      },
      include: {
        consultation: true,
      },
    });

    return updated;
  }

  async cancel(id: string) {
    await this.findOne(id); // Ensure exists

    return this.prisma.appointment.update({
      where: { id },
      data: { status: 'CANCELLED' },
    });
  }
}
