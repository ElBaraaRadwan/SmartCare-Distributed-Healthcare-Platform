/* eslint-disable @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-return */
import request, { type Response } from 'supertest';
import { v4 as uuidv4 } from 'uuid';

// Set suite-level timeout for E2E tests
jest.setTimeout(30000);

// Validate required environment variables
const apiGatewayUrl = process.env.API_GATEWAY_URL;
if (!apiGatewayUrl) {
  throw new Error('API_GATEWAY_URL environment variable is required');
}

// Helper functions for reusable logic
const registerUser = async (
  userData: Record<string, any>,
): Promise<Response> => {
  return await request(apiGatewayUrl).post('/auth/register').send(userData);
};

const loginUser = async (
  email: string,
  password: string,
): Promise<Response> => {
  return await request(apiGatewayUrl)
    .post('/auth/login')
    .send({ email, password });
};

const makeAuthenticatedRequest = (
  method: string,
  url: string,
  token: string,
  data?: Record<string, any>,
): Promise<Response> => {
  let req = request(apiGatewayUrl)
    [method.toLowerCase()](url)
    .set('Authorization', `Bearer ${token}`);
  if (data) req = req.send(data);
  return req;
};

describe('API Gateway (e2e)', () => {
  describe('Health Check', () => {
    it('should return health status', async () => {
      const res = await request(apiGatewayUrl).get('/health');

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('status', 'ok');
      expect(res.body).toHaveProperty('service', 'api-gateway');
      expect(res.body).toHaveProperty('timestamp');
      expect(res.body.timestamp).toEqual(expect.any(String));
    });
  });

  describe('Authentication Proxy', () => {
    it('should proxy register request to auth service', async () => {
      const userData = {
        email: `test.user.${Date.now()}@example.com`,
        password: 'TestPass123!',
        role: 'PATIENT',
        firstName: 'Test',
        lastName: 'User',
      };

      const res = await registerUser(userData);

      expect([200, 201]).toContain(res.status);
      expect(res.body).toHaveProperty('id');
      expect(res.body.id).toEqual(expect.any(String));
      expect(res.body).toHaveProperty('email', userData.email);
      expect(res.body).toHaveProperty('role', userData.role);
    });

    it('should proxy login request to auth service', async () => {
      const loginData = {
        email: `login.test.${Date.now()}@example.com`,
        password: 'LoginTest123!',
        role: 'DOCTOR',
      };

      // First register the user
      await registerUser(loginData);

      // Then try to login
      const res = await loginUser(loginData.email, loginData.password);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('accessToken');
      expect(res.body.accessToken).toEqual(expect.any(String));
      expect(res.body).toHaveProperty('user');
      expect(res.body.user).toHaveProperty('id');
      expect(res.body.user.id).toEqual(expect.any(String));
      expect(res.body.user).toHaveProperty('email');
      expect(res.body.user).toHaveProperty('role');
    });
  });

  describe('Protected Routes - Appointments', () => {
    let authToken: string;
    let doctorId: string;

    beforeAll(async () => {
      const testUser = {
        email: `appointment.test.${Date.now()}@example.com`,
        password: 'AppointmentTest123!',
        role: 'DOCTOR',
      };

      await registerUser(testUser);
      const loginRes = await loginUser(testUser.email, testUser.password);

      authToken = loginRes.body.accessToken;
      doctorId = loginRes.body.user.id;
    });

    it('should require authentication for appointments endpoint', async () => {
      const res = await request(apiGatewayUrl)
        .post('/appointments')
        .send({
          patientId: uuidv4(),
          doctorId: uuidv4(),
          scheduledAt: new Date(Date.now() + 86400000).toISOString(), // Tomorrow
        });

      expect(res.status).toBe(401);
      expect(res.body).toHaveProperty('message');
      expect(res.body.message).toEqual(expect.any(String));
    });

    it('should proxy authenticated appointment creation to clinic service', async () => {
      // Generate dynamic UUIDs for test data
      const patientId = uuidv4();

      const appointmentData = {
        patientId, // Dynamic UUID
        doctorId, // Authenticated doctor ID
        scheduledAt: new Date(Date.now() + 86400000).toISOString(), // Tomorrow
        notes: 'Integration test appointment',
      };

      const res = await makeAuthenticatedRequest(
        'post',
        '/appointments',
        authToken,
        appointmentData,
      );

      // Accept both 200 and 201
      expect([200, 201]).toContain(res.status);
      expect(res.body).toHaveProperty('id');
      expect(res.body.id).toEqual(expect.any(String));
      expect(res.body).toHaveProperty('patientId', appointmentData.patientId);
      expect(res.body).toHaveProperty('doctorId', appointmentData.doctorId);
      expect(res.body).toHaveProperty('scheduledAt');
      expect(res.body.scheduledAt).toEqual(expect.any(String));
      expect(res.body).toHaveProperty('status', 'PENDING');
    });
  });

  describe('Error Handling', () => {
    it('should handle non-existent routes', async () => {
      const res = await request(apiGatewayUrl).get('/non-existent-route');

      expect(res.status).toBe(404);
      expect(res.body).toHaveProperty('error');
      expect(res.body.error).toEqual(expect.any(String));
    });

    it('should handle invalid JWT tokens', async () => {
      const res = await request(apiGatewayUrl)
        .post('/appointments')
        .set('Authorization', 'Bearer invalid-token')
        .send({
          patientId: uuidv4(),
          doctorId: uuidv4(),
          scheduledAt: new Date(Date.now() + 86400000).toISOString(),
        });

      expect(res.status).toBe(401);
      expect(res.body).toHaveProperty('message');
      expect(res.body.message).toEqual(expect.any(String));
    });

    it('should handle missing authorization header', async () => {
      const res = await request(apiGatewayUrl)
        .post('/appointments')
        .send({
          patientId: uuidv4(),
          doctorId: uuidv4(),
          scheduledAt: new Date(Date.now() + 86400000).toISOString(),
        });

      expect(res.status).toBe(401);
      expect(res.body).toHaveProperty('message');
      expect(res.body.message).toEqual(expect.any(String));
    });
  });
});
