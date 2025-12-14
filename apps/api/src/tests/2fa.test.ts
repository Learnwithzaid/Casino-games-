import request from 'supertest';
import app from '../index';
import prisma from '../models/prisma';
import { hashPassword } from '../utils/crypto';
import { UserRole } from '@prisma/client';
import speakeasy from 'speakeasy';

describe('Two-Factor Authentication', () => {
  let accessToken: string;
  let userId: string;

  beforeAll(async () => {
    await prisma.$connect();
  });

  afterAll(async () => {
    await prisma.session.deleteMany();
    await prisma.user.deleteMany();
    await prisma.$disconnect();
  });

  beforeEach(async () => {
    await prisma.session.deleteMany();
    await prisma.user.deleteMany();

    const passwordHash = await hashPassword('Password123!');
    const user = await prisma.user.create({
      data: {
        email: 'test@example.com',
        passwordHash,
        role: UserRole.USER,
        emailVerified: true,
      },
    });

    userId = user.id;

    const loginResponse = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'test@example.com',
        password: 'Password123!',
      });

    accessToken = loginResponse.body.accessToken;
  });

  describe('POST /api/auth/2fa/enable', () => {
    it('should initiate 2FA setup successfully', async () => {
      const response = await request(app)
        .post('/api/auth/2fa/enable')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(response.status).toBe(200);
      expect(response.body.secret).toBeDefined();
      expect(response.body.qrCode).toBeDefined();
      expect(response.body.message).toBe('Two-factor authentication initiated');
    });

    it('should fail without authentication', async () => {
      const response = await request(app)
        .post('/api/auth/2fa/enable');

      expect(response.status).toBe(401);
    });

    it('should fail if 2FA already enabled', async () => {
      await request(app)
        .post('/api/auth/2fa/enable')
        .set('Authorization', `Bearer ${accessToken}`);

      const user = await prisma.user.findUnique({ where: { id: userId } });
      const code = speakeasy.totp({
        secret: user!.twoFactorSecret!,
        encoding: 'base32',
      });

      await request(app)
        .post('/api/auth/2fa/verify')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ code });

      const response = await request(app)
        .post('/api/auth/2fa/enable')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Two-factor authentication already enabled');
    });
  });

  describe('POST /api/auth/2fa/verify', () => {
    let secret: string;

    beforeEach(async () => {
      const setupResponse = await request(app)
        .post('/api/auth/2fa/enable')
        .set('Authorization', `Bearer ${accessToken}`);

      secret = setupResponse.body.secret;
    });

    it('should verify and enable 2FA successfully', async () => {
      const code = speakeasy.totp({
        secret,
        encoding: 'base32',
      });

      const response = await request(app)
        .post('/api/auth/2fa/verify')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ code });

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Two-factor authentication enabled successfully');

      const user = await prisma.user.findUnique({ where: { id: userId } });
      expect(user?.twoFactorEnabled).toBe(true);
    });

    it('should fail with invalid code', async () => {
      const response = await request(app)
        .post('/api/auth/2fa/verify')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ code: '000000' });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Invalid two-factor code');
    });

    it('should fail with malformed code', async () => {
      const response = await request(app)
        .post('/api/auth/2fa/verify')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ code: '123' });

      expect(response.status).toBe(400);
    });
  });

  describe('POST /api/auth/login with 2FA', () => {
    let secret: string;

    beforeEach(async () => {
      const setupResponse = await request(app)
        .post('/api/auth/2fa/enable')
        .set('Authorization', `Bearer ${accessToken}`);

      secret = setupResponse.body.secret;

      const code = speakeasy.totp({
        secret,
        encoding: 'base32',
      });

      await request(app)
        .post('/api/auth/2fa/verify')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ code });
    });

    it('should require 2FA code when logging in', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
          password: 'Password123!',
        });

      expect(response.status).toBe(401);
      expect(response.body.error).toBe('Two-factor code required');
    });

    it('should login successfully with valid 2FA code', async () => {
      const code = speakeasy.totp({
        secret,
        encoding: 'base32',
      });

      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
          password: 'Password123!',
          twoFactorCode: code,
        });

      expect(response.status).toBe(200);
      expect(response.body.accessToken).toBeDefined();
    });

    it('should fail login with invalid 2FA code', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
          password: 'Password123!',
          twoFactorCode: '000000',
        });

      expect(response.status).toBe(401);
      expect(response.body.error).toBe('Invalid two-factor code');
    });
  });

  describe('POST /api/auth/2fa/disable', () => {
    beforeEach(async () => {
      const setupResponse = await request(app)
        .post('/api/auth/2fa/enable')
        .set('Authorization', `Bearer ${accessToken}`);

      const secret = setupResponse.body.secret;

      const code = speakeasy.totp({
        secret,
        encoding: 'base32',
      });

      await request(app)
        .post('/api/auth/2fa/verify')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ code });
    });

    it('should disable 2FA successfully', async () => {
      const response = await request(app)
        .post('/api/auth/2fa/disable')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Two-factor authentication disabled successfully');

      const user = await prisma.user.findUnique({ where: { id: userId } });
      expect(user?.twoFactorEnabled).toBe(false);
      expect(user?.twoFactorSecret).toBeNull();
    });

    it('should fail without authentication', async () => {
      const response = await request(app)
        .post('/api/auth/2fa/disable');

      expect(response.status).toBe(401);
    });
  });
});
