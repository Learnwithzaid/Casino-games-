import { createHmac, timingSafeEqual } from 'node:crypto';

export function canonicalizePayload(payload: Record<string, unknown>): string {
  const entries = Object.entries(payload)
    .filter(([, v]) => v !== undefined)
    .map(([k, v]) => {
      if (v === null) return [k, 'null'] as const;
      if (typeof v === 'string') return [k, v] as const;
      if (typeof v === 'number') return [k, String(v)] as const;
      if (typeof v === 'boolean') return [k, v ? 'true' : 'false'] as const;
      return [k, JSON.stringify(v)] as const;
    })
    .sort(([a], [b]) => a.localeCompare(b));

  return entries.map(([k, v]) => `${k}=${v}`).join('&');
}

export function generateHmacSha256Hex(payload: Record<string, unknown>, secret: string): string {
  const data = canonicalizePayload(payload);
  return createHmac('sha256', secret).update(data).digest('hex');
}

export function verifyHmacSha256Hex(
  payload: Record<string, unknown>,
  secret: string,
  providedSignature: string
): boolean {
  const expected = generateHmacSha256Hex(payload, secret);

  const a = Buffer.from(expected, 'hex');
  const b = Buffer.from(providedSignature, 'hex');

  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}
