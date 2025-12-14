import type { PaymentProvider, PaymentStatus, PaymentTransaction } from '@prisma/client';

export type RedirectContext = {
  transactionId: string;
  userId: string;
  amount: string;
  currency: string;
  returnUrl?: string;
};

export type VerifiedWebhook = {
  transactionId: string;
  providerTransactionId?: string;
  status: PaymentStatus;
  amount: string;
  currency: string;
};

export interface PaymentProviderAdapter {
  provider: PaymentProvider;

  buildRedirectUrl(ctx: RedirectContext): string;

  isWebhookIpAllowed(ip: string): boolean;

  verifyWebhookSignature(payload: VerifiedWebhook, signature: string): boolean;

  fetchRemoteStatus(transaction: PaymentTransaction): Promise<PaymentStatus>;
}
