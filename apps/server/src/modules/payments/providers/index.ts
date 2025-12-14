import type { AppConfig } from '../../../config.js';
import type { PaymentProviderAdapter } from './types.js';
import { JazzCashAdapter } from './jazzcash.js';
import { EasypaisaAdapter } from './easypaisa.js';
import { SadaPayAdapter } from './sadapay.js';
import { PaymentProvider } from '@prisma/client';

export function buildProviderRegistry(config: AppConfig): Record<PaymentProvider, PaymentProviderAdapter> {
  const jazzcash = new JazzCashAdapter(config.providers.jazzcash);
  const easypaisa = new EasypaisaAdapter(config.providers.easypaisa);
  const sadapay = new SadaPayAdapter(config.providers.sadapay);

  return {
    [PaymentProvider.JAZZCASH]: jazzcash,
    [PaymentProvider.EASYPaisa]: easypaisa,
    [PaymentProvider.SADAPAY]: sadapay
  };
}
