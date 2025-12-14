import Fastify from 'fastify';
import cors from '@fastify/cors';
import rateLimit from '@fastify/rate-limit';
import fastifyCookie from '@fastify/cookie';
import { Prisma } from '@prisma/client';
import type { PrismaClient } from '@prisma/client';
import type { Logger } from 'pino';
import type { AppConfig } from './config.js';
import { buildHttpLogger } from './logger.js';
import { validationPlugin, createValidationMiddleware } from './plugins/validation.js';
import { securityPlugin } from './plugins/security.js';
import { jwtAuthPlugin } from './plugins/jwt-auth.js';
import { rateLimitPlugin } from './plugins/rate-limit.js';
import { WalletService } from './modules/wallet/wallet.service.js';
import { PaymentsService } from './modules/payments/payments.service.js';
import { buildProviderRegistry } from './modules/payments/providers/index.js';
import { PaymentRetryQueue } from './modules/payments/retry-queue.js';
import { paymentsRoutes } from './modules/payments/payments.routes.js';
import { slotGameRoutes } from './modules/slot-game/slot-game.routes.js';
import { SlotEngineService } from './modules/slot-engine/slot-engine.service.js';
import { BettingService } from './modules/slot-engine/betting.service.js';
import { slotEngineRoutes } from './modules/slot-engine/routes.js';
import { authRoutes } from './modules/auth/auth.routes.js';

export type BuildAppDeps = {
  prisma: PrismaClient;
  config: AppConfig;
  logger: Logger;
};

export async function buildApp({ prisma, config, logger }: BuildAppDeps) {
  const app = Fastify({
    logger: logger,
    trustProxy: true, // Trust proxy headers for rate limiting and security
    requestTimeout: 30000, // 30 second timeout
    bodyLimit: 1048576, // 1MB body limit
    caseSensitive: true, // Case sensitive routing
  });

  app.decorate('prisma', prisma);
  app.decorate('config', config);

  // Register security plugins first
  await app.register(buildHttpLogger);
  
  // CORS with strict origin validation
  await app.register(cors, {
    origin: (origin, cb) => {
      // Allow requests with no origin (mobile apps, Postman, etc.)
      if (!origin) return cb(null, true);
      
      const allowedOrigins = config.corsOrigin === '*' 
        ? ['*'] 
        : config.corsOrigin.split(',').map(o => o.trim());
      
      if (allowedOrigins.includes('*') || allowedOrigins.includes(origin)) {
        cb(null, true);
      } else {
        cb(new Error('Not allowed by CORS'), false);
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type', 
      'Authorization', 
      'X-CSRF-Token', 
      'X-Requested-With',
      'X-User-ID',
      'X-User-Role'
    ],
    exposedHeaders: ['X-RateLimit-Limit', 'X-RateLimit-Remaining', 'X-RateLimit-Reset']
  });

  // Cookie plugin for sessions and CSRF tokens
  await app.register(fastifyCookie, {
    secret: config.jwt.secret, // Use JWT secret as cookie secret
    parseOptions: {
      httpOnly: true,
      secure: config.nodeEnv === 'production',
      sameSite: 'strict',
      maxAge: 24 * 60 * 60 * 1000 // 24 hours
    }
  });

  // Register security middleware
  await app.register(validationPlugin);
  await app.register(securityPlugin);
  await app.register(jwtAuthPlugin);
  await app.register(rateLimitPlugin);

  // Remove the old simple rate limit plugin since we have advanced rate limiting
  // await app.register(rateLimit, {
  //   max: 100,
  //   timeWindow: '1 minute'
  // });

  const wallet = new WalletService(prisma);

  const retryQueue = new PaymentRetryQueue(config.retry, logger, async (transactionId) => {
    const result = await wallet.creditConfirmedPayment(transactionId);
    if (result.credited || result.reason === 'ALREADY_CREDITED') return;

    throw new Error(`credit failed: ${result.reason}`);
  });

  const payments = new PaymentsService(prisma, logger, wallet, retryQueue, buildProviderRegistry(config));

  // Initialize slot engine services
  const slotEngineService = new SlotEngineService(prisma);
  const bettingService = new BettingService(prisma, slotEngineService, wallet);

  app.decorate('services', {
    payments,
    wallet,
    retryQueue,
    slotEngineService,
    bettingService
  });

  app.get('/health', async () => ({ ok: true }));

  // Security endpoint for CSP reporting
  app.post('/api/csp-report', async (request, reply) => {
    request.log.warn({ csp: request.body }, 'CSP violation report');
    return reply.code(204).send();
  });

  // Register all route modules
  await app.register(authRoutes);
  await app.register(paymentsRoutes);
  await app.register(slotGameRoutes);
  await app.register(slotEngineRoutes);

  // Global error handler for unhandled rejections
  app.setErrorHandler((error, request, reply) => {
    const isValidationError = error.validation || error.validationBody;
    
    if (isValidationError) {
      request.log.warn({ 
        err: error,
        validation: error.validation,
        url: request.url,
        method: request.method
      }, 'Validation error');
      
      return reply.code(400).send({
        error: 'VALIDATION_ERROR',
        message: 'Request validation failed',
        timestamp: new Date().toISOString(),
        path: request.url,
        method: request.method
      });
    }

    // Log unhandled errors
    request.log.error({
      err: error,
      url: request.url,
      method: request.method,
      ip: request.ip,
      userAgent: request.headers['user-agent']
    }, 'Unhandled application error');

    // Don't leak error details in production
    if (config.nodeEnv === 'production') {
      return reply.code(500).send({
        error: 'INTERNAL_ERROR',
        message: 'An internal error occurred',
        timestamp: new Date().toISOString(),
        path: request.url,
        method: request.method
      });
    }

    return reply.code(500).send({
      error: 'INTERNAL_ERROR',
      message: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString(),
      path: request.url,
      method: request.method
    });
  });

  // Graceful shutdown hooks
  app.addHook('onClose', async () => {
    app.log.info('Starting graceful shutdown...');
    retryQueue.clearAll();
    await prisma.$disconnect();
    app.log.info('Graceful shutdown completed');
  });

  return app;
}
