import pino from 'pino';
import { buildApp } from '../src/app.js';
import { loadConfig, type AppConfig } from '../src/config.js';
import { createPrismaClient } from '../src/prisma.js';

export async function resetDb() {
  const prisma = createPrismaClient(process.env.DATABASE_URL);
  await prisma.$transaction([
    prisma.auditLog.deleteMany(),
    prisma.walletLedgerEntry.deleteMany(),
    prisma.walletAccount.deleteMany(),
    prisma.paymentTransaction.deleteMany(),
    prisma.user.deleteMany()
  ]);
  await prisma.$disconnect();
}

export async function buildTestApp(configOverrides: Partial<Record<string, string>> = {}) {
  const env = {
    ...process.env,
    PAYMENTS_HMAC_SECRET_JAZZCASH: 'jazz-secret',
    PAYMENTS_HMAC_SECRET_EASYPaisa: 'easy-secret',
    PAYMENTS_HMAC_SECRET_SADAPAY: 'sada-secret',
    PAYMENTS_MAX_RETRIES: '3',
    PAYMENTS_RETRY_BASE_DELAY_MS: '1',
    PAYMENTS_RETRY_MAX_DELAY_MS: '5',
    ...configOverrides
  };

  const config: AppConfig = loadConfig(env);
  const logger = pino({ level: 'silent' });
  const prisma = createPrismaClient(env.DATABASE_URL);

  const app = await buildApp({ prisma, config, logger });

  return { app, prisma, config };
}
