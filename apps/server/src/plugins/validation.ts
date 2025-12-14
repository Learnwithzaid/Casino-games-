import type { FastifyPluginAsync, FastifyReply, FastifyRequest } from 'fastify';
import { ZodError } from 'zod';

// Simple server-side sanitization without external dependencies
const sanitizeString = (input: string): string => {
  if (typeof input !== 'string') return input;
  
  // Basic XSS prevention for server-side usage
  return input
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
    .replace(/javascript:/gi, '')
    .replace(/on\w+="[^"]*"/gi, '')
    .replace(/on\w+='[^']*'/gi, '')
    .replace(/on\w+=\w+/gi, '')
    .replace(/<[^>]*>/g, ''); // Remove any other HTML tags
};

declare module 'fastify' {
  interface FastifyRequest {
    validatedBody?: any;
    validatedParams?: any;
    validatedQuery?: any;
    sanitizedOutput?: any;
  }
}

export function sanitizeObject(obj: any): any {
  if (typeof obj === 'string') {
    return sanitizeString(obj);
  }
  
  if (Array.isArray(obj)) {
    return obj.map(sanitizeObject);
  }
  
  if (obj && typeof obj === 'object') {
    const sanitized: any = {};
    for (const [key, value] of Object.entries(obj)) {
      sanitized[key] = sanitizeObject(value);
    }
    return sanitized;
  }
  
  return obj;
}

export interface ValidationSchemas {
  body?: any;
  params?: any;
  query?: any;
}

export function createValidationMiddleware(schemas: ValidationSchemas) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      // Validate and sanitize body
      if (schemas.body) {
        const bodyResult = schemas.body.safeParse(request.body);
        if (!bodyResult.success) {
          return reply.code(400).send({
            error: 'VALIDATION_ERROR',
            message: 'Request body validation failed',
            details: bodyResult.error.flatten(),
            timestamp: new Date().toISOString(),
            path: request.url,
            method: request.method
          });
        }
        request.validatedBody = sanitizeObject(bodyResult.data);
      }

      // Validate and sanitize params
      if (schemas.params) {
        const paramsResult = schemas.params.safeParse(request.params);
        if (!paramsResult.success) {
          return reply.code(400).send({
            error: 'VALIDATION_ERROR',
            message: 'URL parameters validation failed',
            details: paramsResult.error.flatten(),
            timestamp: new Date().toISOString(),
            path: request.url,
            method: request.method
          });
        }
        request.validatedParams = sanitizeObject(paramsResult.data);
      }

      // Validate and sanitize query
      if (schemas.query) {
        const queryResult = schemas.query.safeParse(request.query);
        if (!queryResult.success) {
          return reply.code(400).send({
            error: 'VALIDATION_ERROR',
            message: 'Query parameters validation failed',
            details: queryResult.error.flatten(),
            timestamp: new Date().toISOString(),
            path: request.url,
            method: request.method
          });
        }
        request.validatedQuery = sanitizeObject(queryResult.data);
      }
    } catch (error) {
      if (error instanceof ZodError) {
        return reply.code(400).send({
          error: 'VALIDATION_ERROR',
          message: 'Request validation failed',
          details: error.flatten(),
          timestamp: new Date().toISOString(),
          path: request.url,
          method: request.method
        });
      }
      
      request.log.error({ err: error }, 'Validation middleware error');
      return reply.code(500).send({
        error: 'INTERNAL_ERROR',
        message: 'An internal error occurred during validation',
        timestamp: new Date().toISOString(),
        path: request.url,
        method: request.method
      });
    }
  };
}

export const validationPlugin: FastifyPluginAsync = async (app) => {
  // Global validation error handler
  app.setErrorHandler((error, request, reply) => {
    if (error instanceof ZodError) {
      return reply.code(400).send({
        error: 'VALIDATION_ERROR',
        message: 'Request validation failed',
        details: error.flatten(),
        timestamp: new Date().toISOString(),
        path: request.url,
        method: request.method
      });
    }

    // Log other errors
    request.log.error({ 
      err: error,
      url: request.url,
      method: request.method,
      ip: request.ip,
      userAgent: request.headers['user-agent']
    }, 'Unhandled error');

    // Don't leak error details in production
    if (app.config.nodeEnv === 'production') {
      return reply.code(500).send({
        error: 'INTERNAL_ERROR',
        message: 'An internal error occurred',
        timestamp: new Date().toISOString(),
        path: request.url,
        method: request.method
      });
    }

    return reply.code(500).send({
      error: 'INTERNAL_ERROR',
      message: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString(),
      path: request.url,
      method: request.method
    });
  });
};