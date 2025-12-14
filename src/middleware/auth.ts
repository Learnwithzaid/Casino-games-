import { Request, Response, NextFunction } from 'express';
import { AuthUser } from '../types';
import { AppError } from '../utils/errors';

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

export const authenticate = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const userId = req.headers['x-user-id'] as string;
  const userRole = (req.headers['x-user-role'] as string) || 'user';

  if (!userId) {
    throw new AppError(401, 'Authentication required');
  }

  req.user = {
    userId,
    role: userRole as 'user' | 'admin',
  };

  next();
};

export const requireAdmin = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  if (!req.user || req.user.role !== 'admin') {
    throw new AppError(403, 'Admin access required');
  }
  next();
};
