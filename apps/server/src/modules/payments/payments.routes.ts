import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { PaymentProvider, PaymentStatus } from '@prisma/client';
import { requireAuth, requireRole } from '../../plugins/jwt-auth.js';
import { createValidationMiddleware } from '../../plugins/validation.js';

const DepositSchema = z.object({
  provider: z.nativeEnum(PaymentProvider),
  amount: z.coerce.number().positive().min(1).max(1_000_000),
  currency: z.string().min(1).max(10).default('PKR'),
  returnUrl: z.string().url().optional()
});

const AmountString = z
  .string()
  .regex(/^\d+(\.\d{1,2})?$/)
  .transform((v) => Number(v).toFixed(2));

const WebhookSchema = z.object({
  provider: z.nativeEnum(PaymentProvider),
  transactionId: z.string().min(1).max(255),
  providerTransactionId: z.string().min(1).max(255).optional(),
  status: z.nativeEnum(PaymentStatus),
  amount: AmountString,
  currency: z.string().min(1).max(10).default('PKR'),
  signature: z.string().min(1).max(500)
});

const StatusQuerySchema = z.object({
  transactionId: z.string().min(1).max(255)
});

const DepositsQuerySchema = z.object({
  userId: z.string().min(1).max(255).optional()
});

const ReconcileParamsSchema = z.object({
  transactionId: z.string().min(1).max(255)
});

