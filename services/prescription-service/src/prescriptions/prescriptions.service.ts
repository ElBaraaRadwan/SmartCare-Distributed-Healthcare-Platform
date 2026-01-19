import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EventEmitterService } from '../events/event-emitter.service';
import { OcrService } from '../ocr/ocr.service';
import { CreatePrescriptionDto } from './dto/create-prescription.dto';
import { CreatePrescriptionOcrDto } from './dto/create-prescription-ocr.dto';

@Injectable()
export class PrescriptionsService {
  constructor(
    private prisma: PrismaService,
    private eventEmitter: EventEmitterService,
    private ocrService: OcrService,
  ) {}

  async create(dto: CreatePrescriptionDto, user: any) {
    if (!dto.medications || dto.medications.length === 0) {
      throw new BadRequestException('At least one medication is required');
    }

    const prescription = await this.prisma.prescription.create({
      data: {
        doctorId: user.userId,
        patientId: dto.patientId,
        consultationId: dto.consultationId,
        status: 'ISSUED',
        medications: {
          create: dto.medications.map((med) => ({
            name: med.name,
            dosage: med.dosage,
            quantity: med.quantity,
            instructions: med.instructions,
          })),
        },
      },
      include: {
        medications: true,
      },
    });

    // Emit PRESCRIPTION_CREATED event
    await this.eventEmitter.emit('PRESCRIPTION_CREATED', {
      prescriptionId: prescription.id,
      doctorId: prescription.doctorId,
      patientId: prescription.patientId,
      medications: prescription.medications.map((m) => ({
        name: m.name,
        dosage: m.dosage,
        quantity: m.quantity,
      })),
    });

    return prescription;
  }

  async createFromOcr(
    dto: CreatePrescriptionOcrDto,
    imageBuffer: Buffer,
    filename: string,
    user: any,
  ) {
    // Process image with OCR
    const ocrResult = await this.ocrService.processImage(imageBuffer, filename);

    if (ocrResult.suggested_medications.length === 0) {
      throw new BadRequestException('No medications detected in the image');
    }

    // Create prescription with OCR data
    const prescription = await this.prisma.prescription.create({
      data: {
        doctorId: user.userId,
        patientId: dto.patientId,
        consultationId: dto.consultationId,
        ocrText: ocrResult.text,
        status: 'ISSUED',
        medications: {
          create: ocrResult.suggested_medications.map((med) => ({
            name: med.name,
            dosage: med.dosage,
            quantity: med.quantity,
            instructions: `Confidence: ${ocrResult.confidence}`,
          })),
        },
      },
      include: {
        medications: true,
      },
    });

    // Emit event
    await this.eventEmitter.emit('PRESCRIPTION_CREATED', {
      prescriptionId: prescription.id,
      doctorId: prescription.doctorId,
      patientId: prescription.patientId,
      medications: prescription.medications.map((m) => ({
        name: m.name,
        dosage: m.dosage,
        quantity: m.quantity,
      })),
    });

    return {
      prescription,
      ocrResult: {
        text: ocrResult.text,
        confidence: ocrResult.confidence,
      },
    };
  }

  async findAll(filters: any) {
    return this.prisma.prescription.findMany({
      where: {
        ...(filters.patientId && { patientId: filters.patientId }),
        ...(filters.doctorId && { doctorId: filters.doctorId }),
        ...(filters.status && { status: filters.status as any }),
      },
      include: {
        medications: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async findOne(id: string) {
    const prescription = await this.prisma.prescription.findUnique({
      where: { id },
      include: {
        medications: true,
      },
    });

    if (!prescription) {
      throw new NotFoundException(`Prescription ${id} not found`);
    }

    return prescription;
  }

  async cancel(id: string, user: any) {
    const prescription = await this.findOne(id);

    if (prescription.doctorId !== user.userId) {
      throw new BadRequestException(
        'Only the prescribing doctor can cancel this prescription',
      );
    }

    return this.prisma.prescription.update({
      where: { id },
      data: { status: 'CANCELLED' },
      include: {
        medications: true,
      },
    });
  }
}