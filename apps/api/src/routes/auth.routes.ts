import { Router } from 'express';
import { authController } from '../controllers/auth.controller';
import { authenticate } from '../middleware/auth.middleware';
import { validateBody } from '../middleware/validation.middleware';
import { authLimiter } from '../middleware/rate-limit.middleware';
import {
  registerSchema,
  loginSchema,
  verifyEmailSchema,
  requestResetSchema,
  resetPasswordSchema,
  verify2FASchema,
} from '../utils/validation';

const router = Router();

router.post(
  '/register',
  authLimiter,
  validateBody(registerSchema),
  authController.register.bind(authController)
);

router.post(
  '/login',
  authLimiter,
  validateBody(loginSchema),
  authController.login.bind(authController)
);

router.get(
  '/refresh',
  authLimiter,
  authController.refresh.bind(authController)
);

router.post(
  '/logout',
  authController.logout.bind(authController)
);

router.post(
  '/verify-email',
  authLimiter,
  validateBody(verifyEmailSchema),
  authController.verifyEmail.bind(authController)
);

router.post(
  '/request-reset',
  authLimiter,
  validateBody(requestResetSchema),
  authController.requestReset.bind(authController)
);

router.post(
  '/reset-password',
  authLimiter,
  validateBody(resetPasswordSchema),
  authController.resetPassword.bind(authController)
);

router.post(
  '/2fa/enable',
  authenticate,
  authController.enable2FA.bind(authController)
);

router.post(
  '/2fa/verify',
  authenticate,
  validateBody(verify2FASchema),
  authController.verify2FA.bind(authController)
);

router.post(
  '/2fa/disable',
  authenticate,
  authController.disable2FA.bind(authController)
);

export default router;