export const paymentsRoutes: FastifyPluginAsync = async (app) => {
  app.post(
    '/api/payment/deposit',
    {
      preHandler: [requireAuth, createValidationMiddleware({ body: DepositSchema })],
      config: {
        rateLimit: {
          points: 20,
          duration: 60, // 1 minute
          blockDuration: 60,
          keyPrefix: 'deposit'
        }
      }
    },
    async (request, reply) => {
      const { provider, amount, currency, returnUrl } = request.validatedBody!;
      const user = request.user!;

      request.log.info({ 
        userId: user.userId, 
        provider, 
        amount, 
        currency 
      }, 'Deposit request initiated');

      try {
        const result = await app.services.payments.createDeposit({
          userId: user.userId,
          provider,
          amount,
          currency,
          returnUrl
        });

        return reply.code(201).send({
          message: 'Deposit created successfully',
          ...result,
          timestamp: new Date().toISOString()
        });
      } catch (error) {
        request.log.error({ 
          err: error, 
          userId: user.userId, 
          provider, 
          amount 
        }, 'Deposit creation failed');
        
        return reply.code(500).send({
          error: 'DEPOSIT_CREATION_ERROR',
          message: 'An error occurred while creating deposit',
          timestamp: new Date().toISOString()
        });
      }
    }
  );

  app.post(
    '/api/payment/webhook',
    {
      preHandler: createValidationMiddleware({ body: WebhookSchema }),
      config: {
        rateLimit: {
          points: 500, // High limit for webhooks
          duration: 60,
          blockDuration: 0, // Don't block webhooks
          keyPrefix: 'webhook'
        }
      }
    },
    async (request, reply) => {
      const { provider, transactionId, providerTransactionId, status, amount, currency, signature } = request.validatedBody!;

      request.log.info({ 
        provider, 
        transactionId, 
        status, 
        amount 
      }, 'Payment webhook received');

      try {
        const res = await app.services.payments.handleWebhook({
          ip: request.ip,
          provider,
          transactionId,
          providerTransactionId,
          status,
          amount,
          currency,
          signature
        });

        if (!res.ok) {
          request.log.warn({ 
            provider, 
            transactionId, 
            statusCode: res.statusCode, 
            error: res.error 
          }, 'Webhook processing failed');
          
          return reply.code(res.statusCode).send({ 
            error: res.error,
            timestamp: new Date().toISOString()
          });
        }

        return reply.code(200).send({
          message: 'Webhook processed successfully',
          ...res,
          timestamp: new Date().toISOString()
        });
      } catch (error) {
        request.log.error({ 
          err: error, 
          provider, 
          transactionId 
        }, 'Webhook processing error');
        
        return reply.code(500).send({
          error: 'WEBHOOK_ERROR',
          message: 'An error occurred while processing webhook',
          timestamp: new Date().toISOString()
        });
      }
    }
  );

  app.get(
    '/api/payment/status/:transactionId',
    {
      preHandler: [requireAuth, createValidationMiddleware({ params: StatusQuerySchema })],
      config: {
        rateLimit: {
          points: 60, // Lower limit for status checks
          duration: 60,
          blockDuration: 30,
          keyPrefix: 'status'
        }
      }
    },
    async (request, reply) => {
      const { transactionId } = request.validatedParams!;
      const user = request.user!;

      try {
        const result = await app.services.payments.getTransactionForUser(transactionId, user);

        if (!result) {
          return reply.code(404).send({
            error: 'TRANSACTION_NOT_FOUND',
            message: 'Transaction not found',
            timestamp: new Date().toISOString()
          });
        }
        
        if (result.forbidden) {
          return reply.code(403).send({
            error: 'FORBIDDEN',
            message: 'Access denied to this transaction',
            timestamp: new Date().toISOString()
          });
        }

        return reply.code(200).send({
          id: result.transaction.id,
          provider: result.transaction.provider,
          status: result.transaction.status,
          amount: result.transaction.amount.toString(),
          currency: result.transaction.currency,
          createdAt: result.transaction.createdAt,
          confirmedAt: result.transaction.confirmedAt,
          creditedAt: result.transaction.creditedAt,
          timestamp: new Date().toISOString()
        });
      } catch (error) {
        request.log.error({ 
          err: error, 
          transactionId, 
          userId: user.userId 
        }, 'Status check error');
        
        return reply.code(500).send({
          error: 'STATUS_CHECK_ERROR',
          message: 'An error occurred while checking transaction status',
          timestamp: new Date().toISOString()
        });
      }
    }
  );

  app.get(
    '/api/user/deposits',
    {
      preHandler: [requireAuth, createValidationMiddleware({ query: DepositsQuerySchema })],
      config: {
        rateLimit: {
          points: 30, // Moderate limit for listing
          duration: 60,
          blockDuration: 30,
          keyPrefix: 'deposits'
        }
      }
    },
    async (request, reply) => {
      const { userId } = request.validatedQuery!;
      const user = request.user!;

      try {
        const deposits = await app.services.payments.listDeposits(user, userId);

        return reply.code(200).send({
          deposits: deposits.map((d) => ({
            id: d.id,
            provider: d.provider,
            status: d.status,
            amount: d.amount.toString(),
            currency: d.currency,
            createdAt: d.createdAt,
            confirmedAt: d.confirmedAt,
            creditedAt: d.creditedAt
          })),
          count: deposits.length,
          timestamp: new Date().toISOString()
        });
      } catch (error) {
        request.log.error({ 
          err: error, 
          userId: user.userId, 
          targetUserId: userId 
        }, 'List deposits error');
        
        return reply.code(500).send({
          error: 'LIST_DEPOSITS_ERROR',
          message: 'An error occurred while listing deposits',
          timestamp: new Date().toISOString()
        });
      }
    }
  );

  app.post(
    '/api/payment/reconcile/:transactionId',
    {
      preHandler: [requireRole('admin'), createValidationMiddleware({ params: ReconcileParamsSchema })],
      config: {
        rateLimit: {
          points: 10, // Very restrictive for admin operations
          duration: 300, // 5 minutes
          blockDuration: 300,
          keyPrefix: 'reconcile'
        }
      }
    },
    async (request, reply) => {
      const { transactionId } = request.validatedParams!;
      const user = request.user!;

      request.log.warn({ 
        transactionId, 
        adminId: user.userId 
      }, 'Admin reconciliation initiated');

      try {
        const res = await app.services.payments.reconcile(transactionId, user);

        if (!res.ok) {
          return reply.code(res.statusCode).send({ 
            error: res.error,
            timestamp: new Date().toISOString()
          });
        }

        request.log.info({ 
          transactionId, 
          adminId: user.userId,
          changed: res.changed
        }, 'Transaction reconciliation completed');

        return reply.code(200).send({
          message: 'Reconciliation completed successfully',
          changed: res.changed,
          transaction: {
            id: res.transaction.id,
            provider: res.transaction.provider,
            status: res.transaction.status,
            amount: res.transaction.amount.toString(),
            currency: res.transaction.currency
          },
          timestamp: new Date().toISOString()
        });
      } catch (error) {
        request.log.error({ 
          err: error, 
          transactionId, 
          adminId: user.userId 
        }, 'Reconciliation error');
        
        return reply.code(500).send({
          error: 'RECONCILIATION_ERROR',
          message: 'An error occurred during reconciliation',
          timestamp: new Date().toISOString()
        });
      }
    }
  );
};
