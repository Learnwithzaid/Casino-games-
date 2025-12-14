import type { FastifyPluginAsync } from 'fastify';
import { RateLimiterRedis, RateLimiterMemory } from 'rate-limiter-flexible';
import Redis from 'ioredis';

export interface RateLimitConfig {
  points: number;           // Number of requests
  duration: number;         // Per duration seconds
  blockDuration?: number;   // Block for seconds if limit exceeded
  keyPrefix?: string;       // Redis key prefix
}

export interface RouteRateLimits {
  auth?: RateLimitConfig;
  payments?: RateLimitConfig;
  bets?: RateLimitConfig;
  webhooks?: RateLimitConfig;
  default?: RateLimitConfig;
}

export class RateLimitManager {
  private redis?: Redis;
  private limiters = new Map<string, any>();
  private redisLimiters = new Map<string, RateLimiterRedis>();
  private memoryLimiters = new Map<string, RateLimiterMemory>();

  constructor(
    private storageUrl?: string,
    private prefix: string = 'rl'
  ) {
    if (storageUrl) {
      this.redis = new Redis(storageUrl);
    }
  }

  createLimiter(name: string, config: RateLimitConfig) {
    if (this.redis && config.keyPrefix !== 'memory-only') {
      const limiter = new RateLimiterRedis({
        storeClient: this.redis,
        keyPrefix: `${this.prefix}:${name}`,
        points: config.points,
        duration: config.duration,
        blockDuration: config.blockDuration || 0,
      });
      
      this.redisLimiters.set(name, limiter);
    } else {
      const limiter = new RateLimiterMemory({
        keyPrefix: `${this.prefix}:${name}`,
        points: config.points,
        duration: config.duration,
        blockDuration: config.blockDuration || 0,
      });
      
      this.memoryLimiters.set(name, limiter);
    }
  }

  async checkLimit(key: string, limiterName: string) {
    try {
      let limiter = this.redisLimiters.get(limiterName) || this.memoryLimiters.get(limiterName);
      
      if (!limiter) {
        throw new Error(`Rate limiter ${limiterName} not found`);
      }

      const res = await limiter.consume(key);
      
      return {
        success: true,
        remainingPoints: res.remainingPoints,
        msBeforeNext: res.msBeforeNext,
        totalHits: res.totalHits
      };
    } catch (rejRes) {
      return {
        success: false,
        remainingPoints: 0,
        msBeforeNext: rejRes.msBeforeNext,
        totalHits: rejRes.totalHits
      };
    }
  }

  async getRemaining(key: string, limiterName: string): Promise<number> {
    try {
      let limiter = this.redisLimiters.get(limiterName) || this.memoryLimiters.get(limiterName);
      
      if (!limiter) {
        return -1;
      }

      const res = await limiter.get(key);
      return res ? res.remainingPoints : -1;
    } catch {
      return -1;
    }
  }

  async resetLimit(key: string, limiterName: string) {
    try {
      let limiter = this.redisLimiters.get(limiterName) || this.memoryLimiters.get(limiterName);
      
      if (!limiter) {
        return false;
      }

      await limiter.delete(key);
      return true;
    } catch {
      return false;
    }
  }

  async close() {
    if (this.redis) {
      await this.redis.quit();
    }
  }
}

