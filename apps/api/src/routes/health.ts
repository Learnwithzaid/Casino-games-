import { Router, Request, Response } from 'express';
import { Pool } from 'pg';

import { config } from '../config';

const router = Router();

const pool = new Pool({
  host: config.DB_HOST,
  port: config.DB_PORT,
  database: config.DB_NAME,
  user: config.DB_USER,
  password: config.DB_PASSWORD,
});

router.get('/', async (_req: Request, res: Response) => {
  const healthcheck = {
    uptime: process.uptime(),
    message: 'OK',
    timestamp: Date.now(),
    environment: config.NODE_ENV,
  };

  try {
    await pool.query('SELECT 1');
    res.status(200).json({
      ...healthcheck,
      database: 'connected',
    });
  } catch (error) {
    res.status(503).json({
      ...healthcheck,
      database: 'disconnected',
      message: 'Service Unavailable',
    });
  }
});

export default router;
