import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import { json } from 'express';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.use(json({
    limit: '10mb',
    verify: (req: any, res, buf) => {
      req.rawBody = buf;
    },
  }));

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  app.enableCors();

  const port = process.env.PORT || 4000;
  await app.listen(port);

  console.log(`🚀 API Gateway running on http://localhost:${port}`);
  console.log(`📋 Health check: http://localhost:${port}/health`);
}
bootstrap();
