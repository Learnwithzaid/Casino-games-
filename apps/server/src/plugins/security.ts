import type { FastifyPluginAsync } from 'fastify';
import helmet from '@fastify/helmet';

export const securityPlugin: FastifyPluginAsync = async (app) => {
  // Configure Helmet for security headers
  await app.register(helmet, {
    contentSecurityPolicy: app.config.security.cspEnabled ? {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'"],
        imgSrc: ["'self'", "data:", "https:"],
        connectSrc: ["'self'"],
        fontSrc: ["'self'"],
        objectSrc: ["'none'"],
        mediaSrc: ["'self'"],
        frameSrc: ["'none'"],
        baseUri: ["'self'"],
        formAction: ["'self'"],
        frameAncestors: ["'none'"],
        upgradeInsecureRequests: app.config.nodeEnv === 'production' ? [] : null,
        reportUri: app.config.security.cspReportUri || '/api/csp-report',
        ...(app.config.nodeEnv === 'development' && {
          scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
          styleSrc: ["'self'", "'unsafe-inline'"]
        })
      }
    } : false,
    hsts: app.config.security.hstsEnabled ? {
      maxAge: app.config.security.hstsMaxAge,
      includeSubDomains: true,
      preload: true
    } : false,
    referrerPolicy: { policy: "strict-origin-when-cross-origin" },
    permittedPolicies: false,
    crossOriginEmbedderPolicy: false,
    crossOriginOpenerPolicy: false,
    crossOriginResourcePolicy: { policy: "same-origin" },
    dnsPrefetchControl: { allow: false },
    frameguard: { action: "deny" },
    hidePoweredBy: true,
    ieNoOpen: true,
    noSniff: true,
    originAgentCluster: true,
    permittedPolicies: false,
    xssFilter: true
  });

  // Add custom security headers
  app.addHook('onSend', async (request, reply, payload) => {
    // Force HTTPS in production
    if (app.config.nodeEnv === 'production' && request.headers['x-forwarded-proto'] !== 'https') {
      reply.redirect(301, `https://${request.headers.host}${request.url}`);
      return;
    }

    // Remove server fingerprinting
    reply.header('Server', '');
    reply.header('X-Powered-By', '');

    // Security headers
    reply.header('X-Content-Type-Options', 'nosniff');
    reply.header('X-Frame-Options', 'DENY');
    reply.header('X-XSS-Protection', '1; mode=block');
    reply.header('Referrer-Policy', 'strict-origin-when-cross-origin');
    reply.header('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');

    // Prevent MIME type sniffing
    reply.header('X-Content-Type-Options', 'nosniff');

    return payload;
  });

  // CSRF protection for state-changing requests
  app.addHook('preHandler', async (request, reply) => {
    const isStateChanging = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(request.method);
    const isFormSubmission = request.headers['content-type']?.includes('application/x-www-form-urlencoded');

    if (isStateChanging && isFormSubmission && !request.headers['x-csrf-token']) {
      return reply.code(403).send({
        error: 'CSRF_TOKEN_MISSING',
        message: 'CSRF token is required for state-changing requests',
        timestamp: new Date().toISOString()
      });
    }

    // Validate CSRF token if present
    if (isStateChanging && request.headers['x-csrf-token']) {
      const csrfToken = request.headers['x-csrf-token'] as string;
      const sessionToken = request.cookies?.session;

      if (!sessionToken || !validateCsrfToken(csrfToken, sessionToken)) {
        return reply.code(403).send({
          error: 'CSRF_TOKEN_INVALID',
          message: 'Invalid CSRF token',
          timestamp: new Date().toISOString()
        });
      }
    }
  });
};

// Simple CSRF token validation (in production, use a more robust implementation)
function validateCsrfToken(token: string, sessionToken: string): boolean {
  // Basic validation - in production, implement proper CSRF protection
  return token && sessionToken && token.length > 0 && sessionToken.length > 0;
}