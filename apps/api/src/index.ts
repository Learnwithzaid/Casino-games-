import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { config } from './config';
import { generalLimiter } from './middleware/rate-limit.middleware';
import authRoutes from './routes/auth.routes';
import adminRoutes from './routes/admin.routes';
import cors from 'cors';
import helmet from 'helmet';

import { config } from './config';
import { logger, morganMiddleware } from './middleware/logger';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';
import healthRouter from './routes/health';

const app = express();

app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(generalLimiter);

app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);

app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Error:', err);
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error',
  });
});

const PORT = config.port;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Environment: ${config.nodeEnv}`);
});
app.use(
  cors({
    origin: config.CORS_ORIGIN.split(',').map((origin) => origin.trim()),
    credentials: true,
  })
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morganMiddleware);

app.get('/', (_req, res) => {
  res.json({
    message: 'API is running',
    version: '1.0.0',
    environment: config.NODE_ENV,
  });
});

app.use('/health', healthRouter);

app.use(notFoundHandler);
app.use(errorHandler);

const server = app.listen(config.API_PORT, config.API_HOST, () => {
  logger.info(
    `API server started on http://${config.API_HOST}:${config.API_PORT}`
  );
  logger.info(`Environment: ${config.NODE_ENV}`);
});

const gracefulShutdown = (signal: string) => {
  logger.info(`${signal} received, closing server gracefully`);
  server.close(() => {
    logger.info('Server closed');
    process.exit(0);
  });

  setTimeout(() => {
    logger.error('Forced shutdown after timeout');
    process.exit(1);
  }, 10000);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

export default app;
