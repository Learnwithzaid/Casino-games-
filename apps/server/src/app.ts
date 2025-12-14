import Fastify from 'fastify';
import cors from '@fastify/cors';
import rateLimit from '@fastify/rate-limit';
import { Prisma } from '@prisma/client';
import type { PrismaClient } from '@prisma/client';
import type { Logger } from 'pino';
import type { AppConfig } from './config.js';
import { authPlugin } from './plugins/auth.js';
import { WalletService } from './modules/wallet/wallet.service.js';
import { PaymentsService } from './modules/payments/payments.service.js';
import { buildProviderRegistry } from './modules/payments/providers/index.js';
import { PaymentRetryQueue } from './modules/payments/retry-queue.js';
import { paymentsRoutes } from './modules/payments/payments.routes.js';
import { slotGameRoutes } from './modules/slot-game/slot-game.routes.js';

export type BuildAppDeps = {
  prisma: PrismaClient;
  config: AppConfig;
  logger: Logger;
};

export async function buildApp({ prisma, config, logger }: BuildAppDeps) {
  const app = Fastify({
    loggerInstance: logger
  });

  app.decorate('prisma', prisma);
  app.decorate('config', config);

  await app.register(cors, {
    origin: config.corsOrigin === '*' ? true : config.corsOrigin.split(',').map((o) => o.trim())
  });

  await app.register(rateLimit, {
    max: 100,
    timeWindow: '1 minute'
  });

  await app.register(authPlugin);

  const wallet = new WalletService(prisma);

  const retryQueue = new PaymentRetryQueue(config.retry, logger, async (transactionId) => {
    const result = await wallet.creditConfirmedPayment(transactionId);
    if (result.credited || result.reason === 'ALREADY_CREDITED') return;

    throw new Error(`credit failed: ${result.reason}`);
  });

  const payments = new PaymentsService(prisma, logger, wallet, retryQueue, buildProviderRegistry(config));

  app.decorate('services', {
    payments,
    wallet,
    retryQueue
  });

  app.get('/health', async () => ({ ok: true }));

  await app.register(paymentsRoutes);
  await app.register(slotGameRoutes);

  app.addHook('onClose', async () => {
    retryQueue.clearAll();
    await prisma.$disconnect();
  });

  return app;
}
