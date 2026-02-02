import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { AppModule } from './app.module';
import { json, Request } from 'express';
import helmet from 'helmet';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Security: Helmet for security headers
  app.use(helmet());

  // Raw body handling middleware
  app.use(
    json({
      limit: '10mb',
      verify: (req, res, buf) => {
        (req as unknown as { rawBody: Buffer }).rawBody = buf;
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

  // CORS configuration
  app.enableCors({
    origin: process.env.ALLOWED_ORIGINS?.split(',') || [
      'http://localhost:3000', // Next.js frontend
      'http://localhost:4000', // API Gateway
    ],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
  });

  const port = process.env.PORT || 4000;

  // Swagger API Documentation
  const config = new DocumentBuilder()
    .setTitle('SmartCare Healthcare Platform API')
    .setDescription('Secure healthcare platform API with HIPAA compliance')
    .setVersion('1.0')
    .addTag('authentication', 'User authentication and authorization')
    .addTag('prescriptions', 'Medical prescription management')
    .addTag('appointments', 'Medical appointment scheduling')
    .addTag('pharmacy', 'Pharmacy inventory and orders')
    .addTag('payments', 'Secure payment processing')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'JWT',
        description: 'Enter JWT token',
        in: 'header',
      },
      'JWT-auth',
    )
    .addServer(`http://localhost:${port}`, 'Development server')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document, {
    swaggerOptions: {
      persistAuthorization: true,
      displayRequestDuration: true,
    },
  });

  await app.listen(port);

  const logger = new Logger('Bootstrap');

  logger.log(`API Gateway running on http://localhost:${port}`);
  logger.log(`API Documentation available at http://localhost:${port}/api`);
  logger.log(`Health check available at http://localhost:${port}/health`);
  logger.log(`Security enabled: Helmet, CORS, Rate limiting, Swagger API docs`);
}
void bootstrap();
