import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  app.enableCors();

  const port = process.env.PORT || 4004;
  await app.listen(port);

  console.log(`🚀 Pharmacy Service running on http://localhost:${port}`);
  console.log(`📦 Stock management and order fulfillment active`);
  console.log(`📡 Listening for PRESCRIPTION_CREATED events`);
}
bootstrap();
