import request from 'supertest';
import app from '../index';
import prisma from '../models/prisma';
import { hashPassword } from '../utils/crypto';
import { UserRole } from '@prisma/client';
import { generateAccessToken } from '../utils/jwt';

describe('Admin Endpoints', () => {
  let userToken: string;
  let adminToken: string;
  let superAdminToken: string;
  let userId: string;
  let adminId: string;
  let superAdminId: string;

  beforeAll(async () => {
    await prisma.$connect();

    const passwordHash = await hashPassword('Password123!');

    const user = await prisma.user.create({
      data: {
        email: 'user@example.com',
        passwordHash,
        role: UserRole.USER,
        emailVerified: true,
      },
    });

    const admin = await prisma.user.create({
      data: {
        email: 'admin@example.com',
        passwordHash,
        role: UserRole.ADMIN,
        emailVerified: true,
      },
    });

    const superAdmin = await prisma.user.create({
      data: {
        email: 'superadmin@example.com',
        passwordHash,
        role: UserRole.SUPERADMIN,
        emailVerified: true,
      },
    });

    userId = user.id;
    adminId = admin.id;
    superAdminId = superAdmin.id;

    userToken = generateAccessToken({
      userId: user.id,
      email: user.email,
      role: user.role,
    });

    adminToken = generateAccessToken({
      userId: admin.id,
      email: admin.email,
      role: admin.role,
    });

    superAdminToken = generateAccessToken({
      userId: superAdmin.id,
      email: superAdmin.email,
      role: superAdmin.role,
    });
  });

  afterAll(async () => {
    await prisma.session.deleteMany();
    await prisma.user.deleteMany();
    await prisma.$disconnect();
  });

  describe('GET /api/admin/users', () => {
    it('should allow ADMIN to view all users', async () => {
      const response = await request(app)
        .get('/api/admin/users')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.users).toBeDefined();
      expect(Array.isArray(response.body.users)).toBe(true);
      expect(response.body.users.length).toBeGreaterThanOrEqual(3);
    });

    it('should allow SUPERADMIN to view all users', async () => {
      const response = await request(app)
        .get('/api/admin/users')
        .set('Authorization', `Bearer ${superAdminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.users).toBeDefined();
    });

    it('should deny USER access to view users', async () => {
      const response = await request(app)
        .get('/api/admin/users')
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.status).toBe(403);
      expect(response.body.error).toBe('Insufficient permissions');
    });

    it('should deny unauthenticated access', async () => {
      const response = await request(app)
        .get('/api/admin/users');

      expect(response.status).toBe(401);
    });
  });

  describe('GET /api/admin/users/:id', () => {
    it('should allow ADMIN to view specific user', async () => {
      const response = await request(app)
        .get(`/api/admin/users/${userId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.user).toBeDefined();
      expect(response.body.user.id).toBe(userId);
    });

    it('should return 404 for non-existent user', async () => {
      const response = await request(app)
        .get('/api/admin/users/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(404);
    });
  });

  describe('PATCH /api/admin/users/:id/role', () => {
    it('should allow SUPERADMIN to update user role', async () => {
      const response = await request(app)
        .patch(`/api/admin/users/${userId}/role`)
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({ role: UserRole.ADMIN });

      expect(response.status).toBe(200);
      expect(response.body.user.role).toBe(UserRole.ADMIN);

      await prisma.user.update({
        where: { id: userId },
        data: { role: UserRole.USER },
      });
    });

    it('should deny ADMIN from updating roles', async () => {
      const response = await request(app)
        .patch(`/api/admin/users/${userId}/role`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ role: UserRole.ADMIN });

      expect(response.status).toBe(403);
    });

    it('should deny USER from updating roles', async () => {
      const response = await request(app)
        .patch(`/api/admin/users/${adminId}/role`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({ role: UserRole.SUPERADMIN });

      expect(response.status).toBe(403);
    });

    it('should reject invalid role', async () => {
      const response = await request(app)
        .patch(`/api/admin/users/${userId}/role`)
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({ role: 'INVALID_ROLE' });

      expect(response.status).toBe(400);
    });
  });

  describe('DELETE /api/admin/users/:id', () => {
    it('should allow SUPERADMIN to delete user', async () => {
      const passwordHash = await hashPassword('Password123!');
      const testUser = await prisma.user.create({
        data: {
          email: 'delete-test@example.com',
          passwordHash,
          role: UserRole.USER,
          emailVerified: true,
        },
      });

      const response = await request(app)
        .delete(`/api/admin/users/${testUser.id}`)
        .set('Authorization', `Bearer ${superAdminToken}`);

      expect(response.status).toBe(200);

      const deletedUser = await prisma.user.findUnique({
        where: { id: testUser.id },
      });

      expect(deletedUser).toBeNull();
    });

    it('should deny ADMIN from deleting users', async () => {
      const response = await request(app)
        .delete(`/api/admin/users/${userId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(403);
    });

    it('should deny USER from deleting users', async () => {
      const response = await request(app)
        .delete(`/api/admin/users/${adminId}`)
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.status).toBe(403);
    });

    it('should prevent deleting own account', async () => {
      const response = await request(app)
        .delete(`/api/admin/users/${superAdminId}`)
        .set('Authorization', `Bearer ${superAdminToken}`);

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Cannot delete your own account');
    });
  });

  describe('POST /api/admin/users/:id/unlock', () => {
    beforeEach(async () => {
      const lockedUntil = new Date();
      lockedUntil.setMinutes(lockedUntil.getMinutes() + 15);

      await prisma.user.update({
        where: { id: userId },
        data: {
          failedLoginAttempts: 5,
          lockedUntil,
        },
      });
    });

    it('should allow ADMIN to unlock user', async () => {
      const response = await request(app)
        .post(`/api/admin/users/${userId}/unlock`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);

      const user = await prisma.user.findUnique({ where: { id: userId } });
      expect(user?.failedLoginAttempts).toBe(0);
      expect(user?.lockedUntil).toBeNull();
    });

    it('should allow SUPERADMIN to unlock user', async () => {
      const response = await request(app)
        .post(`/api/admin/users/${userId}/unlock`)
        .set('Authorization', `Bearer ${superAdminToken}`);

      expect(response.status).toBe(200);
    });

    it('should deny USER from unlocking accounts', async () => {
      const response = await request(app)
        .post(`/api/admin/users/${adminId}/unlock`)
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.status).toBe(403);
    });
  });

  describe('GET /api/admin/users/:id/sessions', () => {
    beforeEach(async () => {
      await prisma.session.create({
        data: {
          userId,
          refreshToken: 'test-refresh-token',
          refreshTokenHash: 'test-hash',
          deviceInfo: 'Test Device',
          ipAddress: '127.0.0.1',
          userAgent: 'Test Agent',
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        },
      });
    });

    afterEach(async () => {
      await prisma.session.deleteMany({ where: { userId } });
    });

    it('should allow ADMIN to view user sessions', async () => {
      const response = await request(app)
        .get(`/api/admin/users/${userId}/sessions`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.sessions).toBeDefined();
      expect(Array.isArray(response.body.sessions)).toBe(true);
    });

    it('should deny USER from viewing sessions', async () => {
      const response = await request(app)
        .get(`/api/admin/users/${adminId}/sessions`)
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.status).toBe(403);
    });
  });

  describe('POST /api/admin/users/:id/sessions/revoke', () => {
    beforeEach(async () => {
      await prisma.session.create({
        data: {
          userId,
          refreshToken: 'test-refresh-token-2',
          refreshTokenHash: 'test-hash-2',
          deviceInfo: 'Test Device',
          ipAddress: '127.0.0.1',
          userAgent: 'Test Agent',
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        },
      });
    });

    afterEach(async () => {
      await prisma.session.deleteMany({ where: { userId } });
    });

    it('should allow ADMIN to revoke user sessions', async () => {
      const response = await request(app)
        .post(`/api/admin/users/${userId}/sessions/revoke`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);

      const sessions = await prisma.session.findMany({
        where: { userId, revoked: false },
      });

      expect(sessions.length).toBe(0);
    });

    it('should deny USER from revoking sessions', async () => {
      const response = await request(app)
        .post(`/api/admin/users/${adminId}/sessions/revoke`)
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.status).toBe(403);
    });
  });
});
