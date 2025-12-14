import request from 'supertest';
import app from '../index';
import prisma from '../models/prisma';
import { hashPassword } from '../utils/crypto';
import { UserRole } from '@prisma/client';

describe('Authentication Endpoints', () => {
  beforeAll(async () => {
    await prisma.$connect();
  });

  afterAll(async () => {
    await prisma.emailVerificationToken.deleteMany();
    await prisma.passwordResetToken.deleteMany();
    await prisma.session.deleteMany();
    await prisma.user.deleteMany();
    await prisma.$disconnect();
  });

  beforeEach(async () => {
    await prisma.emailVerificationToken.deleteMany();
    await prisma.passwordResetToken.deleteMany();
    await prisma.session.deleteMany();
    await prisma.user.deleteMany();
  });

  describe('POST /api/auth/register', () => {
    it('should register a new user successfully', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'test@example.com',
          password: 'Password123!',
        });

      expect(response.status).toBe(201);
      expect(response.body.message).toContain('Registration successful');
      expect(response.body.user.email).toBe('test@example.com');
      expect(response.body.user.emailVerified).toBe(false);
    });

    it('should fail with weak password', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'test@example.com',
          password: 'weak',
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Validation failed');
    });

    it('should fail with duplicate email', async () => {
      await request(app)
        .post('/api/auth/register')
        .send({
          email: 'test@example.com',
          password: 'Password123!',
        });

      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'test@example.com',
          password: 'Password123!',
        });

      expect(response.status).toBe(409);
      expect(response.body.error).toBe('Email already registered');
    });
  });

  describe('POST /api/auth/login', () => {
    beforeEach(async () => {
      const passwordHash = await hashPassword('Password123!');
      await prisma.user.create({
        data: {
          email: 'test@example.com',
          passwordHash,
          role: UserRole.USER,
          emailVerified: true,
        },
      });
    });

    it('should login successfully with correct credentials', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
          password: 'Password123!',
        });

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Login successful');
      expect(response.body.accessToken).toBeDefined();
      expect(response.body.refreshToken).toBeDefined();
    });

    it('should fail with incorrect password', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
          password: 'WrongPassword123!',
        });

      expect(response.status).toBe(401);
      expect(response.body.error).toBe('Invalid credentials');
    });

    it('should lock account after max failed attempts', async () => {
      for (let i = 0; i < 5; i++) {
        await request(app)
          .post('/api/auth/login')
          .send({
            email: 'test@example.com',
            password: 'WrongPassword123!',
          });
      }

      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
          password: 'Password123!',
        });

      expect(response.status).toBe(423);
      expect(response.body.error).toContain('Account locked');
    });

    it('should fail with non-existent email', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'nonexistent@example.com',
          password: 'Password123!',
        });

      expect(response.status).toBe(401);
      expect(response.body.error).toBe('Invalid credentials');
    });
  });

  describe('GET /api/auth/refresh', () => {
    let refreshToken: string;

    beforeEach(async () => {
      const passwordHash = await hashPassword('Password123!');
      await prisma.user.create({
        data: {
          email: 'test@example.com',
          passwordHash,
          role: UserRole.USER,
          emailVerified: true,
        },
      });

      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
          password: 'Password123!',
        });

      refreshToken = loginResponse.body.refreshToken;
    });

    it('should refresh tokens successfully', async () => {
      const response = await request(app)
        .get('/api/auth/refresh')
        .send({ refreshToken });

      expect(response.status).toBe(200);
      expect(response.body.accessToken).toBeDefined();
      expect(response.body.refreshToken).toBeDefined();
      expect(response.body.refreshToken).not.toBe(refreshToken);
    });

    it('should fail with invalid refresh token', async () => {
      const response = await request(app)
        .get('/api/auth/refresh')
        .send({ refreshToken: 'invalid-token' });

      expect(response.status).toBe(401);
    });

    it('should fail with no refresh token', async () => {
      const response = await request(app)
        .get('/api/auth/refresh');

      expect(response.status).toBe(401);
      expect(response.body.error).toBe('Refresh token required');
    });
  });

  describe('POST /api/auth/logout', () => {
    let refreshToken: string;

    beforeEach(async () => {
      const passwordHash = await hashPassword('Password123!');
      await prisma.user.create({
        data: {
          email: 'test@example.com',
          passwordHash,
          role: UserRole.USER,
          emailVerified: true,
        },
      });

      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
          password: 'Password123!',
        });

      refreshToken = loginResponse.body.refreshToken;
    });

    it('should logout successfully', async () => {
      const response = await request(app)
        .post('/api/auth/logout')
        .send({ refreshToken });

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Logout successful');
    });

    it('should revoke refresh token after logout', async () => {
      await request(app)
        .post('/api/auth/logout')
        .send({ refreshToken });

      const refreshResponse = await request(app)
        .get('/api/auth/refresh')
        .send({ refreshToken });

      expect(refreshResponse.status).toBe(401);
    });
  });

  describe('POST /api/auth/verify-email', () => {
    let verificationToken: string;

    beforeEach(async () => {
      const passwordHash = await hashPassword('Password123!');
      const user = await prisma.user.create({
        data: {
          email: 'test@example.com',
          passwordHash,
          role: UserRole.USER,
        },
      });

      const token = await prisma.emailVerificationToken.create({
        data: {
          userId: user.id,
          token: 'test-verification-token',
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        },
      });

      verificationToken = token.token;
    });

    it('should verify email successfully', async () => {
      const response = await request(app)
        .post('/api/auth/verify-email')
        .send({ token: verificationToken });

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Email verified successfully');

      const user = await prisma.user.findUnique({
        where: { email: 'test@example.com' },
      });

      expect(user?.emailVerified).toBe(true);
    });

    it('should fail with invalid token', async () => {
      const response = await request(app)
        .post('/api/auth/verify-email')
        .send({ token: 'invalid-token' });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Invalid verification token');
    });

    it('should fail with expired token', async () => {
      const passwordHash = await hashPassword('Password123!');
      const user = await prisma.user.create({
        data: {
          email: 'expired@example.com',
          passwordHash,
          role: UserRole.USER,
        },
      });

      const token = await prisma.emailVerificationToken.create({
        data: {
          userId: user.id,
          token: 'expired-token',
          expiresAt: new Date(Date.now() - 1000),
        },
      });

      const response = await request(app)
        .post('/api/auth/verify-email')
        .send({ token: token.token });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Token expired');
    });
  });

  describe('POST /api/auth/request-reset', () => {
    beforeEach(async () => {
      const passwordHash = await hashPassword('Password123!');
      await prisma.user.create({
        data: {
          email: 'test@example.com',
          passwordHash,
          role: UserRole.USER,
        },
      });
    });

    it('should request password reset successfully', async () => {
      const response = await request(app)
        .post('/api/auth/request-reset')
        .send({ email: 'test@example.com' });

      expect(response.status).toBe(200);
      expect(response.body.message).toContain('password reset link');

      const resetToken = await prisma.passwordResetToken.findFirst({
        where: { user: { email: 'test@example.com' } },
      });

      expect(resetToken).toBeDefined();
    });

    it('should not reveal if email does not exist', async () => {
      const response = await request(app)
        .post('/api/auth/request-reset')
        .send({ email: 'nonexistent@example.com' });

      expect(response.status).toBe(200);
      expect(response.body.message).toContain('password reset link');
    });
  });

  describe('POST /api/auth/reset-password', () => {
    let resetToken: string;

    beforeEach(async () => {
      const passwordHash = await hashPassword('Password123!');
      const user = await prisma.user.create({
        data: {
          email: 'test@example.com',
          passwordHash,
          role: UserRole.USER,
        },
      });

      const token = await prisma.passwordResetToken.create({
        data: {
          userId: user.id,
          token: 'test-reset-token',
          expiresAt: new Date(Date.now() + 60 * 60 * 1000),
        },
      });

      resetToken = token.token;
    });

    it('should reset password successfully', async () => {
      const response = await request(app)
        .post('/api/auth/reset-password')
        .send({
          token: resetToken,
          password: 'NewPassword123!',
        });

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Password reset successfully');

      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
          password: 'NewPassword123!',
        });

      expect(loginResponse.status).toBe(200);
    });

    it('should fail with invalid token', async () => {
      const response = await request(app)
        .post('/api/auth/reset-password')
        .send({
          token: 'invalid-token',
          password: 'NewPassword123!',
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Invalid reset token');
    });

    it('should revoke all sessions after password reset', async () => {
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
          password: 'Password123!',
        });

      const oldRefreshToken = loginResponse.body.refreshToken;

      await request(app)
        .post('/api/auth/reset-password')
        .send({
          token: resetToken,
          password: 'NewPassword123!',
        });

      const refreshResponse = await request(app)
        .get('/api/auth/refresh')
        .send({ refreshToken: oldRefreshToken });

      expect(refreshResponse.status).toBe(401);
    });
  });
});
