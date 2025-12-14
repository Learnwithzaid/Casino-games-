import { describe, it, expect } from 'vitest';
import {
  hasPermission,
  hasRole,
  canViewSection,
  canEditSection,
  Permission,
} from '../rbac';
import type { AdminUser } from '@/types';

const adminUser: AdminUser = {
  id: '1',
  email: 'admin@example.com',
  role: 'Admin',
  createdAt: new Date(),
};

const superAdminUser: AdminUser = {
  id: '2',
  email: 'superadmin@example.com',
  role: 'SuperAdmin',
  createdAt: new Date(),
};

describe('RBAC Utilities', () => {
  describe('hasPermission', () => {
    it('should return true for admin with read permissions', () => {
      expect(hasPermission(adminUser, Permission.READ_GAMES)).toBe(true);
    });

    it('should return false for admin without delete permissions', () => {
      expect(hasPermission(adminUser, Permission.DELETE_GAMES)).toBe(false);
    });

    it('should return true for superadmin with any permission', () => {
      expect(hasPermission(superAdminUser, Permission.DELETE_GAMES)).toBe(true);
      expect(hasPermission(superAdminUser, Permission.MANAGE_SETTINGS)).toBe(true);
    });

    it('should return false for null user', () => {
      expect(hasPermission(null, Permission.READ_GAMES)).toBe(false);
    });
  });

  describe('hasRole', () => {
    it('should return true for matching role', () => {
      expect(hasRole(adminUser, 'Admin')).toBe(true);
      expect(hasRole(superAdminUser, 'SuperAdmin')).toBe(true);
    });

    it('should return false for non-matching role', () => {
      expect(hasRole(adminUser, 'SuperAdmin')).toBe(false);
      expect(hasRole(superAdminUser, 'Admin')).toBe(false);
    });

    it('should return false for null user', () => {
      expect(hasRole(null, 'Admin')).toBe(false);
    });
  });

  describe('canViewSection', () => {
    it('should allow admin to view games', () => {
      expect(canViewSection(adminUser, 'games')).toBe(true);
    });

    it('should allow admin to view users', () => {
      expect(canViewSection(adminUser, 'users')).toBe(true);
    });

    it('should deny admin to manage settings', () => {
      expect(canViewSection(adminUser, 'settings')).toBe(false);
    });

    it('should allow superadmin to view all sections', () => {
      expect(canViewSection(superAdminUser, 'games')).toBe(true);
      expect(canViewSection(superAdminUser, 'settings')).toBe(true);
    });
  });

  describe('canEditSection', () => {
    it('should allow admin to edit games', () => {
      expect(canEditSection(adminUser, 'games')).toBe(true);
    });

    it('should deny admin to edit settings', () => {
      expect(canEditSection(adminUser, 'settings')).toBe(false);
    });

    it('should allow superadmin to edit all sections', () => {
      expect(canEditSection(superAdminUser, 'games')).toBe(true);
      expect(canEditSection(superAdminUser, 'settings')).toBe(true);
    });
  });
});
