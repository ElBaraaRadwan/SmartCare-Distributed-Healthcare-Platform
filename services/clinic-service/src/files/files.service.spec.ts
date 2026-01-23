import { Test, TestingModule } from '@nestjs/testing';
import { FilesService } from './files.service';
import { FileStorageService } from './file-storage.service';
import { PrismaService } from '../prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { FileCategory } from '@prisma/client';

describe('FilesService', () => {
  let service: FilesService;
  let prismaService: PrismaService;
  let fileStorageService: FileStorageService;

  const mockAuditLogger = {
    log: jest.fn(),
  };

  const mockFile: Express.Multer.File = {
    fieldname: 'file',
    originalname: 'test.pdf',
    encoding: '7bit',
    mimetype: 'application/pdf',
    buffer: Buffer.from('test file content'),
    size: 1024,
    destination: '',
    filename: '',
    path: '',
    stream: null as any,
  };

  const mockUser = {
    userId: 'user-123',
    email: 'test@example.com',
    role: 'PATIENT' as const,
  };

  const createMockFile = (overrides: Partial<any> = {}) => ({
    id: 'file-123',
    filename: 'test.pdf',
    originalName: 'test.pdf',
    mimeType: 'application/pdf',
    size: 1024,
    hash: 'mock-hash',
    bucket: 'smartcare-medical-docs',
    key: 'test-key',
    uploadedBy: 'user-123',
    uploadedByRole: 'PATIENT',
    patientId: 'patient-123',
    appointmentId: 'appointment-123',
    consultationId: null,
    category: FileCategory.MEDICAL_DOCUMENT,
    isDeleted: false,
    deletedAt: null,
    deletedBy: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  });

  const createMockAppointment = (overrides: Partial<any> = {}) => ({
    id: 'appointment-123',
    patientId: 'patient-123',
    doctorId: 'doctor-123',
    scheduledAt: new Date(),
    status: 'PENDING' as const,
    notes: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  });

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FilesService,
        {
          provide: FileStorageService,
          useValue: {
            uploadFile: jest.fn(),
            downloadFile: jest.fn(),
            deleteFile: jest.fn(),
            getBucketName: jest.fn().mockReturnValue('smartcare-medical-docs'),
          },
        },
        {
          provide: PrismaService,
          useValue: {
            file: {
              create: jest.fn(),
              findUnique: jest.fn(),
              findMany: jest.fn(),
              update: jest.fn(),
            },
            appointment: {
              findUnique: jest.fn(),
            },
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              const config = {
                MINIO_ENDPOINT: 'localhost',
                MINIO_PORT: '9000',
                MINIO_USE_SSL: 'false',
                MINIO_ACCESS_KEY: 'test',
                MINIO_SECRET_KEY: 'test',
                MINIO_REGION: 'us-east-1',
              };
              return config[key];
            }),
          },
        },
        {
          provide: 'AuditLogger',
          useValue: mockAuditLogger,
        },
      ],
    }).compile();

    service = module.get<FilesService>(FilesService);
    prismaService = module.get<PrismaService>(PrismaService);
    fileStorageService = module.get<FileStorageService>(FileStorageService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('uploadFile', () => {
    it('should upload a valid file successfully', async () => {
      const mockFileRecord = createMockFile();

      jest.spyOn(fileStorageService, 'uploadFile').mockResolvedValue(undefined);
      jest.spyOn(prismaService.file, 'create').mockResolvedValue(mockFileRecord);

      const result = await service.uploadFile(
        mockFile,
        mockUser.userId,
        mockUser.role,
        'patient-123',
        'appointment-123',
        undefined,
        FileCategory.MEDICAL_DOCUMENT,
      );

      expect(result).toEqual(mockFileRecord);
      expect(fileStorageService.uploadFile).toHaveBeenCalled();
      expect(prismaService.file.create).toHaveBeenCalled();
      expect(mockAuditLogger.log).toHaveBeenCalled();
    });

    it('should reject file that is too large', async () => {
      const largeFile = { ...mockFile, size: 15 * 1024 * 1024 }; // 15MB

      await expect(
        service.uploadFile(largeFile, mockUser.userId, mockUser.role)
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject file that is too small', async () => {
      const smallFile = { ...mockFile, size: 512 }; // 512 bytes

      await expect(
        service.uploadFile(smallFile, mockUser.userId, mockUser.role)
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject unsupported file type', async () => {
      const exeFile = { ...mockFile, mimetype: 'application/x-msdownload', originalname: 'test.exe' };

      await expect(
        service.uploadFile(exeFile, mockUser.userId, mockUser.role)
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject file with malicious content', async () => {
      const maliciousFile = {
        ...mockFile,
        buffer: Buffer.from('<script>alert("xss")</script>'),
      };

      await expect(
        service.uploadFile(maliciousFile, mockUser.userId, mockUser.role)
      ).rejects.toThrow(BadRequestException);
    });

    it('should handle upload failure and cleanup', async () => {
      jest.spyOn(fileStorageService, 'uploadFile').mockResolvedValue(undefined);
      jest.spyOn(prismaService.file, 'create').mockRejectedValue(new Error('DB Error'));
      jest.spyOn(fileStorageService, 'deleteFile').mockResolvedValue(undefined);

      await expect(
        service.uploadFile(mockFile, mockUser.userId, mockUser.role)
      ).rejects.toThrow();

      expect(fileStorageService.deleteFile).toHaveBeenCalled();
    });
  });

  describe('getFile', () => {
    it('should return file for authorized user', async () => {
      const mockFileRecord = createMockFile();

      const mockStream = {} as any;

      jest.spyOn(prismaService.file, 'findUnique').mockResolvedValue(mockFileRecord);
      jest.spyOn(fileStorageService, 'downloadFile').mockResolvedValue(mockStream);

      const result = await service.getFile('file-123', mockUser.userId, mockUser.role);

      expect(result).toEqual({ file: mockFileRecord, stream: mockStream });
      expect(mockAuditLogger.log).toHaveBeenCalled();
    });

    it('should throw NotFoundException for non-existent file', async () => {
      jest.spyOn(prismaService.file, 'findUnique').mockResolvedValue(null);

      await expect(
        service.getFile('file-123', mockUser.userId, mockUser.role)
      ).rejects.toThrow(NotFoundException);
    });

    it('should deny access to file uploaded by different user', async () => {
      const mockFileRecord = createMockFile({
        uploadedBy: 'different-user',
        patientId: null
      });

      jest.spyOn(prismaService.file, 'findUnique').mockResolvedValue(mockFileRecord);

      await expect(
        service.getFile('file-123', mockUser.userId, mockUser.role)
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('getFilesByAppointment', () => {
    it('should return files for appointment', async () => {
      const mockAppointment = createMockAppointment({ patientId: mockUser.userId });

      const mockFiles = [
        createMockFile({ id: 'file-1' }),
        createMockFile({ id: 'file-2' }),
      ];

      jest.spyOn(prismaService.appointment, 'findUnique').mockResolvedValue(mockAppointment);
      jest.spyOn(prismaService.file, 'findMany').mockResolvedValue(mockFiles);

      const result = await service.getFilesByAppointment('appointment-123', mockUser.userId, mockUser.role);

      expect(result).toEqual(mockFiles);
    });

    it('should deny access to appointment files for unauthorized user', async () => {
      const mockAppointment = createMockAppointment({ patientId: 'different-patient' });

      jest.spyOn(prismaService.appointment, 'findUnique').mockResolvedValue(mockAppointment);

      await expect(
        service.getFilesByAppointment('appointment-123', mockUser.userId, mockUser.role)
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('deleteFile', () => {
    it('should soft delete file for uploader', async () => {
      const mockFileRecord = createMockFile();

      jest.spyOn(prismaService.file, 'findUnique').mockResolvedValue(mockFileRecord);
      jest.spyOn(prismaService.file, 'update').mockResolvedValue(createMockFile({ isDeleted: true }));

      const result = await service.deleteFile('file-123', mockUser.userId, mockUser.role);

      expect(result).toEqual({ success: true });
      expect(prismaService.file.update).toHaveBeenCalledWith({
        where: { id: 'file-123' },
        data: {
          isDeleted: true,
          deletedAt: expect.any(Date),
          deletedBy: 'user-123',
        },
      });
      expect(mockAuditLogger.log).toHaveBeenCalled();
    });

    it('should deny delete for non-uploader', async () => {
      const mockFileRecord = createMockFile({ uploadedBy: 'different-user' });

      jest.spyOn(prismaService.file, 'findUnique').mockResolvedValue(mockFileRecord);

      await expect(
        service.deleteFile('file-123', mockUser.userId, mockUser.role)
      ).rejects.toThrow(BadRequestException);
    });
  });
});