export const rateLimitPlugin: FastifyPluginAsync = async (app) => {
  const rateLimitManager = new RateLimitManager(
    app.config.security.rateLimitStorageUrl,
    'payments-platform'
  );

  // Configure rate limits for different route types
  const routeLimits: RouteRateLimits = {
    auth: {
      points: app.config.security.maxFailedLoginAttempts || 5, // Fail fast for auth
      duration: 900, // 15 minutes
      blockDuration: 900, // Block for 15 minutes
      keyPrefix: 'auth'
    },
    payments: {
      points: 20,
      duration: 60, // 1 minute
      blockDuration: 60,
      keyPrefix: 'payments'
    },
    bets: {
      points: 10,
      duration: 60, // 1 minute
      blockDuration: 30,
      keyPrefix: 'bets'
    },
    webhooks: {
      points: 500,
      duration: 60, // 1 minute
      blockDuration: 0, // Don't block webhooks
      keyPrefix: 'webhooks'
    },
    default: {
      points: 100,
      duration: 60, // 1 minute
      blockDuration: 60,
      keyPrefix: 'default'
    }
  };

  // Create rate limiters
  Object.entries(routeLimits).forEach(([name, config]) => {
    rateLimitManager.createLimiter(name, config);
  });

  app.decorate('rateLimitManager', rateLimitManager);

  // Global rate limiting middleware
  app.addHook('preHandler', async (request, reply) => {
    // Skip rate limiting for health checks
    if (request.url === '/health') {
      return;
    }

    // Get client IP (consider proxy headers)
    const clientIp = getClientIP(request);
    
    // Determine rate limit type based on URL
    const limiterName = determineLimiterName(request.url);
    
    const result = await rateLimitManager.checkLimit(clientIp, limiterName);
    
    if (!result.success) {
      const retryAfter = Math.ceil(result.msBeforeNext / 1000);
      
      reply.header('Retry-After', retryAfter.toString());
      reply.header('X-RateLimit-Limit', routeLimits[limiterName as keyof RouteRateLimits]?.points.toString() || '100');
      reply.header('X-RateLimit-Remaining', '0');
      reply.header('X-RateLimit-Reset', new Date(Date.now() + result.msBeforeNext).toISOString());
      
      return reply.code(429).send({
        error: 'RATE_LIMIT_EXCEEDED',
        message: 'Too many requests',
        retryAfter,
        limit: routeLimits[limiterName as keyof RouteRateLimits]?.points || 100,
        remaining: 0,
        timestamp: new Date().toISOString()
      });
    }

    // Add rate limit headers
    const remaining = result.remainingPoints;
    reply.header('X-RateLimit-Limit', routeLimits[limiterName as keyof RouteRateLimits]?.points.toString() || '100');
    reply.header('X-RateLimit-Remaining', remaining.toString());
    reply.header('X-RateLimit-Reset', new Date(Date.now() + 60000).toISOString());
  });

  // Endpoint-specific rate limiting decorators
  app.decorate('requireRateLimit', (config: RateLimitConfig) => {
    return async (request: any, reply: any) => {
      const clientIp = getClientIP(request);
      const endpointKey = `${clientIp}:${request.routerPath || request.url}`;
      
      const result = await rateLimitManager.checkLimit(endpointKey, 'custom');
      
      if (!result.success) {
        return reply.code(429).send({
          error: 'RATE_LIMIT_EXCEEDED',
          message: 'Endpoint rate limit exceeded',
          retryAfter: Math.ceil(result.msBeforeNext / 1000),
          timestamp: new Date().toISOString()
        });
      }
    };
  });

  // Cleanup on close
  app.addHook('onClose', async () => {
    await rateLimitManager.close();
  });
};

function getClientIP(request: any): string {
  // Check for forwarded headers first (when behind proxy)
  const forwardedFor = request.headers['x-forwarded-for'];
  if (forwardedFor) {
    return forwardedFor.split(',')[0].trim();
  }
  
  const realIp = request.headers['x-real-ip'];
  if (realIp) {
    return realIp as string;
  }
  
  return request.ip || request.connection.remoteAddress || 'unknown';
}

function determineLimiterName(url: string): keyof RouteRateLimits {
  if (url.startsWith('/api/auth/')) {
    return 'auth';
  }
  
  if (url.includes('/payment/') || url.includes('/payments/')) {
    return 'payments';
  }
  
  if (url.includes('/bet') || url.includes('/slot')) {
    return 'bets';
  }
  
  if (url.includes('/webhook') || url.includes('/payment/webhook')) {
    return 'webhooks';
  }
  
  return 'default';
}