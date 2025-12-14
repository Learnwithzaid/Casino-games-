export const config = {
  port: process.env.PORT || 3000,
  nodeEnv: process.env.NODE_ENV || 'development',
  
  jwt: {
    accessTokenSecret: process.env.JWT_ACCESS_SECRET || 'default-access-secret-change-in-production',
    refreshTokenSecret: process.env.JWT_REFRESH_SECRET || 'default-refresh-secret-change-in-production',
    accessTokenExpiry: process.env.JWT_ACCESS_EXPIRY || '15m',
    refreshTokenExpiry: process.env.JWT_REFRESH_EXPIRY || '7d',
  },
  
  security: {
    maxLoginAttempts: parseInt(process.env.MAX_LOGIN_ATTEMPTS || '5', 10),
    lockoutDuration: parseInt(process.env.LOCKOUT_DURATION_MINUTES || '15', 10),
    emailVerificationExpiry: parseInt(process.env.EMAIL_VERIFICATION_EXPIRY_HOURS || '24', 10),
    passwordResetExpiry: parseInt(process.env.PASSWORD_RESET_EXPIRY_HOURS || '1', 10),
  },
  
  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10),
    maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100', 10),
    authWindowMs: parseInt(process.env.AUTH_RATE_LIMIT_WINDOW_MS || '900000', 10),
    authMaxRequests: parseInt(process.env.AUTH_RATE_LIMIT_MAX_REQUESTS || '10', 10),
  },
  
  cookie: {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict' as const,
    maxAge: 7 * 24 * 60 * 60 * 1000,
  },
  
  database: {
    url: process.env.DATABASE_URL || 'postgresql://user:password@localhost:5432/authdb',
  },
};
