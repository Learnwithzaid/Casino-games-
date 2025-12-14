import { buildApp } from './app.js';
import { loadConfig } from './config.js';
import { buildLogger } from './logger.js';
import { createPrismaClient } from './prisma.js';

const config = loadConfig();
const logger = buildLogger();
const prisma = createPrismaClient(config.databaseUrl);

const app = await buildApp({ prisma, config, logger });

await app.listen({ port: config.port, host: '0.0.0.0' });
