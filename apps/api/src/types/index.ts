import { Request } from 'express';
import { UserRole } from '@prisma/client';

export interface JWTPayload {
  userId: string;
  email: string;
  role: UserRole;
  sessionId?: string;
}

export interface AuthenticatedRequest extends Request {
  user?: JWTPayload;
}

export interface DeviceInfo {
  userAgent?: string;
  ipAddress?: string;
  deviceInfo?: string;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

export interface UserPermissions {
  canCreateUser: boolean;
  canUpdateUser: boolean;
  canDeleteUser: boolean;
  canViewUsers: boolean;
  canManageRoles: boolean;
}
