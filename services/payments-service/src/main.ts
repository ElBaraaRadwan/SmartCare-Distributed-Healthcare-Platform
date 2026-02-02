import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import { json } from 'express';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Raw body for Stripe webhooks
  app.use(
    '/payments/webhook',
    json({
      verify: (req: any, res, buf) => {
        req.rawBody = buf;
      },
    }),
  );

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  app.enableCors();

  const port = process.env.PORT || 4005;
  await app.listen(port);

  console.log(`🚀 Payments Service running on http://localhost:${port}`);
  console.log(`💳 Stripe integration active`);
  console.log(`📡 Listening for ORDER_CONFIRMED events`);
}
bootstrap();
