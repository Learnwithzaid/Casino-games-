import 'reflect-metadata';
import express from 'express';
import { UserController } from './controllers/UserController';
import { GameController } from './controllers/GameController';
import { AdminController } from './controllers/AdminController';
import { authenticate, requireAdmin } from './middleware/auth';
import { errorHandler, asyncHandler } from './middleware/errorHandler';

export const createApp = () => {
  const app = express();

  app.use(express.json());

  const userController = new UserController();
  const gameController = new GameController();
  const adminController = new AdminController();

  app.get('/health', (req, res) => {
    res.json({ status: 'ok' });
  });

  app.get(
    '/api/user/balance',
    authenticate,
    asyncHandler((req, res) => userController.getBalance(req, res))
  );

  app.post(
    '/api/user/deposit',
    authenticate,
    asyncHandler((req, res) => userController.deposit(req, res))
  );

  app.post(
    '/api/user/withdrawal',
    authenticate,
    asyncHandler((req, res) => userController.withdrawal(req, res))
  );

  app.post(
    '/api/game/bet',
    authenticate,
    asyncHandler((req, res) => gameController.placeBet(req, res))
  );

  app.post(
    '/api/game/win',
    authenticate,
    asyncHandler((req, res) => gameController.creditWin(req, res))
  );

  app.get(
    '/api/game/history',
    authenticate,
    asyncHandler((req, res) => gameController.getHistory(req, res))
  );

  app.get(
    '/api/admin/transactions',
    authenticate,
    requireAdmin,
    asyncHandler((req, res) => adminController.getTransactions(req, res))
  );

  app.get(
    '/api/admin/user/:userId/balance',
    authenticate,
    requireAdmin,
    asyncHandler((req, res) => adminController.getUserBalance(req, res))
  );

  app.post(
    '/api/admin/adjustment',
    authenticate,
    requireAdmin,
    asyncHandler((req, res) => adminController.makeAdjustment(req, res))
  );

  app.post(
    '/api/admin/settings',
    authenticate,
    requireAdmin,
    asyncHandler((req, res) => adminController.updateSettings(req, res))
  );

  app.use(errorHandler);

  return app;
};
