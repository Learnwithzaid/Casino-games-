import type { FastifyPluginAsync, FastifyReply, FastifyRequest } from 'fastify';
import fastifyJwt from '@fastify/jwt';
import { PrismaClient } from '@prisma/client';
import Redis from 'ioredis';

declare module 'fastify' {
  interface FastifyRequest {
    user?: {
      userId: string;
      role: 'user' | 'admin';
      email?: string;
      iat?: number;
      exp?: number;
    };
    jwt?: {
      verify: (token: string) => any;
      sign: (payload: any, options?: any) => string;
    };
  }
}

export interface TokenPayload {
  userId: string;
  role: 'user' | 'admin';
  email?: string;
  type: 'access' | 'refresh';
  sessionId: string;
}

export class JwtTokenManager {
  private redis?: Redis;
  private failedAttempts = new Map<string, { count: number; lockedUntil?: number }>();
  private tokenBlacklist = new Set<string>();

  constructor(
    private config: {
      secret: string;
      accessExpiry: string;
      refreshExpiry: string;
      issuer: string;
      maxFailedAttempts: number;
      lockoutDurationMinutes: number;
      redisUrl?: string;
    }
  ) {
    if (config.redisUrl) {
      this.redis = new Redis(config.redisUrl);
    }
  }

  async generateTokens(payload: Omit<TokenPayload, 'type'>) {
    const sessionId = this.generateSessionId();
    
    const accessToken = await this.signToken({
      ...payload,
      type: 'access',
      sessionId
    });

    const refreshToken = await this.signToken({
      ...payload,
      type: 'refresh',
      sessionId
    });

    // Store session in Redis if available
    if (this.redis) {
      await this.redis.setex(`session:${sessionId}`, 7 * 24 * 60 * 60, JSON.stringify({
        userId: payload.userId,
        role: payload.role,
        email: payload.email,
        createdAt: new Date().toISOString()
      }));
    }

    return { accessToken, refreshToken, sessionId };
  }

  async verifyToken(token: string): Promise<TokenPayload | null> {
    try {
      const decoded = await this.jwtVerify(token) as TokenPayload;
      
      // Check if token is blacklisted
      if (this.tokenBlacklist.has(token)) {
        return null;
      }

      // Check session validity if Redis is available
      if (this.redis && decoded.sessionId) {
        const session = await this.redis.get(`session:${decoded.sessionId}`);
        if (!session) {
          return null; // Session expired or invalid
        }
      }

      return decoded;
    } catch (error) {
      return null;
    }
  }

  async blacklistToken(token: string) {
    this.tokenBlacklist.add(token);
    
    // Also store in Redis with TTL for distributed blacklisting
    if (this.redis) {
      const decoded = await this.jwtVerify(token) as any;
      if (decoded?.exp) {
        const ttl = decoded.exp - Math.floor(Date.now() / 1000);
        if (ttl > 0) {
          await this.redis.setex(`blacklist:${token}`, ttl, '1');
        }
      }
    }
  }

  async rotateTokens(refreshToken: string) {
    const payload = await this.verifyToken(refreshToken);
    if (!payload || payload.type !== 'refresh') {
      throw new Error('Invalid refresh token');
    }

    // Invalidate old session
    if (this.redis) {
      await this.redis.del(`session:${payload.sessionId}`);
    }

    // Generate new tokens
    return this.generateTokens({
      userId: payload.userId,
      role: payload.role,
      email: payload.email
    });
  }

  async recordFailedLogin(ip: string) {
    const key = `failed:${ip}`;
    
    if (this.redis) {
      const current = await this.redis.get(key);
      const count = current ? parseInt(current) : 0;
      
      if (count >= this.config.maxFailedAttempts - 1) {
        // Lock the IP
        await this.redis.setex(key, this.config.lockoutDurationMinutes * 60, (count + 1).toString());
        return true; // Locked
      } else {
        await this.redis.setex(key, 60 * 60, (count + 1).toString());
        return false;
      }
    } else {
      // Memory-based fallback
      const current = this.failedAttempts.get(ip) || { count: 0 };
      
      if (current.count >= this.config.maxFailedAttempts - 1) {
        current.lockedUntil = Date.now() + (this.config.lockoutDurationMinutes * 60 * 1000);
        current.count++;
        this.failedAttempts.set(ip, current);
        return true;
      } else {
        current.count++;
        this.failedAttempts.set(ip, current);
        return false;
      }
    }
  }

