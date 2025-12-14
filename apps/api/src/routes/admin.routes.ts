import { Router } from 'express';
import { adminController } from '../controllers/admin.controller';
import { authenticate } from '../middleware/auth.middleware';
import { requireRole, requirePermission } from '../middleware/rbac.middleware';
import { validateBody } from '../middleware/validation.middleware';
import { updateUserRoleSchema } from '../utils/validation';
import { UserRole } from '@prisma/client';

const router = Router();

router.get(
  '/users',
  authenticate,
  requirePermission('canViewUsers'),
  adminController.getUsers.bind(adminController)
);

router.get(
  '/users/:id',
  authenticate,
  requirePermission('canViewUsers'),
  adminController.getUser.bind(adminController)
);

router.patch(
  '/users/:id/role',
  authenticate,
  requirePermission('canManageRoles'),
  validateBody(updateUserRoleSchema),
  adminController.updateUserRole.bind(adminController)
);

router.delete(
  '/users/:id',
  authenticate,
  requirePermission('canDeleteUser'),
  adminController.deleteUser.bind(adminController)
);

router.post(
  '/users/:id/unlock',
  authenticate,
  requireRole(UserRole.ADMIN, UserRole.SUPERADMIN),
  adminController.unlockUser.bind(adminController)
);

router.get(
  '/users/:id/sessions',
  authenticate,
  requirePermission('canViewUsers'),
  adminController.getUserSessions.bind(adminController)
);

router.post(
  '/users/:id/sessions/revoke',
  authenticate,
  requireRole(UserRole.ADMIN, UserRole.SUPERADMIN),
  adminController.revokeUserSessions.bind(adminController)
);

export default router;
