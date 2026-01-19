import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import FormData from 'form-data';

export interface OcrResult {
  text: string;
  confidence: number;
  suggested_medications: Array<{
    name: string;
    dosage: string;
    quantity: number;
  }>;
}

@Injectable()
export class OcrService {
  private readonly logger = new Logger(OcrService.name);
  private readonly ocrServiceUrl: string;

  constructor(
    private httpService: HttpService,
    private configService: ConfigService,
  ) {
    this.ocrServiceUrl =
      this.configService.get('OCR_SERVICE_URL') || 'http://localhost:8000';
  }

  async processImage(
    imageBuffer: Buffer,
    filename: string,
  ): Promise<OcrResult> {
    try {
      const formData = new FormData();
      formData.append('file', imageBuffer, {
        filename,
        contentType: 'image/png',
      });

      const response = await firstValueFrom(
        this.httpService.post<OcrResult>(
          `${this.ocrServiceUrl}/ocr`,
          formData,
          {
            headers: formData.getHeaders(), // FIX: No spread, just pass the object
          },
        ),
      );

      const data = response.data;
      this.logger.log(
        `OCR processed: ${filename}, confidence: ${data.confidence}`,
      );
      return data;
    } catch (error) {
      this.logger.error(`OCR processing failed for ${filename}:`, error);
      throw new Error(
        `OCR service error: ${(error as Error)?.message ?? 'Unknown error'}`,
      );
    }
  }
}
