import type { AdminUser } from '@/types';

export enum Permission {
  READ_GAMES = 'read:games',
  WRITE_GAMES = 'write:games',
  DELETE_GAMES = 'delete:games',
  READ_USERS = 'read:users',
  WRITE_USERS = 'write:users',
  READ_TRANSACTIONS = 'read:transactions',
  WRITE_TRANSACTIONS = 'write:transactions',
  READ_AUDIT_LOGS = 'read:audit_logs',
  MANAGE_SETTINGS = 'manage:settings',
  MANAGE_ADMINS = 'manage:admins',
}

const rolePermissions: Record<string, Permission[]> = {
  Admin: [
    Permission.READ_GAMES,
    Permission.WRITE_GAMES,
    Permission.READ_USERS,
    Permission.READ_TRANSACTIONS,
    Permission.READ_AUDIT_LOGS,
  ],
  SuperAdmin: [
    Permission.READ_GAMES,
    Permission.WRITE_GAMES,
    Permission.DELETE_GAMES,
    Permission.READ_USERS,
    Permission.WRITE_USERS,
    Permission.READ_TRANSACTIONS,
    Permission.WRITE_TRANSACTIONS,
    Permission.READ_AUDIT_LOGS,
    Permission.MANAGE_SETTINGS,
    Permission.MANAGE_ADMINS,
  ],
};

export function hasPermission(user: AdminUser | null, permission: Permission): boolean {
  if (!user) return false;
  const permissions = rolePermissions[user.role] || [];
  return permissions.includes(permission);
}

export function hasRole(user: AdminUser | null, role: 'Admin' | 'SuperAdmin'): boolean {
  if (!user) return false;
  return user.role === role;
}

export function requirePermission(user: AdminUser | null, permission: Permission): boolean {
  if (!hasPermission(user, permission)) {
    throw new Error(`User does not have permission: ${permission}`);
  }
  return true;
}

export function canViewSection(user: AdminUser | null, section: string): boolean {
  if (!user) return false;

  const sectionPermissions: Record<string, Permission[]> = {
    games: [Permission.READ_GAMES],
    users: [Permission.READ_USERS],
    transactions: [Permission.READ_TRANSACTIONS],
    auditLogs: [Permission.READ_AUDIT_LOGS],
    settings: [Permission.MANAGE_SETTINGS],
  };

  const required = sectionPermissions[section] || [];
  return required.some((perm) => hasPermission(user, perm));
}

export function canEditSection(user: AdminUser | null, section: string): boolean {
  if (!user) return false;

  const sectionPermissions: Record<string, Permission[]> = {
    games: [Permission.WRITE_GAMES],
    users: [Permission.WRITE_USERS],
    transactions: [Permission.WRITE_TRANSACTIONS],
    settings: [Permission.MANAGE_SETTINGS],
  };

  const required = sectionPermissions[section] || [];
  return required.some((perm) => hasPermission(user, perm));
}
