import { z } from 'zod';

const NonEmptyString = z.string().min(1);

const EnvSchema = z.object({
  PORT: z.coerce.number().int().positive().default(3000),
  DATABASE_URL: NonEmptyString.default('file:./prisma/dev.db'),
  CORS_ORIGIN: z.string().default('*'),

  PAYMENTS_HMAC_SECRET_JAZZCASH: NonEmptyString.default('change-me'),
  // Prefer the all-uppercase variants; the mixed-case variants are supported for backwards compatibility.
  PAYMENTS_HMAC_SECRET_EASYPAISA: NonEmptyString.optional(),
  PAYMENTS_HMAC_SECRET_EASYPaisa: NonEmptyString.optional(),
  PAYMENTS_HMAC_SECRET_SADAPAY: NonEmptyString.default('change-me'),

  PAYMENTS_WEBHOOK_IP_ALLOWLIST_JAZZCASH: z.string().optional(),
  PAYMENTS_WEBHOOK_IP_ALLOWLIST_EASYPAISA: z.string().optional(),
  PAYMENTS_WEBHOOK_IP_ALLOWLIST_EASYPaisa: z.string().optional(),
  PAYMENTS_WEBHOOK_IP_ALLOWLIST_SADAPAY: z.string().optional(),

  JAZZCASH_BASE_URL: NonEmptyString.default('https://payments.jazzcash.com.pk/redirect'),
  EASYPAISA_BASE_URL: NonEmptyString.optional(),
  EASYPaisa_BASE_URL: NonEmptyString.optional(),
  SADAPAY_BASE_URL: NonEmptyString.default('https://sadapay.pk/redirect'),

  PAYMENTS_MAX_RETRIES: z.coerce.number().int().min(0).default(5),
  PAYMENTS_RETRY_BASE_DELAY_MS: z.coerce.number().int().min(1).default(500),
  PAYMENTS_RETRY_MAX_DELAY_MS: z.coerce.number().int().min(1).default(30000)
});

export type AppConfig = {
  port: number;
  databaseUrl: string;
  corsOrigin: string;
  retry: {
    maxRetries: number;
    baseDelayMs: number;
    maxDelayMs: number;
  };
  providers: {
    jazzcash: {
      hmacSecret: string;
      baseUrl: string;
      webhookIpAllowlist: string[];
    };
    easypaisa: {
      hmacSecret: string;
      baseUrl: string;
      webhookIpAllowlist: string[];
    };
    sadapay: {
      hmacSecret: string;
      baseUrl: string;
      webhookIpAllowlist: string[];
    };
  };
};

function parseAllowlist(value?: string): string[] {
  if (!value) return [];
  return value
    .split(',')
    .map((v) => v.trim())
    .filter(Boolean);
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): AppConfig {
  const parsed = EnvSchema.parse(env);

  const easypaisaSecret =
    parsed.PAYMENTS_HMAC_SECRET_EASYPAISA ?? parsed.PAYMENTS_HMAC_SECRET_EASYPaisa ?? 'change-me';

  const easypaisaAllowlist = parseAllowlist(
    parsed.PAYMENTS_WEBHOOK_IP_ALLOWLIST_EASYPAISA ?? parsed.PAYMENTS_WEBHOOK_IP_ALLOWLIST_EASYPaisa
  );

  const easypaisaBaseUrl =
    parsed.EASYPAISA_BASE_URL ?? parsed.EASYPaisa_BASE_URL ?? 'https://easypaisa.com.pk/redirect';

  return {
    port: parsed.PORT,
    databaseUrl: parsed.DATABASE_URL,
    corsOrigin: parsed.CORS_ORIGIN,
    retry: {
      maxRetries: parsed.PAYMENTS_MAX_RETRIES,
      baseDelayMs: parsed.PAYMENTS_RETRY_BASE_DELAY_MS,
      maxDelayMs: parsed.PAYMENTS_RETRY_MAX_DELAY_MS
    },
    providers: {
      jazzcash: {
        hmacSecret: parsed.PAYMENTS_HMAC_SECRET_JAZZCASH,
        baseUrl: parsed.JAZZCASH_BASE_URL,
        webhookIpAllowlist: parseAllowlist(parsed.PAYMENTS_WEBHOOK_IP_ALLOWLIST_JAZZCASH)
      },
      easypaisa: {
        hmacSecret: easypaisaSecret,
        baseUrl: easypaisaBaseUrl,
        webhookIpAllowlist: easypaisaAllowlist
      },
      sadapay: {
        hmacSecret: parsed.PAYMENTS_HMAC_SECRET_SADAPAY,
        baseUrl: parsed.SADAPAY_BASE_URL,
        webhookIpAllowlist: parseAllowlist(parsed.PAYMENTS_WEBHOOK_IP_ALLOWLIST_SADAPAY)
      }
    }
  };
}
