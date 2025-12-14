import { Prisma, WalletEntryType, PaymentStatus } from '@prisma/client';
import type { PrismaClient } from '@prisma/client';

export class WalletService {
  constructor(private readonly prisma: PrismaClient) {}

  async creditConfirmedPayment(transactionId: string) {
    return this.prisma.$transaction(async (tx) => {
      const payment = await tx.paymentTransaction.findUnique({ where: { id: transactionId } });

      if (!payment) {
        return { credited: false, reason: 'PAYMENT_NOT_FOUND' as const };
      }

      if (payment.status !== PaymentStatus.CONFIRMED) {
        return { credited: false, reason: 'PAYMENT_NOT_CONFIRMED' as const };
      }

      if (payment.creditedAt) {
        return { credited: false, reason: 'ALREADY_CREDITED' as const };
      }

      const wallet = await tx.walletAccount.upsert({
        where: { userId: payment.userId },
        update: {},
        create: {
          userId: payment.userId,
          currency: payment.currency,
          balance: new Prisma.Decimal(0)
        }
      });

      try {
        await tx.walletLedgerEntry.create({
          data: {
            walletId: wallet.id,
            type: WalletEntryType.CREDIT,
            amount: payment.amount,
            referenceType: 'PAYMENT_TRANSACTION',
            referenceId: payment.id
          }
        });
      } catch (err) {
        if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
          return { credited: false, reason: 'ALREADY_CREDITED' as const };
        }
        throw err;
      }

      await tx.walletAccount.update({
        where: { id: wallet.id },
        data: {
          balance: {
            increment: payment.amount
          }
        }
      });

      await tx.paymentTransaction.update({
        where: { id: payment.id },
        data: { creditedAt: new Date() }
      });

      await tx.auditLog.create({
        data: {
          action: 'WALLET_CREDITED',
          entityType: 'WalletAccount',
          entityId: wallet.id,
          meta: {
            paymentTransactionId: payment.id,
            amount: payment.amount.toString(),
            currency: payment.currency
          }
        }
      });

      return { credited: true, walletId: wallet.id };
    });
  }

  async getBalance(userId: string) {
    const wallet = await this.prisma.walletAccount.findUnique({ where: { userId } });
    return {
      userId,
      currency: wallet?.currency ?? 'PKR',
      balance: wallet?.balance?.toString() ?? '0'
    };
  }
}