  async isIpLocked(ip: string): Promise<boolean> {
    if (this.redis) {
      const current = await this.redis.get(`failed:${ip}`);
      return current ? parseInt(current) >= this.config.maxFailedAttempts : false;
    } else {
      const current = this.failedAttempts.get(ip);
      if (!current) return false;
      
      if (current.lockedUntil && current.lockedUntil > Date.now()) {
        return true;
      } else {
        // Unlock if time has passed
        this.failedAttempts.delete(ip);
        return false;
      }
    }
  }

  private async jwtVerify(token: string) {
    const { jwtVerify, createSecretKey } = await import('jose');
    const secret = createSecretKey(this.config.secret, 'utf-8');
    
    const { payload } = await jwtVerify(token, secret, {
      issuer: this.config.issuer
    });
    
    return payload;
  }

  private async signToken(payload: TokenPayload) {
    const { SignJWT, createSecretKey } = await import('jose');
    const secret = createSecretKey(this.config.secret, 'utf-8');
    
    const expiry = payload.type === 'access' ? this.config.accessExpiry : this.config.refreshExpiry;
    
    const jwt = await new SignJWT(payload)
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuer(this.config.issuer)
      .setExpirationTime(expiry)
      .sign(secret);
      
    return jwt;
  }

  private generateSessionId(): string {
    return require('crypto').randomBytes(32).toString('hex');
  }

  async close() {
    if (this.redis) {
      await this.redis.quit();
    }
  }
}

export const jwtAuthPlugin: FastifyPluginAsync = async (app) => {
  const tokenManager = new JwtTokenManager({
    secret: app.config.jwt.secret,
    accessExpiry: app.config.jwt.accessExpiry,
    refreshExpiry: app.config.jwt.refreshExpiry,
    issuer: app.config.jwt.issuer,
    maxFailedAttempts: app.config.security.maxFailedLoginAttempts,
    lockoutDurationMinutes: app.config.security.lockoutDurationMinutes,
    redisUrl: app.config.security.rateLimitStorageUrl
  });

  // Register JWT plugin
  await app.register(fastifyJwt, {
    secret: app.config.jwt.secret,
    sign: {
      expiresIn: app.config.jwt.accessExpiry,
      issuer: app.config.jwt.issuer
    },
    verify: {
      issuer: app.config.jwt.issuer
    }
  });

  app.decorate('tokenManager', tokenManager);

  // Authentication hook
  app.addHook('preHandler', async (request, reply) => {
    // Skip auth for public endpoints
    const publicEndpoints = [
      '/api/auth/login',
      '/api/auth/refresh',
      '/api/auth/register',
      '/health',
      '/api/payment/webhook',
      '/api/csp-report'
    ];

    if (publicEndpoints.some(endpoint => request.url.startsWith(endpoint))) {
      return;
    }

    const authHeader = request.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return reply.code(401).send({
        error: 'UNAUTHENTICATED',
        message: 'Bearer token required',
        timestamp: new Date().toISOString()
      });
    }

    const token = authHeader.substring(7);
    const payload = await tokenManager.verifyToken(token);

    if (!payload) {
      return reply.code(401).send({
        error: 'INVALID_TOKEN',
        message: 'Invalid or expired token',
        timestamp: new Date().toISOString()
      });
    }

    if (payload.type !== 'access') {
      return reply.code(401).send({
        error: 'INVALID_TOKEN_TYPE',
        message: 'Access token required',
        timestamp: new Date().toISOString()
      });
    }

    // Update user info in database if needed
    try {
      await app.prisma.user.upsert({
        where: { id: payload.userId },
        update: { 
          role: payload.role,
          lastLoginAt: new Date()
        },
        create: { 
          id: payload.userId, 
          role: payload.role,
          email: payload.email,
          lastLoginAt: new Date()
        }
      });
    } catch (error) {
      request.log.warn({ err: error }, 'Failed to update user login info');
    }

    request.user = {
      userId: payload.userId,
      role: payload.role,
      email: payload.email,
      iat: payload.iat,
      exp: payload.exp
    };
  });

  // Cleanup on close
  app.addHook('onClose', async () => {
    await tokenManager.close();
  });
};

export async function requireAuth(request: FastifyRequest, reply: FastifyReply) {
  if (!request.user) {
    await reply.code(401).send({
      error: 'UNAUTHENTICATED',
      message: 'Authentication required',
      timestamp: new Date().toISOString()
    });
    return false;
  }
  return true;
}

export function requireRole(role: 'admin' | 'user') {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    if (!request.user) {
      await reply.code(401).send({
        error: 'UNAUTHENTICATED',
        message: 'Authentication required',
        timestamp: new Date().toISOString()
      });
      return false;
    }

    if (request.user.role !== role) {
      await reply.code(403).send({
        error: 'FORBIDDEN',
        message: `Admin access required`,
        timestamp: new Date().toISOString()
      });
      return false;
    }
    
    return true;
  };
}