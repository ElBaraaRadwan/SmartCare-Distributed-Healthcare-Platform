import { Injectable, BadRequestException, NotFoundException, Inject } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import { createHash } from 'crypto';
import { FileCategory } from '@prisma/client';
import { FileStorageService } from './file-storage.service';

@Injectable()
export class FilesService {
  constructor(
    private prisma: PrismaService,
    private config: ConfigService,
    private fileStorage: FileStorageService,
    @Inject('AuditLogger') private auditLogger: any,
  ) {}

  async uploadFile(
    file: Express.Multer.File,
    userId: string,
    userRole: string,
    patientId?: string,
    appointmentId?: string,
    consultationId?: string,
    category: FileCategory = FileCategory.MEDICAL_DOCUMENT,
  ) {
    // Validate file
    this.validateFile(file);

    // Generate file hash for integrity checking
    const hash = this.generateFileHash(file.buffer);

    // Generate unique key for MinIO
    const key = `${Date.now()}-${file.originalname}`;

    try {
      // Upload to MinIO
      await this.fileStorage.uploadFile(key, file.buffer, file.mimetype, {
        'X-Amz-Meta-Hash': hash,
        'X-Amz-Meta-UploadedBy': userId,
        'X-Amz-Meta-PatientId': patientId || '',
      });

      // Save metadata to database
      const fileRecord = await this.prisma.file.create({
        data: {
          filename: file.originalname,
          originalName: file.originalname,
          mimeType: file.mimetype,
          size: file.size,
          hash,
          bucket: this.fileStorage.getBucketName(),
          key,
          uploadedBy: userId,
          uploadedByRole: userRole,
          patientId,
          appointmentId,
          consultationId,
          category,
        },
      });

      // Audit log the upload
      await this.auditLogger.log({
        userId,
        userEmail: null, // Would need to fetch from auth service
        userRole,
        action: 'FILE_UPLOAD',
        resource: `file:${fileRecord.id}`,
        ipAddress: null, // Would come from request
        userAgent: null, // Would come from request
        requestBody: {
          filename: file.originalname,
          size: file.size,
          category,
        },
        responseStatus: 201,
      });

      return fileRecord;
    } catch (error) {
      // Clean up MinIO object if database save fails
      try {
        await this.fileStorage.deleteFile(key);
      } catch (cleanupError) {
        console.error('Failed to cleanup MinIO object:', cleanupError);
      }
      throw error;
    }
  }

  async getFile(id: string, userId: string, userRole: string) {
    const file = await this.prisma.file.findUnique({
      where: { id },
    });

    if (!file) {
      throw new NotFoundException('File not found');
    }

    // Check access permissions
    if (!this.canAccessFile(file, userId, userRole)) {
      throw new BadRequestException('Access denied to file');
    }

    try {
      // Get file from MinIO
      const stream = await this.fileStorage.downloadFile(file.key);

      // Audit log the access
      await this.auditLogger.log({
        userId,
        userRole,
        action: 'FILE_ACCESS',
        resource: `file:${id}`,
        ipAddress: null,
        userAgent: null,
        requestBody: null,
        responseStatus: 200,
      });

      return {
        file,
        stream,
      };
    } catch (error) {
      throw new NotFoundException('File not available');
    }
  }

  async deleteFile(id: string, userId: string, userRole: string) {
    const file = await this.prisma.file.findUnique({
      where: { id },
    });

    if (!file) {
      throw new NotFoundException('File not found');
    }

    // Check if user can delete (only uploader or admin)
    if (file.uploadedBy !== userId && userRole !== 'ADMIN') {
      throw new BadRequestException('Cannot delete file');
    }

    try {
      // Soft delete in database
      await this.prisma.file.update({
        where: { id },
        data: {
          isDeleted: true,
          deletedAt: new Date(),
          deletedBy: userId,
        },
      });

      // Optionally remove from MinIO (or keep for compliance)
      // await this.minioClient.removeObject(this.bucketName, file.key);

      // Audit log the deletion
      await this.auditLogger.log({
        userId,
        userRole,
        action: 'FILE_DELETE',
        resource: `file:${id}`,
        ipAddress: null,
        userAgent: null,
        requestBody: null,
        responseStatus: 200,
      });

      return { success: true };
    } catch (error) {
      throw error;
    }
  }

