import { Injectable } from '@nestjs/common';
import { Client as MinioClient } from 'minio';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class FileStorageService {
  private minioClient: MinioClient;
  private bucketName: string;

  constructor(private config: ConfigService) {
    this.bucketName = 'smartcare-medical-docs';

    this.minioClient = new MinioClient({
      endPoint: this.config.get('MINIO_ENDPOINT', 'localhost'),
      port: parseInt(this.config.get('MINIO_PORT', '9000')),
      useSSL: this.config.get('MINIO_USE_SSL', 'false') === 'true',
      accessKey: this.config.get('MINIO_ACCESS_KEY'),
      secretKey: this.config.get('MINIO_SECRET_KEY'),
      region: this.config.get('MINIO_REGION', 'us-east-1'),
    });
  }

  async uploadFile(key: string, buffer: Buffer, mimeType: string, metadata?: Record<string, string>) {
    const metaData = {
      'Content-Type': mimeType,
      ...metadata,
    };

    await this.minioClient.putObject(this.bucketName, key, buffer, buffer.length, metaData);
  }

  async downloadFile(key: string) {
    return await this.minioClient.getObject(this.bucketName, key);
  }

  async deleteFile(key: string) {
    await this.minioClient.removeObject(this.bucketName, key);
  }

  async fileExists(key: string): Promise<boolean> {
    try {
      await this.minioClient.statObject(this.bucketName, key);
      return true;
    } catch (error) {
      return false;
    }
  }

  async getFileMetadata(key: string) {
    return await this.minioClient.statObject(this.bucketName, key);
  }

  async createPresignedUrl(key: string, expiresInSeconds: number = 3600) {
    return await this.minioClient.presignedGetObject(this.bucketName, key, expiresInSeconds);
  }

  async listFiles(prefix?: string) {
    const stream = this.minioClient.listObjects(this.bucketName, prefix);
    return new Promise<any[]>((resolve, reject) => {
      const files: any[] = [];
      stream.on('data', (obj) => files.push(obj));
      stream.on('end', () => resolve(files));
      stream.on('error', reject);
    });
  }

  getBucketName(): string {
    return this.bucketName;
  }
}