import type { PaymentProviderAdapter, RedirectContext, VerifiedWebhook } from './types.js';
import { PaymentProvider, PaymentStatus, type PaymentTransaction } from '@prisma/client';
import { isIpAllowed, verifyWebhookSignature } from './common.js';
import type { AppConfig } from '../../../config.js';

export class EasypaisaAdapter implements PaymentProviderAdapter {
  provider = PaymentProvider.EASYPaisa;

  constructor(private readonly config: AppConfig['providers']['easypaisa']) {}

  buildRedirectUrl(ctx: RedirectContext): string {
    const url = new URL(this.config.baseUrl);
    url.searchParams.set('orderId', ctx.transactionId);
    url.searchParams.set('userId', ctx.userId);
    url.searchParams.set('amount', ctx.amount);
    url.searchParams.set('currency', ctx.currency);
    if (ctx.returnUrl) url.searchParams.set('returnUrl', ctx.returnUrl);
    return url.toString();
  }

  isWebhookIpAllowed(ip: string): boolean {
    return isIpAllowed(ip, this.config.webhookIpAllowlist);
  }

  verifyWebhookSignature(payload: VerifiedWebhook, signature: string): boolean {
    return verifyWebhookSignature(payload, this.config.hmacSecret, signature);
  }

  async fetchRemoteStatus(_transaction: PaymentTransaction): Promise<PaymentStatus> {
    return PaymentStatus.PENDING;
  }
}
