import { Response } from 'express';
import { AuthenticatedRequest } from '../types';
import prisma from '../models/prisma';
import { UserRole } from '@prisma/client';

export class AdminController {
  async getUsers(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const users = await prisma.user.findMany({
        select: {
          id: true,
          email: true,
          role: true,
          emailVerified: true,
          twoFactorEnabled: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      res.status(200).json({ users });
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch users' });
    }
  }

  async getUser(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      const user = await prisma.user.findUnique({
        where: { id },
        select: {
          id: true,
          email: true,
          role: true,
          emailVerified: true,
          emailVerifiedAt: true,
          twoFactorEnabled: true,
          failedLoginAttempts: true,
          lockedUntil: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      if (!user) {
        res.status(404).json({ error: 'User not found' });
        return;
      }

      res.status(200).json({ user });
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch user' });
    }
  }

  async updateUserRole(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { role } = req.body;

      if (!Object.values(UserRole).includes(role)) {
        res.status(400).json({ error: 'Invalid role' });
        return;
      }

      const user = await prisma.user.findUnique({ where: { id } });

      if (!user) {
        res.status(404).json({ error: 'User not found' });
        return;
      }

      const updatedUser = await prisma.user.update({
        where: { id },
        data: { role },
        select: {
          id: true,
          email: true,
          role: true,
          emailVerified: true,
          twoFactorEnabled: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      res.status(200).json({ 
        message: 'User role updated successfully',
        user: updatedUser 
      });
    } catch (error) {
      res.status(500).json({ error: 'Failed to update user role' });
    }
  }

  async deleteUser(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      if (req.user?.userId === id) {
        res.status(400).json({ error: 'Cannot delete your own account' });
        return;
      }

      const user = await prisma.user.findUnique({ where: { id } });

      if (!user) {
        res.status(404).json({ error: 'User not found' });
        return;
      }

      await prisma.user.delete({ where: { id } });

      res.status(200).json({ message: 'User deleted successfully' });
    } catch (error) {
      res.status(500).json({ error: 'Failed to delete user' });
    }
  }

  async unlockUser(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      const user = await prisma.user.findUnique({ where: { id } });

      if (!user) {
        res.status(404).json({ error: 'User not found' });
        return;
      }

      await prisma.user.update({
        where: { id },
        data: {
          failedLoginAttempts: 0,
          lockedUntil: null,
        },
      });

      res.status(200).json({ message: 'User unlocked successfully' });
    } catch (error) {
      res.status(500).json({ error: 'Failed to unlock user' });
    }
  }

  async getUserSessions(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      const user = await prisma.user.findUnique({ where: { id } });

      if (!user) {
        res.status(404).json({ error: 'User not found' });
        return;
      }

      const sessions = await prisma.session.findMany({
        where: { userId: id },
        select: {
          id: true,
          deviceInfo: true,
          ipAddress: true,
          userAgent: true,
          revoked: true,
          revokedAt: true,
          expiresAt: true,
          createdAt: true,
        },
        orderBy: { createdAt: 'desc' },
      });

      res.status(200).json({ sessions });
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch user sessions' });
    }
  }

  async revokeUserSessions(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      const user = await prisma.user.findUnique({ where: { id } });

      if (!user) {
        res.status(404).json({ error: 'User not found' });
        return;
      }

      await prisma.session.updateMany({
        where: { userId: id, revoked: false },
        data: { revoked: true, revokedAt: new Date() },
      });

      res.status(200).json({ message: 'All user sessions revoked successfully' });
    } catch (error) {
      res.status(500).json({ error: 'Failed to revoke user sessions' });
    }
  }
}

export const adminController = new AdminController();
