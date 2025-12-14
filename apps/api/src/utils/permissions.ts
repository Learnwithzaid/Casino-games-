import { UserRole } from '@prisma/client';
import { UserPermissions } from '../types';

export function getPermissions(role: UserRole): UserPermissions {
  const permissions: UserPermissions = {
    canCreateUser: false,
    canUpdateUser: false,
    canDeleteUser: false,
    canViewUsers: false,
    canManageRoles: false,
  };

  switch (role) {
    case UserRole.SUPERADMIN:
      permissions.canCreateUser = true;
      permissions.canUpdateUser = true;
      permissions.canDeleteUser = true;
      permissions.canViewUsers = true;
      permissions.canManageRoles = true;
      break;
    case UserRole.ADMIN:
      permissions.canCreateUser = true;
      permissions.canUpdateUser = true;
      permissions.canDeleteUser = false;
      permissions.canViewUsers = true;
      permissions.canManageRoles = false;
      break;
    case UserRole.USER:
      break;
  }

  return permissions;
}

export function hasPermission(role: UserRole, permission: keyof UserPermissions): boolean {
  const permissions = getPermissions(role);
  return permissions[permission];
}
