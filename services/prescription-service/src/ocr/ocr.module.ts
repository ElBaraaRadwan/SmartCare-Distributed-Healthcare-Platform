import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { OcrService } from './ocr.service';

@Module({
  imports: [
    HttpModule.register({
      timeout: 30000,
      maxRedirects: 5,
    }),
  ],
  providers: [OcrService],
  exports: [OcrService],
})
export class OcrModule {}
