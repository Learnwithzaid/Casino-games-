import { describe, expect, it } from 'vitest';
import { loadConfig } from '../src/config.js';
import { buildProviderRegistry } from '../src/modules/payments/providers/index.js';
import { signWebhook } from '../src/modules/payments/providers/common.js';
import { PaymentProvider, PaymentStatus } from '@prisma/client';

describe('provider adapters', () => {
  const config = loadConfig({
    ...process.env,
    PAYMENTS_HMAC_SECRET_JAZZCASH: 'jazz-secret',
    PAYMENTS_HMAC_SECRET_EASYPaisa: 'easy-secret',
    PAYMENTS_HMAC_SECRET_SADAPAY: 'sada-secret',
    JAZZCASH_BASE_URL: 'https://example.com/jazz',
    EASYPaisa_BASE_URL: 'https://example.com/easy',
    SADAPAY_BASE_URL: 'https://example.com/sada'
  });

  const adapters = buildProviderRegistry(config);

  it('builds provider-specific redirect URLs', () => {
    const common = { transactionId: 'tx', userId: 'u1', amount: '10.00', currency: 'PKR', returnUrl: 'https://return' };

    expect(adapters[PaymentProvider.JAZZCASH].buildRedirectUrl(common)).toContain('txId=tx');
    expect(adapters[PaymentProvider.EASYPaisa].buildRedirectUrl(common)).toContain('orderId=tx');
    expect(adapters[PaymentProvider.SADAPAY].buildRedirectUrl(common)).toContain('transaction_id=tx');
  });

  it('verifies webhook signatures per provider secret', () => {
    const payload = {
      transactionId: 'tx',
      providerTransactionId: 'p1',
      status: PaymentStatus.CONFIRMED,
      amount: '10.00',
      currency: 'PKR'
    };

    const jazzSig = signWebhook(payload, config.providers.jazzcash.hmacSecret);
    expect(adapters[PaymentProvider.JAZZCASH].verifyWebhookSignature(payload, jazzSig)).toBe(true);

    const easySig = signWebhook(payload, config.providers.easypaisa.hmacSecret);
    expect(adapters[PaymentProvider.EASYPaisa].verifyWebhookSignature(payload, easySig)).toBe(true);

    const wrong = signWebhook(payload, 'wrong');
    expect(adapters[PaymentProvider.SADAPAY].verifyWebhookSignature(payload, wrong)).toBe(false);
  });
});
