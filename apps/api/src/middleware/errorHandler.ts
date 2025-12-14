import { Request, Response, NextFunction } from 'express';

import { logger } from './logger';

export class AppError extends Error {
  statusCode: number;
  isOperational: boolean;

  constructor(message: string, statusCode: number = 500) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

export const errorHandler = (
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction
) => {
  if (err instanceof AppError) {
    logger.error({
      message: err.message,
      statusCode: err.statusCode,
      url: req.url,
      method: req.method,
      stack: err.stack,
    });

    return res.status(err.statusCode).json({
      status: 'error',
      message: err.message,
    });
  }

  logger.error({
    message: err.message,
    url: req.url,
    method: req.method,
    stack: err.stack,
  });

  return res.status(500).json({
    status: 'error',
    message: 'Internal server error',
  });
};

export const notFoundHandler = (req: Request, res: Response) => {
  res.status(404).json({
    status: 'error',
    message: `Route ${req.method} ${req.url} not found`,
  });
};
