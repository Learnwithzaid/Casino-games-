import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { Prisma, WalletEntryType } from '@prisma/client';
import { SlotGameService } from './slot-game.service.js';
import { WalletService } from '../wallet/wallet.service.js';
import type { BetRequest } from '@monorepo/shared';

export async function slotGameRoutes(app: FastifyInstance) {
  const slotGameService = new SlotGameService(app.prisma);
  const walletService = new WalletService(app.prisma);

  // Get user balance
  app.get('/api/user/balance', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      // For demo purposes, we'll use a mock user ID
      // In production, this would come from the authenticated user
      const userId = (request.headers['x-user-id'] as string) || 'demo-user-1';

      const balance = await walletService.getBalance(userId);

      return reply.send({
        success: true,
        data: balance
      });
    } catch (error) {
      app.log.error(error);
      return reply.status(500).send({
        success: false,
        message: 'Failed to fetch balance'
      });
    }
  });

  // Place bet and spin
  app.post('/api/game/bet', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const betRequest = request.body as BetRequest;
      const userId = (request.headers['x-user-id'] as string) || 'demo-user-1';

      // Validate bet amount
      if (!betRequest.amount || betRequest.amount <= 0) {
        return reply.status(400).send({
          success: false,
          message: 'Invalid bet amount'
        });
      }

      // Check if user has sufficient balance
      const currentBalance = await walletService.getBalance(userId);
      const currentBalanceNum = parseFloat(currentBalance.balance);

      if (currentBalanceNum < betRequest.amount) {
        return reply.status(400).send({
          success: false,
          message: 'Insufficient balance'
        });
      }

      // Deduct bet amount from wallet
      const transaction = await app.prisma.$transaction(async (tx) => {
        // Debit the bet amount
        const wallet = await tx.walletAccount.upsert({
          where: { userId },
          update: {
            balance: {
              decrement: betRequest.amount
            }
          },
          create: {
            userId,
            currency: currentBalance.currency || 'PKR',
            balance: new Prisma.Decimal(0).minus(betRequest.amount)
          }
        });

        // Create transaction record
        const transaction = await tx.walletLedgerEntry.create({
          data: {
            walletId: wallet.id,
            type: WalletEntryType.DEBIT,
            amount: betRequest.amount,
            referenceType: 'SLOT_BET',
            referenceId: betRequest.gameRoundId || `bet_${Date.now()}`
          }
        });

        return transaction;
      });

      // Perform the spin
      const spinResult = await slotGameService.spin(userId, betRequest.amount);

      // If player won, credit the win amount
      if (spinResult.isWin && spinResult.winAmount > 0) {
        await app.prisma.$transaction(async (tx) => {
          const wallet = await tx.walletAccount.update({
            where: { userId },
            data: {
              balance: {
                increment: spinResult.winAmount
              }
            }
          });

          await tx.walletLedgerEntry.create({
            data: {
              walletId: wallet.id,
              type: WalletEntryType.CREDIT,
              amount: spinResult.winAmount,
              referenceType: 'SLOT_WIN',
              referenceId: spinResult.id
            }
          });
        });
      }

      // Get updated balance
      const newBalance = await walletService.getBalance(userId);

      return reply.send({
        success: true,
        data: {
          transactionId: transaction.id,
          newBalance: newBalance.balance,
          spinResult
        }
      });
    } catch (error) {
      app.log.error(error);
      return reply.status(500).send({
        success: false,
        message: 'Failed to process bet'
      });
    }
  });

  // Get game history
  app.get('/api/game/history', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const userId = (request.headers['x-user-id'] as string) || 'demo-user-1';
      const page = parseInt((request.query as any).page || '1');
      const limit = parseInt((request.query as any).limit || '20');

      const history = await slotGameService.getSpinHistory(userId, page, limit);

      return reply.send({
        success: true,
        ...history
      });
    } catch (error) {
      app.log.error(error);
      return reply.status(500).send({
        success: false,
        message: 'Failed to fetch game history'
      });
    }
  });

  // Get available symbols
  app.get('/api/game/symbols', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const symbols = slotGameService.getAvailableSymbols();

      return reply.send({
        success: true,
        data: symbols
      });
    } catch (error) {
      app.log.error(error);
      return reply.status(500).send({
        success: false,
        message: 'Failed to fetch symbols'
      });
    }
  });
}