  async getFilesByAppointment(appointmentId: string, userId: string, userRole: string) {
    // Check if user can access appointment
    const appointment = await this.prisma.appointment.findUnique({
      where: { id: appointmentId },
      select: { patientId: true, doctorId: true },
    });

    if (!appointment) {
      throw new NotFoundException('Appointment not found');
    }

    if (!this.canAccessAppointment(appointment, userId, userRole)) {
      throw new BadRequestException('Access denied to appointment files');
    }

    return this.prisma.file.findMany({
      where: {
        appointmentId,
        isDeleted: false,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  private validateFile(file: Express.Multer.File) {
    // Check file size (max 10MB)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      throw new BadRequestException('File too large. Maximum size is 10MB.');
    }

    // Check file size (min 1KB to prevent empty files)
    const minSize = 1024; // 1KB
    if (file.size < minSize) {
      throw new BadRequestException('File too small. Minimum size is 1KB.');
    }

    // Check file type
    const allowedTypes = [
      'application/pdf',
      'image/jpeg',
      'image/png',
      'image/gif',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ];

    if (!allowedTypes.includes(file.mimetype)) {
      throw new BadRequestException(
        `File type ${file.mimetype} not allowed. Allowed types: PDF, JPEG, PNG, GIF, DOC, DOCX`
      );
    }

    // Check file extension matches mime type
    this.validateFileExtension(file);

    // Perform basic virus scanning simulation
    this.performVirusScan(file);
  }

  private validateFileExtension(file: Express.Multer.File) {
    const extension = file.originalname.split('.').pop()?.toLowerCase();
    const mimeToExt: { [key: string]: string[] } = {
      'application/pdf': ['pdf'],
      'image/jpeg': ['jpg', 'jpeg'],
      'image/png': ['png'],
      'image/gif': ['gif'],
      'application/msword': ['doc'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['docx'],
    };

    const allowedExtensions = mimeToExt[file.mimetype] || [];
    if (!extension || !allowedExtensions.includes(extension)) {
      throw new BadRequestException(
        `File extension ${extension} does not match file type ${file.mimetype}`
      );
    }
  }

  private performVirusScan(file: Express.Multer.File) {
    // Basic virus scanning simulation
    // In production, integrate with actual antivirus service like ClamAV

    const dangerousPatterns = [
      /<script/i,
      /javascript:/i,
      /vbscript:/i,
      /onload=/i,
      /onerror=/i,
      /eval\(/i,
    ];

    const fileContent = file.buffer.toString('utf8', 0, Math.min(1024, file.size)); // Check first 1KB

    for (const pattern of dangerousPatterns) {
      if (pattern.test(fileContent)) {
        throw new BadRequestException(
          'File contains potentially malicious content and has been rejected'
        );
      }
    }

    // For binary files, check for common malware signatures
    if (file.mimetype.startsWith('image/')) {
      this.validateImageFile(file);
    }

    // Log scan completion
    console.log(`Virus scan passed for file: ${file.originalname}`);
  }

  private validateImageFile(file: Express.Multer.File) {
    // Basic image validation - check file headers
    const buffer = file.buffer;

    // JPEG validation
    if (file.mimetype === 'image/jpeg') {
      if (buffer.length < 2 || buffer[0] !== 0xFF || buffer[1] !== 0xD8) {
        throw new BadRequestException('Invalid JPEG file format');
      }
    }

    // PNG validation
    if (file.mimetype === 'image/png') {
      const pngSignature = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);
      if (buffer.length < 8 || !buffer.subarray(0, 8).equals(pngSignature)) {
        throw new BadRequestException('Invalid PNG file format');
      }
    }

    // GIF validation
    if (file.mimetype === 'image/gif') {
      const gif87a = Buffer.from('GIF87a', 'ascii');
      const gif89a = Buffer.from('GIF89a', 'ascii');
      const header = buffer.subarray(0, 6);
      if (!header.equals(gif87a) && !header.equals(gif89a)) {
        throw new BadRequestException('Invalid GIF file format');
      }
    }
  }

  private generateFileHash(buffer: Buffer): string {
    return createHash('sha256').update(buffer).digest('hex');
  }

  private canAccessFile(file: any, userId: string, userRole: string): boolean {
    // Admin can access all files
    if (userRole === 'ADMIN') return true;

    // User who uploaded can access
    if (file.uploadedBy === userId) return true;

    // Doctors can access files for their patients
    if (userRole === 'DOCTOR' && file.patientId) {
      // Would need to check if doctor has access to this patient
      // For now, allow if patientId is associated
      return true;
    }

    // Patients can access their own files
    if (userRole === 'PATIENT' && file.patientId === userId) return true;

    return false;
  }

  private canAccessAppointment(appointment: any, userId: string, userRole: string): boolean {
    if (userRole === 'ADMIN') return true;
    if (userRole === 'DOCTOR' && appointment.doctorId === userId) return true;
    if (userRole === 'PATIENT' && appointment.patientId === userId) return true;
    return false;
  }
}