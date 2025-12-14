import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { PaymentProvider, PaymentStatus } from '@prisma/client';
import { requireAuth, requireRole } from '../../plugins/auth.js';

const DepositSchema = z.object({
  provider: z.nativeEnum(PaymentProvider),
  amount: z.coerce.number().positive().max(1_000_000),
  currency: z.string().min(1).default('PKR'),
  returnUrl: z.string().url().optional()
});

const AmountString = z
  .string()
  .regex(/^\d+(\.\d{1,2})?$/)
  .transform((v) => Number(v).toFixed(2));

const WebhookSchema = z.object({
  provider: z.nativeEnum(PaymentProvider),
  transactionId: z.string().min(1),
  providerTransactionId: z.string().min(1).optional(),
  status: z.nativeEnum(PaymentStatus),
  amount: AmountString,
  currency: z.string().min(1).default('PKR'),
  signature: z.string().min(1)
});

export const paymentsRoutes: FastifyPluginAsync = async (app) => {
  app.post(
    '/api/payment/deposit',
    {
      preHandler: requireAuth,
      config: {
        rateLimit: {
          max: 20,
          timeWindow: '1 minute'
        }
      }
    },
    async (request, reply) => {
      const parsed = DepositSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.code(400).send({ error: 'INVALID_BODY', details: parsed.error.flatten() });
      }

      const user = request.user!;

      const result = await app.services.payments.createDeposit({
        userId: user.id,
        provider: parsed.data.provider,
        amount: parsed.data.amount,
        currency: parsed.data.currency,
        returnUrl: parsed.data.returnUrl
      });

      return reply.code(201).send(result);
    }
  );

  app.post(
    '/api/payment/webhook',
    {
      config: {
        rateLimit: {
          max: 500,
          timeWindow: '1 minute'
        }
      }
    },
    async (request, reply) => {
      const parsed = WebhookSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.code(400).send({ error: 'INVALID_BODY', details: parsed.error.flatten() });
      }

      const res = await app.services.payments.handleWebhook({
        ip: request.ip,
        provider: parsed.data.provider,
        transactionId: parsed.data.transactionId,
        providerTransactionId: parsed.data.providerTransactionId,
        status: parsed.data.status,
        amount: parsed.data.amount,
        currency: parsed.data.currency,
        signature: parsed.data.signature
      });

      if (!res.ok) {
        return reply.code(res.statusCode).send({ error: res.error });
      }

      return reply.code(200).send(res);
    }
  );

  app.get(
    '/api/payment/status/:transactionId',
    {
      preHandler: requireAuth,
      config: {
        rateLimit: {
          max: 120,
          timeWindow: '1 minute'
        }
      }
    },
    async (request, reply) => {
      const schema = z.object({ transactionId: z.string().min(1) });
      const params = schema.safeParse(request.params);
      if (!params.success) {
        return reply.code(400).send({ error: 'INVALID_PARAMS' });
      }

      const result = await app.services.payments.getTransactionForUser(params.data.transactionId, request.user!);

      if (!result) return reply.code(404).send({ error: 'TRANSACTION_NOT_FOUND' });
      if (result.forbidden) return reply.code(403).send({ error: 'FORBIDDEN' });

      return reply.code(200).send({
        id: result.transaction.id,
        provider: result.transaction.provider,
        status: result.transaction.status,
        amount: result.transaction.amount.toString(),
        currency: result.transaction.currency,
        createdAt: result.transaction.createdAt,
        confirmedAt: result.transaction.confirmedAt,
        creditedAt: result.transaction.creditedAt
      });
    }
  );

  app.get(
    '/api/user/deposits',
    {
      preHandler: requireAuth,
      config: {
        rateLimit: {
          max: 120,
          timeWindow: '1 minute'
        }
      }
    },
    async (request, reply) => {
      const querySchema = z.object({ userId: z.string().min(1).optional() });
      const query = querySchema.safeParse(request.query);
      if (!query.success) {
        return reply.code(400).send({ error: 'INVALID_QUERY' });
      }

      const deposits = await app.services.payments.listDeposits(request.user!, query.data.userId);

      return reply.code(200).send(
        deposits.map((d) => ({
          id: d.id,
          provider: d.provider,
          status: d.status,
          amount: d.amount.toString(),
          currency: d.currency,
          createdAt: d.createdAt,
          confirmedAt: d.confirmedAt,
          creditedAt: d.creditedAt
        }))
      );
    }
  );

  app.post(
    '/api/payment/reconcile/:transactionId',
    {
      preHandler: requireRole('admin'),
      config: {
        rateLimit: {
          max: 30,
          timeWindow: '1 minute'
        }
      }
    },
    async (request, reply) => {
      const schema = z.object({ transactionId: z.string().min(1) });
      const params = schema.safeParse(request.params);
      if (!params.success) return reply.code(400).send({ error: 'INVALID_PARAMS' });

      const res = await app.services.payments.reconcile(params.data.transactionId, request.user!);

      if (!res.ok) return reply.code(res.statusCode).send({ error: res.error });

      return reply.code(200).send({
        changed: res.changed,
        transaction: {
          id: res.transaction.id,
          provider: res.transaction.provider,
          status: res.transaction.status,
          amount: res.transaction.amount.toString(),
          currency: res.transaction.currency
        }
      });
    }
  );
};
