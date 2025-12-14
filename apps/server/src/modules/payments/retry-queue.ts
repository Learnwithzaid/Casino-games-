import type { Logger } from 'pino';

export type RetryConfig = {
  maxRetries: number;
  baseDelayMs: number;
  maxDelayMs: number;
};

export class PaymentRetryQueue {
  private readonly timeouts = new Map<string, NodeJS.Timeout>();

  constructor(
    readonly config: RetryConfig,
    private readonly logger: Logger,
    private readonly processor: (transactionId: string) => Promise<void>
  ) {}

  computeDelayMs(attempt: number): number {
    const delay = this.config.baseDelayMs * 2 ** Math.max(0, attempt - 1);
    return Math.min(delay, this.config.maxDelayMs);
  }

  enqueue(transactionId: string, attempt: number) {
    if (attempt > this.config.maxRetries) {
      this.logger.error({ transactionId, attempt }, 'payment retry attempts exhausted');
      return;
    }

    if (this.timeouts.has(transactionId)) return;

    const delayMs = this.computeDelayMs(attempt);

    const timeout = setTimeout(async () => {
      this.timeouts.delete(transactionId);

      try {
        await this.processor(transactionId);
      } catch (err) {
        this.logger.error({ err, transactionId, attempt }, 'payment retry processor failed');
        this.enqueue(transactionId, attempt + 1);
      }
    }, delayMs);

    this.timeouts.set(transactionId, timeout);
  }

  clearAll() {
    for (const t of this.timeouts.values()) clearTimeout(t);
    this.timeouts.clear();
  }
}
