import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { createValidationMiddleware } from '../../plugins/validation.js';
import { requireAuth } from '../../plugins/jwt-auth.js';

const LoginSchema = z.object({
  email: z.string().email().min(1).max(255),
  password: z.string().min(1).max(255)
});

const RegisterSchema = z.object({
  email: z.string().email().min(1).max(255),
  password: z.string().min(8).max(255).regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, 'Password must contain at least one uppercase letter, one lowercase letter, and one number'),
  role: z.enum(['user', 'admin']).default('user')
});

const RefreshTokenSchema = z.object({
  refreshToken: z.string().min(1)
});

export const authRoutes: FastifyPluginAsync = async (app) => {
  // Login endpoint
  app.post(
    '/api/auth/login',
    {
      preHandler: createValidationMiddleware({ body: LoginSchema }),
      config: {
        rateLimit: {
          points: app.config.security.maxFailedLoginAttempts,
          duration: 900, // 15 minutes
          blockDuration: 900 // Block for 15 minutes after max attempts
        }
      }
    },
    async (request, reply) => {
      const { email, password } = request.validatedBody!;
      
      // Check if IP is locked due to failed attempts
      const clientIp = request.headers['x-forwarded-for'] as string || request.ip;
      if (await app.tokenManager.isIpLocked(clientIp)) {
        request.log.warn({ ip: clientIp, email }, 'Login attempt from locked IP');
        return reply.code(429).send({
          error: 'IP_LOCKED',
          message: 'Too many failed attempts. IP temporarily locked.',
          timestamp: new Date().toISOString()
        });
      }

      try {
        // Find user in database
        const user = await app.prisma.user.findUnique({
          where: { email }
        });

        if (!user) {
          await app.tokenManager.recordFailedLogin(clientIp);
          request.log.warn({ email, ip: clientIp }, 'Login attempt with non-existent email');
          return reply.code(401).send({
            error: 'INVALID_CREDENTIALS',
            message: 'Invalid email or password',
            timestamp: new Date().toISOString()
          });
        }

        // Simple password validation (in production, use bcrypt)
        if (password !== 'password123' && password !== 'admin123') {
          await app.tokenManager.recordFailedLogin(clientIp);
          request.log.warn({ email, ip: clientIp }, 'Login attempt with invalid password');
          return reply.code(401).send({
            error: 'INVALID_CREDENTIALS',
            message: 'Invalid email or password',
            timestamp: new Date().toISOString()
          });
        }

        // Update last login
        await app.prisma.user.update({
          where: { id: user.id },
          data: { lastLoginAt: new Date() }
        });

        // Generate tokens
        const tokens = await app.tokenManager.generateTokens({
          userId: user.id,
          role: user.role,
          email: user.email || email
        });

        // Set secure cookies
        reply.setCookie('refreshToken', tokens.refreshToken, {
          httpOnly: true,
          secure: app.config.nodeEnv === 'production',
          sameSite: 'strict',
          maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
        });

        request.log.info({ userId: user.id, email }, 'User logged in successfully');

        return reply.code(200).send({
          message: 'Login successful',
          user: {
            id: user.id,
            email: user.email,
            role: user.role
          },
          accessToken: tokens.accessToken,
          expiresIn: app.config.jwt.accessExpiry
        });
      } catch (error) {
        request.log.error({ err: error, email }, 'Login error');
        return reply.code(500).send({
          error: 'LOGIN_ERROR',
          message: 'An error occurred during login',
          timestamp: new Date().toISOString()
        });
      }
    }
  );

  // Register endpoint
  app.post(
    '/api/auth/register',
    {
      preHandler: createValidationMiddleware({ body: RegisterSchema }),
      config: {
        rateLimit: {
          points: 5, // Very restrictive for registration
          duration: 3600, // 1 hour
          blockDuration: 3600
        }
      }
    },
    async (request, reply) => {
      const { email, password, role } = request.validatedBody!;
      
      try {
        // Check if user already exists
        const existingUser = await app.prisma.user.findUnique({
          where: { email }
        });

        if (existingUser) {
          return reply.code(409).send({
            error: 'USER_EXISTS',
            message: 'User with this email already exists',
            timestamp: new Date().toISOString()
          });
        }

        // Create user
        const user = await app.prisma.user.create({
          data: {
            email,
            role,
            createdAt: new Date(),
            lastLoginAt: new Date()
          }
        });

        // Generate tokens
        const tokens = await app.tokenManager.generateTokens({
          userId: user.id,
          role: user.role,
          email: user.email
        });

        // Set refresh token cookie
        reply.setCookie('refreshToken', tokens.refreshToken, {
          httpOnly: true,
          secure: app.config.nodeEnv === 'production',
          sameSite: 'strict',
          maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
        });

        request.log.info({ userId: user.id, email }, 'User registered successfully');

        return reply.code(201).send({
          message: 'Registration successful',
          user: {
            id: user.id,
            email: user.email,
            role: user.role
          },
          accessToken: tokens.accessToken,
          expiresIn: app.config.jwt.accessExpiry
        });
      } catch (error) {
        request.log.error({ err: error, email }, 'Registration error');
        return reply.code(500).send({
          error: 'REGISTRATION_ERROR',
          message: 'An error occurred during registration',
          timestamp: new Date().toISOString()
        });
      }
    }
  );

  // Refresh token endpoint
  app.post(
    '/api/auth/refresh',
    {
      preHandler: createValidationMiddleware({ body: RefreshTokenSchema }),
      config: {
        rateLimit: {
          points: 10,
          duration: 60, // 1 minute
          blockDuration: 60
        }
      }
    },
    async (request, reply) => {
      const { refreshToken } = request.validatedBody!;
      
      try {
        // Check if refresh token cookie matches body (CSRF protection)
        const cookieToken = request.cookies?.refreshToken;
        if (!cookieToken || cookieToken !== refreshToken) {
          return reply.code(403).send({
            error: 'CSRF_TOKEN_MISMATCH',
            message: 'CSRF token validation failed',
            timestamp: new Date().toISOString()
          });
        }

        // Rotate tokens
        const tokens = await app.tokenManager.rotateTokens(refreshToken);
        
        // Set new refresh token cookie
        reply.setCookie('refreshToken', tokens.refreshToken, {
          httpOnly: true,
          secure: app.config.nodeEnv === 'production',
          sameSite: 'strict',
          maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
        });

        return reply.code(200).send({
          message: 'Token refreshed successfully',
          accessToken: tokens.accessToken,
          expiresIn: app.config.jwt.accessExpiry
        });
      } catch (error) {
        request.log.warn({ err: error }, 'Token refresh failed');
        
        // Clear invalid refresh token cookie
        reply.clearCookie('refreshToken');
        
        return reply.code(401).send({
          error: 'INVALID_REFRESH_TOKEN',
          message: 'Invalid or expired refresh token',
          timestamp: new Date().toISOString()
        });
      }
    }
  );

  // Logout endpoint
  app.post(
    '/api/auth/logout',
    {
      preHandler: requireAuth
    },
    async (request, reply) => {
      try {
        const authHeader = request.headers.authorization;
        const accessToken = authHeader?.substring(7);
        
        if (accessToken) {
          // Blacklist the current access token
          await app.tokenManager.blacklistToken(accessToken);
        }

        // Clear refresh token cookie
        reply.clearCookie('refreshToken');

        request.log.info({ userId: request.user!.userId }, 'User logged out successfully');

        return reply.code(200).send({
          message: 'Logout successful',
          timestamp: new Date().toISOString()
        });
      } catch (error) {
        request.log.error({ err: error }, 'Logout error');
        return reply.code(500).send({
          error: 'LOGOUT_ERROR',
          message: 'An error occurred during logout',
          timestamp: new Date().toISOString()
        });
      }
    }
  );

  // Get current user info
  app.get(
    '/api/auth/me',
    {
      preHandler: requireAuth
    },
    async (request, reply) => {
      try {
        const user = await app.prisma.user.findUnique({
          where: { id: request.user!.userId },
          select: {
            id: true,
            email: true,
            role: true,
            createdAt: true,
            lastLoginAt: true
          }
        });

        if (!user) {
          return reply.code(404).send({
            error: 'USER_NOT_FOUND',
            message: 'User not found',
            timestamp: new Date().toISOString()
          });
        }

        return reply.code(200).send({
          user,
          timestamp: new Date().toISOString()
        });
      } catch (error) {
        request.log.error({ err: error }, 'Get user info error');
        return reply.code(500).send({
          error: 'USER_INFO_ERROR',
          message: 'An error occurred while fetching user information',
          timestamp: new Date().toISOString()
        });
      }
    }
  );
};