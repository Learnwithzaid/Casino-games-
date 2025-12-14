import type { PrismaClient } from '@prisma/client';
import type { AppConfig } from '../config.js';
import type { PaymentsService } from '../modules/payments/payments.service.js';
import type { WalletService } from '../modules/wallet/wallet.service.js';
import type { PaymentRetryQueue } from '../modules/payments/retry-queue.js';

export type AuthUser = {
  id: string;
  role: 'user' | 'admin';
};

declare module 'fastify' {
  interface FastifyRequest {
    user?: AuthUser;
  }

  interface FastifyInstance {
    prisma: PrismaClient;
    config: AppConfig;
    services: {
      payments: PaymentsService;
      wallet: WalletService;
      retryQueue: PaymentRetryQueue;
    };
  }
}
