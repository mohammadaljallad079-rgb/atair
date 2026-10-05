import { PrismaClient } from '@prisma/client';

declare global {
  // eslint-disable-next-line no-var
  var __atairPrisma: PrismaClient | undefined;
}

export const prisma =
  globalThis.__atairPrisma ??
  new PrismaClient({
    log: process.env.PRISMA_LOG === 'true' ? ['query', 'warn', 'error'] : ['warn', 'error'],
  });

if (process.env.NODE_ENV !== 'production') {
  globalThis.__atairPrisma = prisma;
}

export * from '@prisma/client';
export { Prisma } from '@prisma/client';
export default prisma;

export * from './permissions';
