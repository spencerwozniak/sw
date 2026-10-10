import { getDb } from '@/lib/db';
import type { AttemptStore } from './rate-limit';

const KEEP_MS = 24 * 60 * 60 * 1000;

/** Production attempt store: serverless memory does not persist, so failures live in Postgres. */
export function prismaAttemptStore(): AttemptStore {
  return {
    async failuresSince(key, since) {
      const rows = await getDb().loginAttempt.findMany({
        where: { ipHash: key, at: { gte: since } },
        orderBy: { at: 'asc' },
        select: { at: true },
      });
      return rows.map((row) => row.at);
    },
    async recordFailure(key, at) {
      const db = getDb();
      await db.loginAttempt.create({ data: { ipHash: key, at } });
      await db.loginAttempt.deleteMany({ where: { at: { lt: new Date(at.getTime() - KEEP_MS) } } });
    },
    async clear(key) {
      await getDb().loginAttempt.deleteMany({ where: { ipHash: key } });
    },
  };
}
