import pino from 'pino';
import pinoHttp from 'pino-http';

export function buildLogger() {
  return pino({
    level: process.env.LOG_LEVEL ?? 'info',
    redact: {
      paths: [
        'req.headers.authorization',
        'req.headers.cookie',
        'payload.password',
        'payload.token',
        'payload.secret',
        'payload.hmac',
        'response.headers["set-cookie"]'
      ],
      remove: true
    },
    formatters: {
      level(label: string) {
        return { level: label };
      }
    },
    timestamp: pino.stdTimeFunctions.isoTime,
    base: undefined, // Remove default pid/hostname
    messageKey: 'message',
    levelKey: 'level',
    customLevels: {
      fatal: 60,
      error: 50,
      warn: 40,
      info: 30,
      debug: 20,
      trace: 10
    }
  });
}

export function buildHttpLogger() {
  return pinoHttp({
    logger: buildLogger(),
    autoLogging: {
      ignore: (req) => req.url === '/health' || req.url.startsWith('/api/payment/webhook')
    },
    customLogLevel: (res, err) => {
      if (err || res.statusCode >= 500) {
        return 'error';
      }
      if (res.statusCode >= 400) {
        return 'warn';
      }
      return 'info';
    },
    customSuccessMessage: (res) => {
      if (res.statusCode >= 400) {
        return 'Request failed with status code';
      }
      return 'Request completed';
    },
    customAttributeKeys: {
      reqId: 'requestId',
      res: 'response'
    },
    serializers: {
      req: pino.stdSerializers.req,
      res: pino.stdSerializers.res,
      err: pino.stdSerializers.err
    }
  });
}
