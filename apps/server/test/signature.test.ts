import { describe, expect, it } from 'vitest';
import { canonicalizePayload, generateHmacSha256Hex, verifyHmacSha256Hex } from '../src/modules/payments/signature.js';

describe('signature', () => {
  it('canonicalizePayload sorts keys and formats primitives', () => {
    const s = canonicalizePayload({ b: 2, a: 'x', c: true });
    expect(s).toBe('a=x&b=2&c=true');
  });

  it('generates and verifies HMAC-SHA256 hex signatures', () => {
    const payload = { transactionId: 'tx_1', amount: '10.00', currency: 'PKR' };
    const secret = 'secret';

    const sig = generateHmacSha256Hex(payload, secret);
    expect(sig).toMatch(/^[0-9a-f]{64}$/);

    expect(verifyHmacSha256Hex(payload, secret, sig)).toBe(true);
    expect(verifyHmacSha256Hex(payload, secret, sig.slice(2) + 'aa')).toBe(false);
  });
});
