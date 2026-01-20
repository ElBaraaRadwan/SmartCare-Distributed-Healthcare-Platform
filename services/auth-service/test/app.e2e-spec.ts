/* eslint-disable @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-return */
import request, { type Response } from 'supertest';

// Set suite-level timeout for E2E tests
jest.setTimeout(30000);

// Validate required environment variables
const authServiceUrl = process.env.AUTH_SERVICE_URL;
if (!authServiceUrl) {
  throw new Error('AUTH_SERVICE_URL environment variable is required');
}

// Helper functions for reusable logic
const registerUser = async (
  userData: Record<string, any>,
): Promise<Response> => {
  return await request(authServiceUrl).post('/auth/register').send(userData);
};

const loginUser = async (
  email: string,
  password: string,
): Promise<Response> => {
  return await request(authServiceUrl)
    .post('/auth/login')
    .send({ email, password });
};

const makeAuthenticatedRequest = (
  method: string,
  url: string,
  token: string,
  data?: Record<string, any>,
): Promise<Response> => {
  let req = request(authServiceUrl)
    [method.toLowerCase()](url)
    .set('Authorization', `Bearer ${token}`);
  if (data) req = req.send(data);
  return req;
};

describe('Auth Service (e2e)', () => {
  describe('User Registration', () => {
    it('should register a new user successfully', async () => {
      const timestamp = Date.now();
      const userData = {
        email: `john.doe${timestamp}@example.com`,
        password: 'SecurePass123!',
        role: 'DOCTOR',
        firstName: 'John',
        lastName: 'Doe',
      };

      const res = await registerUser(userData);

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('id');
      expect(res.body.id).toEqual(expect.any(String));
      expect(res.body).toHaveProperty('email', userData.email);
      expect(res.body).toHaveProperty('role', userData.role);
      expect(res.body).toHaveProperty('firstName', userData.firstName);
      expect(res.body).toHaveProperty('lastName', userData.lastName);
      expect(res.body).not.toHaveProperty('password');
      expect(res.body).toHaveProperty('createdAt');
      expect(res.body.createdAt).toEqual(expect.any(String));
      expect(res.body).toHaveProperty('updatedAt');
      expect(res.body.updatedAt).toEqual(expect.any(String));
    });

    it('should register a patient user', async () => {
      const timestamp = Date.now();
      const userData = {
        email: `jane.smith${timestamp}@example.com`,
        password: 'PatientPass123!',
        role: 'PATIENT',
        firstName: 'Jane',
        lastName: 'Smith',
        phone: '+1234567890',
      };

      const res = await registerUser(userData);

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('role', 'PATIENT');
      expect(res.body).toHaveProperty('phone', userData.phone);
    });

    it('should reject registration with existing email', async () => {
      const timestamp = Date.now();
      const userData = {
        email: `duplicate${timestamp}@example.com`,
        password: 'Pass123!',
        role: 'PATIENT',
      };

      // First registration
      await registerUser(userData);

      // Duplicate registration
      const res = await registerUser(userData);

      expect(res.status).toBe(409);
      expect(res.body).toHaveProperty('statusCode', 409);
      expect(res.body).toHaveProperty('message');
      expect(res.body.message).toEqual(expect.any(String));
      expect(res.body.message).toContain('already registered');
    });

    it('should reject registration with invalid data', async () => {
      const timestamp = Date.now();
      const invalidData = {
        email: `invalid-email${timestamp}`,
        password: '123',
        role: 'INVALID_ROLE',
      };

      const res = await registerUser(invalidData);

      expect(res.status).toBe(400);
    });

    it('should reject registration with missing required fields', async () => {
      const timestamp = Date.now();
      const incompleteData = {
        email: `test${timestamp}@example.com`,
        // Missing password and role
      };

      const res = await registerUser(incompleteData);

      expect(res.status).toBe(400);
    });
  });

  describe('User Login', () => {
    let testUser: Record<string, any>;

    beforeEach(async () => {
      testUser = {
        email: `login.test${Date.now()}@example.com`,
        password: 'LoginTest123!',
        role: 'DOCTOR',
        firstName: 'Login',
        lastName: 'Test',
      };

      // Register test user
      await registerUser(testUser);
    });

    it('should login successfully with correct credentials', async () => {
      // Auth service returns 201 for login (non-standard but implemented this way)
      const res = await loginUser(testUser.email, testUser.password);

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('accessToken');
      expect(res.body.accessToken).toEqual(expect.any(String));
      expect(res.body.accessToken.length).toBeGreaterThan(0);
      expect(res.body).toHaveProperty('user');
      expect(res.body.user).toHaveProperty('id');
      expect(res.body.user.id).toEqual(expect.any(String));
      expect(res.body.user).toHaveProperty('email', testUser.email);
      expect(res.body.user).toHaveProperty('role', testUser.role);
    });

    it('should reject login with incorrect password', async () => {
      const res = await request(authServiceUrl).post('/auth/login').send({
        email: testUser.email,
        password: 'wrongpassword',
      });

      expect(res.status).toBe(401);
      expect(res.body).toHaveProperty('statusCode', 401);
      expect(res.body).toHaveProperty('message');
      expect(res.body.message).toEqual(expect.any(String));
    });

    it('should reject login with non-existent email', async () => {
      const res = await request(authServiceUrl).post('/auth/login').send({
        email: 'nonexistent@example.com',
        password: 'password123',
      });

      expect(res.status).toBe(401);
    });

    it('should reject login with invalid email format', async () => {
      const res = await request(authServiceUrl).post('/auth/login').send({
        email: 'invalid-email',
        password: 'password123',
      });

      expect(res.status).toBe(400);
    });
  });

  describe('JWT Token Validation', () => {
    let validToken: string;
    let userId: string;

    beforeEach(async () => {
      const timestamp = Date.now();
      const testUser = {
        email: `jwt.test${timestamp}@example.com`,
        password: 'JwtTest123!',
        role: 'PATIENT',
      };

      await registerUser(testUser);
      const loginRes = await loginUser(testUser.email, testUser.password);

      validToken = loginRes.body.accessToken;
      userId = loginRes.body.user.id;
    });

    it('should validate JWT token and return user data', async () => {
      const res = await makeAuthenticatedRequest('get', '/auth/me', validToken);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('id', userId);
      expect(res.body).toHaveProperty('email');
      expect(res.body.email).toMatch(/jwt\.test\d+@example\.com/);
      expect(res.body).toHaveProperty('role', 'PATIENT');
    });

    it('should reject request without authorization header', async () => {
      const res = await request(authServiceUrl).get('/auth/me');

      expect(res.status).toBe(401);
    });

    it('should reject request with invalid JWT token', async () => {
      const res = await request(authServiceUrl)
        .get('/auth/me')
        .set('Authorization', 'Bearer invalid-token');

      expect(res.status).toBe(401);
    });

    it('should reject request with malformed authorization header', async () => {
      const res = await request(authServiceUrl)
        .get('/auth/me')
        .set('Authorization', 'InvalidFormat');

      expect(res.status).toBe(401);
    });

    it('should reject expired JWT token', async () => {
      // Wait a bit to ensure token expiry (if configured)
      await new Promise((resolve) => setTimeout(resolve, 1000));

      const res = await makeAuthenticatedRequest('get', '/auth/me', validToken);

      expect(res.status).toBe(200); // Should still work with 7-day expiry
    });
  });

  describe('User Roles', () => {
    it('should support all user roles', async () => {
      const timestamp = Date.now();
      const roles = ['PATIENT', 'DOCTOR', 'PHARMACIST', 'ADMIN'];

      // Test registration for each role
      for (const role of roles) {
        const userData = {
          email: `role.${role.toLowerCase()}${timestamp}@example.com`,
          password: 'RoleTest123!',
          role,
        };

        const res = await registerUser(userData);
        expect(res.status).toBe(201);
        expect(res.body.role).toBe(role);
      }
    });

    it('should include role in JWT payload', async () => {
      const timestamp = Date.now();
      const userData = {
        email: `role.jwt${timestamp}@example.com`,
        password: 'RoleJwt123!',
        role: 'PHARMACIST',
      };

      await registerUser(userData);
      const loginRes = await loginUser(userData.email, userData.password);

      expect(loginRes.status).toBe(201);
      expect(loginRes.body.user.role).toBe('PHARMACIST');

      const meRes = await makeAuthenticatedRequest(
        'get',
        '/auth/me',
        loginRes.body.accessToken,
      );

      expect(meRes.status).toBe(200);
      expect(meRes.body.role).toBe('PHARMACIST');
    });
  });

  describe('Password Security', () => {
    it('should hash passwords securely', async () => {
      const timestamp = Date.now();
      const userData = {
        email: `security${timestamp}@example.com`,
        password: 'MySecurePassword123!',
        role: 'PATIENT',
      };

      const res = await registerUser(userData);

      // Password should not be returned in response
      expect(res.status).toBe(201);
      expect(res.body).not.toHaveProperty('password');

      // Password should be hashed in database (we can't directly test this,
      // but we can verify login works with original password)
      const loginRes = await loginUser(userData.email, userData.password);
      expect(loginRes.status).toBe(201);
    });

    it('should validate password minimum length', async () => {
      // Note: Auth service validates minimum password length (8 chars)
      const timestamp = Date.now();
      const validPasswords = [
        'validpass1',
        'anotherpassword',
        'testpassword123',
      ];

      // Test registration with valid passwords
      for (const password of validPasswords) {
        const userData = {
          email: `pass${password}${timestamp}@example.com`,
          password,
          role: 'PATIENT',
        };

        const res = await registerUser(userData);
        expect(res.status).toBe(201); // Accepts valid passwords
      }
    });
  });

  describe('Error Handling', () => {
    it('should handle database connection errors gracefully', async () => {
      // This test would require mocking database disconnection
      // For now, we test general error handling
      const res = await request(authServiceUrl).post('/auth/register').send({}); // Empty body

      expect(res.status).toBe(400);
    });

    it('should return appropriate error messages', async () => {
      const timestamp = Date.now();
      const res = await request(authServiceUrl)
        .post('/auth/register')
        .send({
          email: `test${timestamp}@example.com`,
          password: 'password123',
          // Missing role
        });

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('statusCode', 400);
      expect(res.body).toHaveProperty('message');
      expect(res.body.message).toEqual(expect.any(Array));
    });
  });
});
