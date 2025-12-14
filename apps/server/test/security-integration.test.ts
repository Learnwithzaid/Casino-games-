import { describe, it, expect, beforeEach } from 'vitest';
import { buildApp } from '../app.js';
import { buildLogger } from '../logger.js';
import { loadConfig } from '../config.js';
import { PrismaClient } from '@prisma/client';

describe('Security Middleware Integration', () => {
  let app: any;
  let prisma: PrismaClient;
  let config: any;

  beforeEach(async () => {
    config = loadConfig({
      ...process.env,
      NODE_ENV: 'test',
      DATABASE_URL: 'file:./prisma/test.db',
      JWT_SECRET: 'test-secret-key',
      JWT_ACCESS_EXPIRY: '15m',
      JWT_REFRESH_EXPIRY: '7d',
      JWT_ISSUER: 'test-issuer',
      RATE_LIMIT_STRATEGY: 'memory',
      MAX_FAILED_LOGIN_ATTEMPTS: 5,
      LOCKOUT_DURATION_MINUTES: 15,
      CSP_ENABLED: true,
      HSTS_ENABLED: true,
      LOG_LEVEL: 'error'
    });

    const logger = buildLogger();
    prisma = new PrismaClient({
      datasources: { db: { url: config.databaseUrl } }
    });

    app = await buildApp({ prisma, config, logger });
  });

  afterEach(async () => {
    if (app) {
      await app.close();
    }
    if (prisma) {
      await prisma.$disconnect();
    }
  });

  describe('JWT Authentication', () => {
    it('should authenticate valid user and provide tokens', async () => {
      // Create test user
      const user = await prisma.user.create({
        data: {
          id: 'test-user-123',
          email: 'test@example.com',
          role: 'user',
          createdAt: new Date(),
          lastLoginAt: new Date()
        }
      });

      const response = await app.inject({
        method: 'POST',
        url: '/api/auth/login',
        payload: {
          email: 'test@example.com',
          password: 'password123' // Simple password for test
        }
      });

      expect(response.statusCode).toBe(200);
      const data = response.json();
      expect(data).toHaveProperty('accessToken');
      expect(data).toHaveProperty('expiresIn');
      expect(data.user).toEqual({
        id: user.id,
        email: user.email,
        role: user.role
      });
      expect(response.headers['set-cookie']).toBeDefined();
    });

    it('should reject login with invalid credentials', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/auth/login',
        payload: {
          email: 'test@example.com',
          password: 'wrong-password'
        }
      });

      expect(response.statusCode).toBe(401);
      const data = response.json();
      expect(data.error).toBe('INVALID_CREDENTIALS');
    });

    it('should validate access token for protected routes', async () => {
      // First login to get token
      const loginResponse = await app.inject({
        method: 'POST',
        url: '/api/auth/login',
        payload: {
          email: 'test@example.com',
          password: 'password123'
        }
      });

      const { accessToken } = loginResponse.json();

      // Try accessing protected route
      const protectedResponse = await app.inject({
        method: 'GET',
        url: '/api/auth/me',
        headers: {
          Authorization: `Bearer ${accessToken}`
        }
      });

      expect(protectedResponse.statusCode).toBe(200);
      const userData = protectedResponse.json();
      expect(userData.user).toBeDefined();
    });

    it('should reject requests without valid tokens', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/auth/me'
      });

      expect(response.statusCode).toBe(401);
      expect(response.json().error).toBe('UNAUTHENTICATED');
    });
  });

  describe('Rate Limiting', () => {
    it('should allow requests within rate limit', async () => {
      const user = await prisma.user.create({
        data: {
          id: 'test-user-456',
          email: 'rate-test@example.com',
          role: 'user'
        }
      });

      // Make requests within limit
      const requests = Array(5).fill(null).map(() =>
        app.inject({
          method: 'GET',
          url: '/api/user/deposits',
          headers: {
            'x-user-id': user.id,
            'x-user-role': 'user'
          }
        })
      );

      const responses = await Promise.all(requests);
      responses.forEach(response => {
        expect([200, 404]).toContain(response.statusCode); // 200 or 404 is fine
      });
    });

    it('should reject requests exceeding rate limit', async () => {
      const user = await prisma.user.create({
        data: {
          id: 'test-user-789',
          email: 'rate-limit@example.com',
          role: 'user'
        }
      });

      // Exceed rate limit (default is 100 requests per minute)
      const requests = Array(105).fill(null).map(() =>
        app.inject({
          method: 'GET',
          url: '/api/user/deposits',
          headers: {
            'x-user-id': user.id,
            'x-user-role': 'user'
          }
        })
      );

      const responses = await Promise.all(requests);
      const rateLimitedResponses = responses.filter(r => r.statusCode === 429);
      
      expect(rateLimitedResponses.length).toBeGreaterThan(0);
      expect(rateLimitedResponses[0].json().error).toBe('RATE_LIMIT_EXCEEDED');
      expect(rateLimitedResponses[0].headers['retry-after']).toBeDefined();
    });

    it('should have different rate limits for different endpoints', async () => {
      // Auth endpoints should have stricter rate limiting
      const authRequests = Array(10).fill(null).map(() =>
        app.inject({
          method: 'POST',
          url: '/api/auth/login',
          payload: {
            email: 'auth-rate@example.com',
            password: 'password123'
          }
        })
      );

      const authResponses = await Promise.all(authRequests);
      const rateLimitedAuth = authResponses.filter(r => r.statusCode === 429);
      
      // Should hit rate limit faster for auth endpoints
      expect(rateLimitedAuth.length).toBeGreaterThan(0);
    });
  });

  describe('Security Headers', () => {
    it('should include security headers in responses', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/health'
      });

      expect(response.headers['x-content-type-options']).toBe('nosniff');
      expect(response.headers['x-frame-options']).toBe('DENY');
      expect(response.headers['x-xss-protection']).toBe('1; mode=block');
      expect(response.headers['referrer-policy']).toBe('strict-origin-when-cross-origin');
      expect(response.headers['permissions-policy']).toBe('geolocation=(), microphone=(), camera=()');
    });

    it('should include HSTS header in production mode', async () => {
      const productionApp = await buildApp({
        prisma,
        config: { ...config, nodeEnv: 'production' },
        logger: buildLogger()
      });

      const response = await productionApp.inject({
        method: 'GET',
        url: '/health'
      });

      expect(response.headers['strict-transport-security']).toContain('max-age=');
      
      await productionApp.close();
    });
  });

  describe('Input Validation', () => {
    it('should reject invalid email format', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/auth/login',
        payload: {
          email: 'invalid-email',
          password: 'password123'
        }
      });

      expect(response.statusCode).toBe(400);
      expect(response.json().error).toBe('VALIDATION_ERROR');
    });

    it('should reject invalid request body structure', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/auth/login',
        payload: {
          invalidField: 'value'
        }
      });

      expect(response.statusCode).toBe(400);
      expect(response.json().error).toBe('VALIDATION_ERROR');
    });

    it('should sanitize malicious input', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/auth/login',
        payload: {
          email: '<script>alert("xss")</script>test@example.com',
          password: 'password123'
        }
      });

      expect(response.statusCode).toBe(400);
      // Input should be sanitized before processing
      expect(response.json().error).toBe('VALIDATION_ERROR');
    });
  });

  describe('Error Handling', () => {
    it('should not leak sensitive information in production', async () => {
      const productionApp = await buildApp({
        prisma,
        config: { ...config, nodeEnv: 'production' },
        logger: buildLogger()
      });

      const response = await productionApp.inject({
        method: 'POST',
        url: '/api/auth/login',
        payload: {
          email: 'nonexistent@example.com',
          password: 'password123'
        }
      });

      const data = response.json();
      expect(data).not.toHaveProperty('stack');
      expect(data).not.toHaveProperty('innerError');
      expect(data.message).not.toContain('Database');
      
      await productionApp.close();
    });

    it('should include debug information in development', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/auth/login',
        payload: {
          email: 'nonexistent@example.com',
          password: 'password123'
        }
      });

      const data = response.json();
      // In development mode, more details should be available
      expect(data).toHaveProperty('timestamp');
      expect(data).toHaveProperty('path');
      expect(data).toHaveProperty('method');
    });
  });

  describe('CORS Configuration', () => {
    it('should handle CORS preflight requests', async () => {
      const response = await app.inject({
        method: 'OPTIONS',
        url: '/api/auth/login',
        headers: {
          'origin': 'https://example.com',
          'access-control-request-method': 'POST',
          'access-control-request-headers': 'content-type'
        }
      });

      expect(response.statusCode).toBe(200);
      expect(response.headers['access-control-allow-origin']).toBeDefined();
      expect(response.headers['access-control-allow-methods']).toBeDefined();
      expect(response.headers['access-control-allow-headers']).toBeDefined();
    });
  });
});