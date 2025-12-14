import request from 'supertest';
import app from '../index';
import prisma from '../models/prisma';
import { hashPassword } from '../utils/crypto';
import { UserRole } from '@prisma/client';
import { generateAccessToken } from '../utils/jwt';

describe('RBAC Middleware', () => {
  let userToken: string;
  let adminToken: string;
  let superAdminToken: string;

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

  describe('Role-based access control', () => {
    it('should allow USER to access 2FA endpoints', async () => {
      const response = await request(app)
        .post('/api/auth/2fa/enable')
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.status).not.toBe(403);
    });

    it('should allow ADMIN to access 2FA endpoints', async () => {
      const response = await request(app)
        .post('/api/auth/2fa/enable')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).not.toBe(403);
    });

    it('should allow SUPERADMIN to access 2FA endpoints', async () => {
      const response = await request(app)
        .post('/api/auth/2fa/enable')
        .set('Authorization', `Bearer ${superAdminToken}`);

      expect(response.status).not.toBe(403);
    });

    it('should deny access without token', async () => {
      const response = await request(app)
        .post('/api/auth/2fa/enable');

      expect(response.status).toBe(401);
      expect(response.body.error).toBe('No token provided');
    });

    it('should deny access with invalid token', async () => {
      const response = await request(app)
        .post('/api/auth/2fa/enable')
        .set('Authorization', 'Bearer invalid-token');

      expect(response.status).toBe(401);
      expect(response.body.error).toBe('Invalid or expired token');
    });
  });

  describe('Permission-based access control', () => {
    it('should correctly identify USER permissions', async () => {
      const { getPermissions } = await import('../utils/permissions');
      const permissions = getPermissions(UserRole.USER);

      expect(permissions.canCreateUser).toBe(false);
      expect(permissions.canUpdateUser).toBe(false);
      expect(permissions.canDeleteUser).toBe(false);
      expect(permissions.canViewUsers).toBe(false);
      expect(permissions.canManageRoles).toBe(false);
    });

    it('should correctly identify ADMIN permissions', async () => {
      const { getPermissions } = await import('../utils/permissions');
      const permissions = getPermissions(UserRole.ADMIN);

      expect(permissions.canCreateUser).toBe(true);
      expect(permissions.canUpdateUser).toBe(true);
      expect(permissions.canDeleteUser).toBe(false);
      expect(permissions.canViewUsers).toBe(true);
      expect(permissions.canManageRoles).toBe(false);
    });

    it('should correctly identify SUPERADMIN permissions', async () => {
      const { getPermissions } = await import('../utils/permissions');
      const permissions = getPermissions(UserRole.SUPERADMIN);

      expect(permissions.canCreateUser).toBe(true);
      expect(permissions.canUpdateUser).toBe(true);
      expect(permissions.canDeleteUser).toBe(true);
      expect(permissions.canViewUsers).toBe(true);
      expect(permissions.canManageRoles).toBe(true);
    });

    it('should correctly check specific permissions', async () => {
      const { hasPermission } = await import('../utils/permissions');

      expect(hasPermission(UserRole.USER, 'canCreateUser')).toBe(false);
      expect(hasPermission(UserRole.ADMIN, 'canCreateUser')).toBe(true);
      expect(hasPermission(UserRole.ADMIN, 'canDeleteUser')).toBe(false);
      expect(hasPermission(UserRole.SUPERADMIN, 'canDeleteUser')).toBe(true);
    });
  });
});
