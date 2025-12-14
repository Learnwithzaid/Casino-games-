import { User, UserRole } from '@prisma/client';
import prisma from '../models/prisma';
import { hashPassword, verifyPassword, generateSecureToken, hashToken } from '../utils/crypto';
import { generateTokenPair, verifyRefreshToken } from '../utils/jwt';
import { config } from '../config';
import { DeviceInfo, TokenPair } from '../types';
import { emailService } from './email.service';
import speakeasy from 'speakeasy';

export class AuthService {
  async register(email: string, password: string): Promise<User> {
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      throw new Error('Email already registered');
    }

    const passwordHash = await hashPassword(password);

    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        role: UserRole.USER,
      },
    });

    const verificationToken = generateSecureToken();
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + config.security.emailVerificationExpiry);

    await prisma.emailVerificationToken.create({
      data: {
        userId: user.id,
        token: verificationToken,
        expiresAt,
      },
    });

    await emailService.sendVerificationEmail(email, verificationToken);

    return user;
  }

  async login(
    email: string,
    password: string,
    twoFactorCode: string | undefined,
    deviceInfo: DeviceInfo
  ): Promise<{ user: User; tokens: TokenPair }> {
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      throw new Error('Invalid credentials');
    }

    if (user.lockedUntil && user.lockedUntil > new Date()) {
      const remainingTime = Math.ceil((user.lockedUntil.getTime() - Date.now()) / 60000);
      throw new Error(`Account locked. Try again in ${remainingTime} minutes`);
    }

    if (user.lockedUntil && user.lockedUntil <= new Date()) {
      await prisma.user.update({
        where: { id: user.id },
        data: {
          failedLoginAttempts: 0,
          lockedUntil: null,
        },
      });
    }

    const isValidPassword = await verifyPassword(user.passwordHash, password);

    if (!isValidPassword) {
      const failedAttempts = user.failedLoginAttempts + 1;
      const shouldLock = failedAttempts >= config.security.maxLoginAttempts;

      const updateData: any = {
        failedLoginAttempts: failedAttempts,
      };

      if (shouldLock) {
        const lockedUntil = new Date();
        lockedUntil.setMinutes(lockedUntil.getMinutes() + config.security.lockoutDuration);
        updateData.lockedUntil = lockedUntil;

        await emailService.sendAccountLockedEmail(user.email, lockedUntil);
      }

      await prisma.user.update({
        where: { id: user.id },
        data: updateData,
      });

      throw new Error('Invalid credentials');
    }

    if (user.twoFactorEnabled) {
      if (!twoFactorCode) {
        throw new Error('Two-factor code required');
      }

      if (!user.twoFactorSecret) {
        throw new Error('Two-factor authentication not properly configured');
      }

      const verified = speakeasy.totp.verify({
        secret: user.twoFactorSecret,
        encoding: 'base32',
        token: twoFactorCode,
        window: 2,
      });

      if (!verified) {
        throw new Error('Invalid two-factor code');
      }
    }

    await prisma.user.update({
      where: { id: user.id },
      data: {
        failedLoginAttempts: 0,
        lockedUntil: null,
      },
    });

    const tokens = await this.createSession(user, deviceInfo);

    return { user, tokens };
  }

  async createSession(user: User, deviceInfo: DeviceInfo): Promise<TokenPair> {
    const refreshToken = generateSecureToken();
    const refreshTokenHash = await hashToken(refreshToken);

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    const session = await prisma.session.create({
      data: {
        userId: user.id,
        refreshToken,
        refreshTokenHash,
        deviceInfo: deviceInfo.deviceInfo,
        ipAddress: deviceInfo.ipAddress,
        userAgent: deviceInfo.userAgent,
        expiresAt,
      },
    });

    const tokenPair = generateTokenPair({
      userId: user.id,
      email: user.email,
      role: user.role,
      sessionId: session.id,
    });

    return tokenPair;
  }

  async refreshTokens(refreshToken: string): Promise<TokenPair> {
    let payload;
    try {
      payload = verifyRefreshToken(refreshToken);
    } catch (error) {
      throw new Error('Invalid refresh token');
    }

    const session = await prisma.session.findUnique({
      where: { refreshToken },
      include: { user: true },
    });

    if (!session || session.revoked || session.expiresAt < new Date()) {
      throw new Error('Invalid or expired refresh token');
    }

    await prisma.session.update({
      where: { id: session.id },
      data: { revoked: true, revokedAt: new Date() },
    });

    const newRefreshToken = generateSecureToken();
    const newRefreshTokenHash = await hashToken(newRefreshToken);

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    const newSession = await prisma.session.create({
      data: {
        userId: session.userId,
        refreshToken: newRefreshToken,
        refreshTokenHash: newRefreshTokenHash,
        deviceInfo: session.deviceInfo,
        ipAddress: session.ipAddress,
        userAgent: session.userAgent,
        expiresAt,
      },
    });

    const newTokenPair = generateTokenPair({
      userId: session.user.id,
      email: session.user.email,
      role: session.user.role,
      sessionId: newSession.id,
    });

    return newTokenPair;
  }

  async logout(refreshToken: string): Promise<void> {
    const session = await prisma.session.findUnique({
      where: { refreshToken },
    });

    if (session) {
      await prisma.session.update({
        where: { id: session.id },
        data: { revoked: true, revokedAt: new Date() },
      });
    }
  }

  async verifyEmail(token: string): Promise<void> {
    const verificationToken = await prisma.emailVerificationToken.findUnique({
      where: { token },
      include: { user: true },
    });

    if (!verificationToken) {
      throw new Error('Invalid verification token');
    }

    if (verificationToken.used) {
      throw new Error('Token already used');
    }

    if (verificationToken.expiresAt < new Date()) {
      throw new Error('Token expired');
    }

    await prisma.$transaction([
      prisma.emailVerificationToken.update({
        where: { id: verificationToken.id },
        data: { used: true, usedAt: new Date() },
      }),
      prisma.user.update({
        where: { id: verificationToken.userId },
        data: {
          emailVerified: true,
          emailVerifiedAt: new Date(),
        },
      }),
    ]);
  }

  async requestPasswordReset(email: string): Promise<void> {
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      return;
    }

    const resetToken = generateSecureToken();
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + config.security.passwordResetExpiry);

    await prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        token: resetToken,
        expiresAt,
      },
    });

    await emailService.sendPasswordResetEmail(email, resetToken);
  }

  async resetPassword(token: string, newPassword: string): Promise<void> {
    const resetToken = await prisma.passwordResetToken.findUnique({
      where: { token },
      include: { user: true },
    });

    if (!resetToken) {
      throw new Error('Invalid reset token');
    }

    if (resetToken.used) {
      throw new Error('Token already used');
    }

    if (resetToken.expiresAt < new Date()) {
      throw new Error('Token expired');
    }

    const passwordHash = await hashPassword(newPassword);

    await prisma.$transaction([
      prisma.passwordResetToken.update({
        where: { id: resetToken.id },
        data: { used: true, usedAt: new Date() },
      }),
      prisma.user.update({
        where: { id: resetToken.userId },
        data: { passwordHash },
      }),
      prisma.session.updateMany({
        where: { userId: resetToken.userId, revoked: false },
        data: { revoked: true, revokedAt: new Date() },
      }),
    ]);
  }

  async enable2FA(userId: string): Promise<{ secret: string; qrCode: string }> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new Error('User not found');
    }

    if (user.twoFactorEnabled) {
      throw new Error('Two-factor authentication already enabled');
    }

    const secret = speakeasy.generateSecret({
      name: `AuthApp (${user.email})`,
      length: 32,
    });

    await prisma.user.update({
      where: { id: userId },
      data: { twoFactorSecret: secret.base32 },
    });

    return {
      secret: secret.base32,
      qrCode: secret.otpauth_url || '',
    };
  }

  async verify2FA(userId: string, code: string): Promise<void> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new Error('User not found');
    }

    if (!user.twoFactorSecret) {
      throw new Error('Two-factor authentication not initialized');
    }

    const verified = speakeasy.totp.verify({
      secret: user.twoFactorSecret,
      encoding: 'base32',
      token: code,
      window: 2,
    });

    if (!verified) {
      throw new Error('Invalid two-factor code');
    }

    await prisma.user.update({
      where: { id: userId },
      data: { twoFactorEnabled: true },
    });

    await emailService.send2FAEnabledEmail(user.email);
  }

  async disable2FA(userId: string): Promise<void> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new Error('User not found');
    }

    if (!user.twoFactorEnabled) {
      throw new Error('Two-factor authentication not enabled');
    }

    await prisma.user.update({
      where: { id: userId },
      data: {
        twoFactorEnabled: false,
        twoFactorSecret: null,
      },
    });
  }
}

export const authService = new AuthService();
