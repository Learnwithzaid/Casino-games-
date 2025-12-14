import { z } from 'zod';

const NonEmptyString = z.string().min(1);

const EnvSchema = z.object({
  PORT: z.coerce.number().int().positive().default(3000),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  DATABASE_URL: NonEmptyString.default('file:./prisma/dev.db'),
  CORS_ORIGIN: z.string().default('*'),

  // JWT Configuration
  JWT_SECRET: NonEmptyString.default('your-jwt-secret-change-in-production'),
  JWT_ACCESS_EXPIRY: z.string().default('15m'),
  JWT_REFRESH_EXPIRY: z.string().default('7d'),
  JWT_ISSUER: z.string().default('payments-platform'),
  
  // Security Configuration
  RATE_LIMIT_STORAGE_URL: z.string().optional(), // Redis URL for distributed rate limiting
  RATE_LIMIT_STRATEGY: z.enum(['memory', 'redis']).default('memory'),
  MAX_FAILED_LOGIN_ATTEMPTS: z.coerce.number().int().min(1).max(10).default(5),
  LOCKOUT_DURATION_MINUTES: z.coerce.number().int().min(1).max(60).default(15),
  
  // CSP Configuration
  CSP_ENABLED: z.coerce.boolean().default(true),
  CSP_REPORT_URI: z.string().optional(),
  
  // HSTS Configuration
  HSTS_ENABLED: z.coerce.boolean().default(true),
  HSTS_MAX_AGE: z.coerce.number().int().default(31536000), // 1 year
  
  // Logging Configuration
  LOG_LEVEL: z.enum(['trace', 'debug', 'info', 'warn', 'error']).default('info'),
  LOG_REDACT_PATHS: z.string().default('req.headers.authorization,req.headers.cookie,payload.password,payload.token'),

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
  nodeEnv: 'development' | 'production' | 'test';
  databaseUrl: string;
  corsOrigin: string;
  jwt: {
    secret: string;
    accessExpiry: string;
    refreshExpiry: string;
    issuer: string;
  };
  security: {
    rateLimitStorageUrl?: string;
    rateLimitStrategy: 'memory' | 'redis';
    maxFailedLoginAttempts: number;
    lockoutDurationMinutes: number;
    cspEnabled: boolean;
    cspReportUri?: string;
    hstsEnabled: boolean;
    hstsMaxAge: number;
  };
  logging: {
    level: 'trace' | 'debug' | 'info' | 'warn' | 'error';
    redactPaths: string[];
  };
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

  const redactPaths = parsed.LOG_REDACT_PATHS.split(',').map(path => path.trim());

  return {
    port: parsed.PORT,
    nodeEnv: parsed.NODE_ENV,
    databaseUrl: parsed.DATABASE_URL,
    corsOrigin: parsed.CORS_ORIGIN,
    jwt: {
      secret: parsed.JWT_SECRET,
      accessExpiry: parsed.JWT_ACCESS_EXPIRY,
      refreshExpiry: parsed.JWT_REFRESH_EXPIRY,
      issuer: parsed.JWT_ISSUER
    },
    security: {
      rateLimitStorageUrl: parsed.RATE_LIMIT_STORAGE_URL,
      rateLimitStrategy: parsed.RATE_LIMIT_STRATEGY,
      maxFailedLoginAttempts: parsed.MAX_FAILED_LOGIN_ATTEMPTS,
      lockoutDurationMinutes: parsed.LOCKOUT_DURATION_MINUTES,
      cspEnabled: parsed.CSP_ENABLED,
      cspReportUri: parsed.CSP_REPORT_URI,
      hstsEnabled: parsed.HSTS_ENABLED,
      hstsMaxAge: parsed.HSTS_MAX_AGE
    },
    logging: {
      level: parsed.LOG_LEVEL,
      redactPaths
    },
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
