import {
  PaymentProvider,
  PaymentStatus,
  Prisma,
  type PaymentTransaction,
  type PrismaClient
} from '@prisma/client';
import type { Logger } from 'pino';
import type { PaymentProviderAdapter, VerifiedWebhook } from './providers/types.js';
import type { WalletService } from '../wallet/wallet.service.js';
import type { PaymentRetryQueue } from './retry-queue.js';

export type DepositInput = {
  userId: string;
  provider: PaymentProvider;
  amount: number;
  currency: string;
  returnUrl?: string;
};

export type WebhookInput = {
  ip: string;
  provider: PaymentProvider;
  transactionId: string;
  providerTransactionId?: string;
  status: PaymentStatus;
  amount: string;
  currency: string;
  signature: string;
};

export class PaymentsService {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly logger: Logger,
    private readonly wallet: WalletService,
    private readonly retryQueue: PaymentRetryQueue,
    private readonly adapters: Record<PaymentProvider, PaymentProviderAdapter>
  ) {}

  private adapter(provider: PaymentProvider) {
    const adapter = this.adapters[provider];
    if (!adapter) throw new Error(`Unsupported provider: ${provider}`);
    return adapter;
  }

  private async audit(action: string, entityType: string, entityId: string, meta?: unknown, actorUserId?: string) {
    await this.prisma.auditLog.create({
      data: {
        actorUserId,
        action,
        entityType,
        entityId,
        meta: meta as Prisma.InputJsonValue
      }
    });
  }

  async createDeposit(input: DepositInput) {
    const amount = Number(input.amount);
    const amountStr = amount.toFixed(2);

    const tx = await this.prisma.paymentTransaction.create({
      data: {
        userId: input.userId,
        provider: input.provider,
        amount: new Prisma.Decimal(amountStr),
        currency: input.currency,
        status: PaymentStatus.PENDING
      }
    });

    const redirectUrl = this.adapter(input.provider).buildRedirectUrl({
      transactionId: tx.id,
      userId: tx.userId,
      amount: amountStr,
      currency: tx.currency,
      returnUrl: input.returnUrl
    });

    const updated = await this.prisma.paymentTransaction.update({
      where: { id: tx.id },
      data: { redirectUrl }
    });

    await this.audit('PAYMENT_CREATED', 'PaymentTransaction', updated.id, {
      provider: updated.provider,
      amount: updated.amount.toString(),
      currency: updated.currency
    }, input.userId);

    this.logger.info({ transactionId: updated.id, provider: updated.provider }, 'deposit created');

    return {
      transactionId: updated.id,
      redirectUrl
    };
  }

  private async scheduleWalletCredit(transactionId: string) {
    const current = await this.prisma.paymentTransaction.findUnique({
      where: { id: transactionId },
      select: { id: true, retries: true, creditedAt: true }
    });

    if (!current || current.creditedAt) return;

    if (current.retries >= this.retryQueue.config.maxRetries) {
      this.logger.error({ transactionId, retries: current.retries }, 'max retries reached, not scheduling wallet credit');
      return;
    }

    const updated = await this.prisma.paymentTransaction.update({
      where: { id: transactionId },
      data: { retries: { increment: 1 } },
      select: { id: true, retries: true }
    });

    await this.audit('PAYMENT_CREDIT_RETRY_SCHEDULED', 'PaymentTransaction', updated.id, {
      attempt: updated.retries
    });

    this.retryQueue.enqueue(updated.id, updated.retries);
  }

  async handleWebhook(input: WebhookInput) {
    const adapter = this.adapter(input.provider);

    if (!adapter.isWebhookIpAllowed(input.ip)) {
      this.logger.warn({ ip: input.ip, provider: input.provider }, 'webhook rejected: ip not allowed');
      return { ok: false as const, statusCode: 403, error: 'IP_NOT_ALLOWED' };
    }

    const verifiedWebhook: VerifiedWebhook = {
      transactionId: input.transactionId,
      providerTransactionId: input.providerTransactionId,
      status: input.status,
      amount: input.amount,
      currency: input.currency
    };

    if (!adapter.verifyWebhookSignature(verifiedWebhook, input.signature)) {
      this.logger.warn({ provider: input.provider, transactionId: input.transactionId }, 'webhook rejected: bad signature');
      return { ok: false as const, statusCode: 401, error: 'INVALID_SIGNATURE' };
    }

    const now = new Date();

    const result = await this.prisma.$transaction(async (tx) => {
      const existing = await tx.paymentTransaction.findUnique({ where: { id: input.transactionId } });

      if (!existing) {
        return { ok: false as const, statusCode: 404, error: 'TRANSACTION_NOT_FOUND' };
      }

      if (existing.provider !== input.provider) {
        return { ok: false as const, statusCode: 400, error: 'PROVIDER_MISMATCH' };
      }

      if (existing.currency !== input.currency) {
        return { ok: false as const, statusCode: 400, error: 'CURRENCY_MISMATCH' };
      }

      if (!existing.amount.equals(new Prisma.Decimal(input.amount))) {
        return { ok: false as const, statusCode: 400, error: 'AMOUNT_MISMATCH' };
      }

      const statusAlreadyFinal =
        existing.status === PaymentStatus.CONFIRMED ||
        existing.status === PaymentStatus.FAILED ||
        existing.status === PaymentStatus.EXPIRED;

      if (statusAlreadyFinal) {
        await tx.paymentTransaction.update({
          where: { id: existing.id },
          data: { lastWebhookAt: now }
        });

        return { ok: true as const, transaction: existing, statusChanged: false };
      }

      if (existing.status === input.status) {
        const updated = await tx.paymentTransaction.update({
          where: { id: existing.id },
          data: {
            providerTransactionId: input.providerTransactionId,
            signature: input.signature,
            lastWebhookAt: now
          }
        });

        return { ok: true as const, transaction: updated, statusChanged: false };
      }

      const updated = await tx.paymentTransaction.update({
        where: { id: existing.id },
        data: {
          status: input.status,
          providerTransactionId: input.providerTransactionId,
          signature: input.signature,
          lastWebhookAt: now,
          confirmedAt: input.status === PaymentStatus.CONFIRMED ? now : existing.confirmedAt
        }
      });

      await tx.auditLog.create({
        data: {
          action: 'PAYMENT_STATUS_CHANGED',
          entityType: 'PaymentTransaction',
          entityId: updated.id,
          meta: {
            from: existing.status,
            to: updated.status,
            provider: updated.provider
          }
        }
      });

      return { ok: true as const, transaction: updated, statusChanged: true };
    });

    if (!result.ok) return result;

    this.logger.info(
      { transactionId: result.transaction.id, provider: result.transaction.provider, status: result.transaction.status },
      'webhook processed'
    );

    if (result.transaction.status !== PaymentStatus.CONFIRMED) {
      return { ok: true as const, transactionId: result.transaction.id, credited: false };
    }

    try {
      const credit = await this.wallet.creditConfirmedPayment(result.transaction.id);

      if (credit.credited) {
        await this.audit('PAYMENT_CREDITED', 'PaymentTransaction', result.transaction.id, {
          walletId: credit.walletId
        });

        this.logger.info({ transactionId: result.transaction.id, walletId: credit.walletId }, 'wallet credited');
        return { ok: true as const, transactionId: result.transaction.id, credited: true };
      }

      return { ok: true as const, transactionId: result.transaction.id, credited: false, reason: credit.reason };
    } catch (err) {
      this.logger.error({ err, transactionId: result.transaction.id }, 'wallet credit failed, scheduling retry');
      await this.scheduleWalletCredit(result.transaction.id);
      return { ok: true as const, transactionId: result.transaction.id, credited: false, retryScheduled: true };
    }
  }

  async getTransaction(transactionId: string) {
    return this.prisma.paymentTransaction.findUnique({ where: { id: transactionId } });
  }

  async getTransactionForUser(transactionId: string, requester: { id: string; role: 'user' | 'admin' }) {
    const tx = await this.getTransaction(transactionId);
    if (!tx) return null;

    if (requester.role !== 'admin' && tx.userId !== requester.id) {
      return { forbidden: true as const };
    }

    return { forbidden: false as const, transaction: tx };
  }

  async listDeposits(requester: { id: string; role: 'user' | 'admin' }, userId?: string) {
    const targetUserId = requester.role === 'admin' ? userId ?? requester.id : requester.id;

    return this.prisma.paymentTransaction.findMany({
      where: { userId: targetUserId },
      orderBy: { createdAt: 'desc' }
    });
  }

  async reconcile(transactionId: string, actor: { id: string; role: 'user' | 'admin' }) {
    if (actor.role !== 'admin') {
      return { ok: false as const, statusCode: 403, error: 'FORBIDDEN' };
    }

    const tx = await this.prisma.paymentTransaction.findUnique({ where: { id: transactionId } });
    if (!tx) return { ok: false as const, statusCode: 404, error: 'TRANSACTION_NOT_FOUND' };

    const adapter = this.adapter(tx.provider);

    const remoteStatus = await adapter.fetchRemoteStatus(tx);

    let nextStatus: PaymentStatus = remoteStatus;

    if (remoteStatus === PaymentStatus.PENDING) {
      const ageMs = Date.now() - tx.createdAt.getTime();
      if (ageMs > 30 * 60 * 1000) nextStatus = PaymentStatus.EXPIRED;
    }

    if (nextStatus === tx.status) {
      return { ok: true as const, transaction: tx, changed: false };
    }

    const updated = await this.prisma.paymentTransaction.update({
      where: { id: tx.id },
      data: { status: nextStatus }
    });

    await this.audit('PAYMENT_RECONCILED', 'PaymentTransaction', updated.id, {
      from: tx.status,
      to: updated.status
    }, actor.id);

    return { ok: true as const, transaction: updated, changed: true };
  }
}
