import { Module } from '@nestjs/common';
import { FilesController } from './files.controller';
import { FilesService } from './files.service';
import { FileStorageService } from './file-storage.service';
import { PrismaAuditLogger } from '../common/prisma-audit-logger.service';
import { MulterModule } from '@nestjs/platform-express';
import { ConfigModule, ConfigService } from '@nestjs/config';

@Module({
  imports: [
    MulterModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (config: ConfigService) => ({
        dest: config.get('UPLOAD_DEST', './uploads'),
        limits: {
          fileSize: 10 * 1024 * 1024, // 10MB
        },
      }),
      inject: [ConfigService],
    }),
  ],
  controllers: [FilesController],
  providers: [
    FilesService,
    FileStorageService,
    {
      provide: 'AuditLogger',
      useClass: PrismaAuditLogger,
    },
  ],
})
export class FilesModule {}
