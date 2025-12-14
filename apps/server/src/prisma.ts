import { PrismaClient } from '@prisma/client';

export function createPrismaClient(databaseUrl?: string) {
  return new PrismaClient({
    datasourceUrl: databaseUrl
  });
}
