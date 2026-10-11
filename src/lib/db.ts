import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@/generated/prisma/client';

// One client per server instance. Next.js dev reloads modules, so the instance
// lives on globalThis to avoid opening a new connection pool on every edit.
const globalForPrisma = globalThis as unknown as { __swPrisma?: PrismaClient };

function connectionString(): string {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL is not set. See docs/admin-setup.md.');
  if (url.startsWith('prisma+postgres://')) {
    throw new Error(
      'DATABASE_URL is a prisma+postgres:// URL. This app connects with the pg driver, so use the direct postgres:// connection string from the Prisma Postgres console.'
    );
  }
  return url;
}

/** Lazy so that importing this module never fails (e.g. during a build that touches no data). */
export function getDb(): PrismaClient {
  if (!globalForPrisma.__swPrisma) {
    // A small pool: each serverless instance handles few requests at once.
    globalForPrisma.__swPrisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: connectionString(), max: 5 }) });
  }
  return globalForPrisma.__swPrisma;
}
