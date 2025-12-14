import { describe, expect, it, vi } from 'vitest';
import pino from 'pino';
import { PaymentRetryQueue } from '../src/modules/payments/retry-queue.js';

describe('PaymentRetryQueue', () => {
  it('computes exponential backoff with a max cap', () => {
    const queue = new PaymentRetryQueue(
      { maxRetries: 5, baseDelayMs: 100, maxDelayMs: 250 },
      pino({ level: 'silent' }),
      async () => {}
    );

    expect(queue.computeDelayMs(1)).toBe(100);
    expect(queue.computeDelayMs(2)).toBe(200);
    expect(queue.computeDelayMs(3)).toBe(250);
  });

  it('retries processor failures', async () => {
    vi.useFakeTimers();

    const processor = vi.fn().mockRejectedValueOnce(new Error('fail')).mockResolvedValueOnce(undefined);

    const queue = new PaymentRetryQueue(
      { maxRetries: 2, baseDelayMs: 10, maxDelayMs: 10 },
      pino({ level: 'silent' }),
      processor
    );

    queue.enqueue('tx', 1);

    await vi.runAllTimersAsync();

    expect(processor).toHaveBeenCalledTimes(2);

    vi.useRealTimers();
  });
});
