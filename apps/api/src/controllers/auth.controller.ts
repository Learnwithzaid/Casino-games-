import { Request, Response } from 'express';
import { authService } from '../services/auth.service';
import { AuthenticatedRequest, DeviceInfo } from '../types';
import { config } from '../config';

export class AuthController {
  async register(req: Request, res: Response): Promise<void> {
    try {
      const { email, password } = req.body;

      const user = await authService.register(email, password);

      res.status(201).json({
        message: 'Registration successful. Please check your email to verify your account.',
        user: {
          id: user.id,
          email: user.email,
          role: user.role,
          emailVerified: user.emailVerified,
        },
      });
    } catch (error: any) {
      if (error.message === 'Email already registered') {
        res.status(409).json({ error: error.message });
        return;
      }
      res.status(500).json({ error: 'Registration failed' });
    }
  }

  async login(req: Request, res: Response): Promise<void> {
    try {
      const { email, password, twoFactorCode } = req.body;

      const deviceInfo: DeviceInfo = {
        ipAddress: req.ip || req.socket.remoteAddress,
        userAgent: req.headers['user-agent'],
        deviceInfo: `${req.headers['user-agent']}`,
      };

      const { user, tokens } = await authService.login(
        email,
        password,
        twoFactorCode,
        deviceInfo
      );

      res.cookie('refreshToken', tokens.refreshToken, config.cookie);

      res.status(200).json({
        message: 'Login successful',
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        user: {
          id: user.id,
          email: user.email,
          role: user.role,
          emailVerified: user.emailVerified,
          twoFactorEnabled: user.twoFactorEnabled,
        },
      });
    } catch (error: any) {
      if (
        error.message === 'Invalid credentials' ||
        error.message === 'Two-factor code required' ||
        error.message === 'Invalid two-factor code'
      ) {
        res.status(401).json({ error: error.message });
        return;
      }

      if (error.message.includes('Account locked')) {
        res.status(423).json({ error: error.message });
        return;
      }

      res.status(500).json({ error: 'Login failed' });
    }
  }

  async refresh(req: Request, res: Response): Promise<void> {
    try {
      const refreshToken = req.body.refreshToken || req.cookies.refreshToken;

      if (!refreshToken) {
        res.status(401).json({ error: 'Refresh token required' });
        return;
      }

      const tokens = await authService.refreshTokens(refreshToken);

      res.cookie('refreshToken', tokens.refreshToken, config.cookie);

      res.status(200).json({
        message: 'Tokens refreshed successfully',
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
      });
    } catch (error: any) {
      res.status(401).json({ error: error.message || 'Token refresh failed' });
    }
  }

  async logout(req: Request, res: Response): Promise<void> {
    try {
      const refreshToken = req.body.refreshToken || req.cookies.refreshToken;

      if (refreshToken) {
        await authService.logout(refreshToken);
      }

      res.clearCookie('refreshToken');

      res.status(200).json({ message: 'Logout successful' });
    } catch (error: any) {
      res.status(500).json({ error: 'Logout failed' });
    }
  }

  async verifyEmail(req: Request, res: Response): Promise<void> {
    try {
      const { token } = req.body;

      await authService.verifyEmail(token);

      res.status(200).json({ message: 'Email verified successfully' });
    } catch (error: any) {
      if (
        error.message === 'Invalid verification token' ||
        error.message === 'Token already used' ||
        error.message === 'Token expired'
      ) {
        res.status(400).json({ error: error.message });
        return;
      }
      res.status(500).json({ error: 'Email verification failed' });
    }
  }

  async requestReset(req: Request, res: Response): Promise<void> {
    try {
      const { email } = req.body;

      await authService.requestPasswordReset(email);

      res.status(200).json({
        message: 'If an account with that email exists, a password reset link has been sent.',
      });
    } catch (error: any) {
      res.status(500).json({ error: 'Password reset request failed' });
    }
  }

  async resetPassword(req: Request, res: Response): Promise<void> {
    try {
      const { token, password } = req.body;

      await authService.resetPassword(token, password);

      res.status(200).json({ message: 'Password reset successfully' });
    } catch (error: any) {
      if (
        error.message === 'Invalid reset token' ||
        error.message === 'Token already used' ||
        error.message === 'Token expired'
      ) {
        res.status(400).json({ error: error.message });
        return;
      }
      res.status(500).json({ error: 'Password reset failed' });
    }
  }

  async enable2FA(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Authentication required' });
        return;
      }

      const { secret, qrCode } = await authService.enable2FA(req.user.userId);

      res.status(200).json({
        message: 'Two-factor authentication initiated',
        secret,
        qrCode,
      });
    } catch (error: any) {
      if (error.message === 'Two-factor authentication already enabled') {
        res.status(400).json({ error: error.message });
        return;
      }
      res.status(500).json({ error: '2FA setup failed' });
    }
  }

  async verify2FA(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Authentication required' });
        return;
      }

      const { code } = req.body;

      await authService.verify2FA(req.user.userId, code);

      res.status(200).json({ message: 'Two-factor authentication enabled successfully' });
    } catch (error: any) {
      if (
        error.message === 'Invalid two-factor code' ||
        error.message === 'Two-factor authentication not initialized'
      ) {
        res.status(400).json({ error: error.message });
        return;
      }
      res.status(500).json({ error: '2FA verification failed' });
    }
  }

  async disable2FA(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Authentication required' });
        return;
      }

      await authService.disable2FA(req.user.userId);

      res.status(200).json({ message: 'Two-factor authentication disabled successfully' });
    } catch (error: any) {
      if (error.message === 'Two-factor authentication not enabled') {
        res.status(400).json({ error: error.message });
        return;
      }
      res.status(500).json({ error: '2FA disable failed' });
    }
  }
}

export const authController = new AuthController();
