import { generateHmacSha256Hex, verifyHmacSha256Hex } from '../signature.js';
import type { VerifiedWebhook } from './types.js';

export function buildSignaturePayload(payload: VerifiedWebhook): Record<string, unknown> {
  return {
    transactionId: payload.transactionId,
    providerTransactionId: payload.providerTransactionId ?? '',
    status: payload.status,
    amount: payload.amount,
    currency: payload.currency
  };
}

export function signWebhook(payload: VerifiedWebhook, secret: string): string {
  return generateHmacSha256Hex(buildSignaturePayload(payload), secret);
}

export function verifyWebhookSignature(payload: VerifiedWebhook, secret: string, signature: string): boolean {
  return verifyHmacSha256Hex(buildSignaturePayload(payload), secret, signature);
}

export function isIpAllowed(ip: string, allowlist: string[]): boolean {
  if (allowlist.length === 0) return true;
  return allowlist.includes(ip);
}
