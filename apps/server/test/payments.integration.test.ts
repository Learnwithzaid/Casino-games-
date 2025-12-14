import { beforeEach, describe, expect, it, afterEach } from 'vitest';
import { PaymentProvider, PaymentStatus } from '@prisma/client';
import { buildTestApp, resetDb } from './test-utils.js';
import { signWebhook } from '../src/modules/payments/providers/common.js';

describe('payments integration', () => {
  beforeEach(async () => {
    await resetDb();
  });

  it('rejects deposit when unauthenticated', async () => {
    const { app } = await buildTestApp();

    const res = await app.inject({
      method: 'POST',
      url: '/api/payment/deposit',
      payload: { provider: PaymentProvider.JAZZCASH, amount: 10 }
    });

    expect(res.statusCode).toBe(401);

    await app.close();
  });

  it('creates a pending transaction and returns redirect URL', async () => {
    const { app, prisma } = await buildTestApp();

    const res = await app.inject({
      method: 'POST',
      url: '/api/payment/deposit',
      headers: { 'x-user-id': 'user_1' },
      payload: { provider: PaymentProvider.EASYPaisa, amount: 25.5, currency: 'PKR' }
    });

    expect(res.statusCode).toBe(201);
    const body = res.json();
    expect(body.transactionId).toBeDefined();
    expect(body.redirectUrl).toContain('orderId=');

    const tx = await prisma.paymentTransaction.findUnique({ where: { id: body.transactionId } });
    expect(tx?.status).toBe(PaymentStatus.PENDING);

    await app.close();
  });

  it('exposes status and history with role checks', async () => {
    const { app } = await buildTestApp();

    const deposit = await app.inject({
      method: 'POST',
      url: '/api/payment/deposit',
      headers: { 'x-user-id': 'user_1' },
      payload: { provider: PaymentProvider.JAZZCASH, amount: 12 }
    });

    const { transactionId } = deposit.json();

    const statusOwner = await app.inject({
      method: 'GET',
      url: `/api/payment/status/${transactionId}`,
      headers: { 'x-user-id': 'user_1' }
    });

    expect(statusOwner.statusCode).toBe(200);
    expect(statusOwner.json().status).toBe(PaymentStatus.PENDING);

    const statusOther = await app.inject({
      method: 'GET',
      url: `/api/payment/status/${transactionId}`,
      headers: { 'x-user-id': 'user_2' }
    });

    expect(statusOther.statusCode).toBe(403);

    const history = await app.inject({
      method: 'GET',
      url: '/api/user/deposits',
      headers: { 'x-user-id': 'user_1' }
    });

    expect(history.statusCode).toBe(200);
    expect(history.json()).toHaveLength(1);

    await app.close();
  });

  it('processes webhook idempotently and credits wallet atomically', async () => {
    const { app, prisma, config } = await buildTestApp();

    const deposit = await app.inject({
      method: 'POST',
      url: '/api/payment/deposit',
      headers: { 'x-user-id': 'user_1' },
      payload: { provider: PaymentProvider.JAZZCASH, amount: 10 }
    });

    const { transactionId } = deposit.json();

    const webhookPayload = {
      provider: PaymentProvider.JAZZCASH,
      transactionId,
      providerTransactionId: 'prov_1',
      status: PaymentStatus.CONFIRMED,
      amount: '10.00',
      currency: 'PKR'
    };

    const signature = signWebhook(webhookPayload, config.providers.jazzcash.hmacSecret);

    const webhook1 = await app.inject({
      method: 'POST',
      url: '/api/payment/webhook',
      payload: { ...webhookPayload, signature }
    });

    expect(webhook1.statusCode).toBe(200);
    expect(webhook1.json().credited).toBe(true);

    const walletAfter1 = await prisma.walletAccount.findUnique({ where: { userId: 'user_1' } });
    expect(Number(walletAfter1?.balance.toString())).toBe(10);

    const entriesAfter1 = await prisma.walletLedgerEntry.findMany({ where: { walletId: walletAfter1!.id } });
    expect(entriesAfter1).toHaveLength(1);

    const webhook2 = await app.inject({
      method: 'POST',
      url: '/api/payment/webhook',
      payload: { ...webhookPayload, signature }
    });

    expect(webhook2.statusCode).toBe(200);

    const walletAfter2 = await prisma.walletAccount.findUnique({ where: { userId: 'user_1' } });
    expect(Number(walletAfter2?.balance.toString())).toBe(10);

    const entriesAfter2 = await prisma.walletLedgerEntry.findMany({ where: { walletId: walletAfter1!.id } });
    expect(entriesAfter2).toHaveLength(1);

    const tx = await prisma.paymentTransaction.findUnique({ where: { id: transactionId } });
    expect(tx?.status).toBe(PaymentStatus.CONFIRMED);
    expect(tx?.creditedAt).toBeTruthy();

    await app.close();
  });

  it('enforces webhook IP allowlist', async () => {
    const { app, config } = await buildTestApp({
      PAYMENTS_WEBHOOK_IP_ALLOWLIST_JAZZCASH: '10.0.0.1'
    });

    const payload = {
      provider: PaymentProvider.JAZZCASH,
      transactionId: 'missing',
      providerTransactionId: 'prov',
      status: PaymentStatus.CONFIRMED,
      amount: '10.00',
      currency: 'PKR'
    };

    const signature = signWebhook(payload, config.providers.jazzcash.hmacSecret);

    const res = await app.inject({
      method: 'POST',
      url: '/api/payment/webhook',
      payload: { ...payload, signature },
      remoteAddress: '10.0.0.2'
    });

    expect(res.statusCode).toBe(403);

    await app.close();
  });

  it('reconciles old pending payments to EXPIRED (admin only)', async () => {
    const { app, prisma } = await buildTestApp();

    await prisma.user.create({ data: { id: 'user_1', role: 'user' } });

    const tx = await prisma.paymentTransaction.create({
      data: {
        id: 'tx_old',
        userId: 'user_1',
        provider: PaymentProvider.SADAPAY,
        amount: '5.00',
        currency: 'PKR',
        status: PaymentStatus.PENDING
      }
    });

    await prisma.paymentTransaction.update({
      where: { id: tx.id },
      data: {
        createdAt: new Date(Date.now() - 31 * 60 * 1000)
      }
    });

    const resForbidden = await app.inject({
      method: 'POST',
      url: '/api/payment/reconcile/tx_old',
      headers: { 'x-user-id': 'user_1', 'x-user-role': 'user' }
    });
    expect(resForbidden.statusCode).toBe(403);

    const res = await app.inject({
      method: 'POST',
      url: '/api/payment/reconcile/tx_old',
      headers: { 'x-user-id': 'admin_1', 'x-user-role': 'admin' }
    });

    expect(res.statusCode).toBe(200);
    expect(res.json().transaction.status).toBe(PaymentStatus.EXPIRED);

    await app.close();
  });

  afterEach(async () => {
    // safety, in case a test fails before closing
  });
});
