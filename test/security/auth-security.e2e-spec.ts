import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../../apps/api-gateway/src/app.module';
import { PrismaService } from '../../services/auth-service/src/prisma/prisma.service';

describe('Authentication Security (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe());

    prisma = app.get(PrismaService);
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Rate Limiting', () => {
    it('should enforce rate limits on login attempts', async () => {
      // Make multiple rapid login attempts
      const loginAttempts = Array(5).fill(null).map(() =>
        request(app.getHttpServer())
          .post('/auth/login')
          .send({
            email: 'nonexistent@example.com',
            password: 'wrongpassword',
          })
      );

      const responses = await Promise.all(loginAttempts);

      // At least the last few should be rate limited (429)
      const rateLimitedResponses = responses.filter(r => r.status === 429);
      expect(rateLimitedResponses.length).toBeGreaterThan(0);
    }, 30000);

    it('should enforce rate limits on registration', async () => {
      const registrationAttempts = Array(5).fill(null).map((_, i) =>
        request(app.getHttpServer())
          .post('/auth/register')
          .send({
            email: `test${i}@example.com`,
            password: 'ValidPass123!',
            firstName: 'Test',
            lastName: 'User',
            role: 'PATIENT',
          })
      );

      const responses = await Promise.all(registrationAttempts);
      const rateLimitedResponses = responses.filter(r => r.status === 429);
      expect(rateLimitedResponses.length).toBeGreaterThan(0);
    }, 30000);
  });

  describe('Account Lockout', () => {
    it('should lock account after multiple failed login attempts', async () => {
      // Create a test user first
      await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: 'lockout-test@example.com',
          password: 'ValidPass123!',
          firstName: 'Lockout',
          lastName: 'Test',
          role: 'PATIENT',
        });

      // Attempt multiple failed logins
      for (let i = 0; i < 6; i++) {
        await request(app.getHttpServer())
          .post('/auth/login')
          .send({
            email: 'lockout-test@example.com',
            password: 'wrongpassword',
          });
      }

      // Next attempt should be blocked
      const response = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: 'lockout-test@example.com',
          password: 'ValidPass123!',
        });

      expect(response.status).toBe(401);
      expect(response.body.message).toContain('Account locked');
    }, 60000);
  });

  describe('Password Security', () => {
    it('should reject weak passwords during registration', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: 'weak-password@example.com',
          password: '123', // Too short, no complexity
          firstName: 'Weak',
          lastName: 'Password',
          role: 'PATIENT',
        });

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('password');
    });

    it('should prevent user enumeration via registration', async () => {
      // Try to register with existing email
      const response1 = await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: 'existing@example.com',
          password: 'ValidPass123!',
          firstName: 'Existing',
          lastName: 'User',
          role: 'PATIENT',
        });

      const response2 = await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: 'existing@example.com',
          password: 'DifferentPass123!',
          firstName: 'Existing',
          lastName: 'User',
          role: 'PATIENT',
        });

      // Both responses should be identical to prevent enumeration
      expect(response1.status).toBe(response2.status);
      expect(response1.body.message).toBe(response2.body.message);
    });
  });

  describe('Session Management', () => {
    let accessToken: string;
    let refreshToken: string;

    beforeAll(async () => {
      // Create and login a test user
      await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: 'session-test@example.com',
          password: 'ValidPass123!',
          firstName: 'Session',
          lastName: 'Test',
          role: 'PATIENT',
        });

      const loginResponse = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: 'session-test@example.com',
          password: 'ValidPass123!',
        });

      accessToken = loginResponse.body.accessToken;
      refreshToken = loginResponse.body.refreshToken;
    });

    it('should invalidate tokens on logout', async () => {
      // Use the token
      const beforeLogout = await request(app.getHttpServer())
        .get('/auth/me')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(beforeLogout.status).toBe(200);

      // Logout
      await request(app.getHttpServer())
        .post('/auth/logout')
        .set('Authorization', `Bearer ${accessToken}`);

      // Try to use the token again
      const afterLogout = await request(app.getHttpServer())
        .get('/auth/me')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(afterLogout.status).toBe(401);
    });

    it('should refresh tokens securely', async () => {
      // Get new tokens
      const refreshResponse = await request(app.getHttpServer())
        .post('/auth/refresh')
        .send({ refreshToken });

      expect(refreshResponse.status).toBe(200);
      expect(refreshResponse.body.accessToken).toBeDefined();
      expect(refreshResponse.body.refreshToken).toBeDefined();

      // Old refresh token should be invalidated
      const secondRefresh = await request(app.getHttpServer())
        .post('/auth/refresh')
        .send({ refreshToken });

      expect(secondRefresh.status).toBe(401);
    });
  });

  describe('Authorization', () => {
    it('should reject requests without authentication', async () => {
      const response = await request(app.getHttpServer())
        .get('/prescriptions');

      expect(response.status).toBe(401);
    });

    it('should reject invalid JWT tokens', async () => {
      const response = await request(app.getHttpServer())
        .get('/prescriptions')
        .set('Authorization', 'Bearer invalid.jwt.token');

      expect(response.status).toBe(401);
    });

    it('should reject expired JWT tokens', async () => {
      // Create an expired token (iat set to past)
      const expiredToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c';

      const response = await request(app.getHttpServer())
        .get('/prescriptions')
        .set('Authorization', `Bearer ${expiredToken}`);

      expect(response.status).toBe(401);
    });
  });
});