import { getDb } from '@/lib/db';
import { WINDOW_MS, lockStatus, type AttemptStore } from './rate-limit';

const KEEP_MS = 24 * 60 * 60 * 1000;
const pastRetention = (at: Date) => ({ at: { lt: new Date(at.getTime() - KEEP_MS) } });

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
      await db.loginAttempt.deleteMany({ where: pastRetention(at) });
    },
    async clear(key) {
      await getDb().loginAttempt.deleteMany({ where: { ipHash: key } });
    },
    reserveAttempt(key, now) {
      return getDb().$transaction(async (tx) => {
        // Serialise attempts from one client for the length of this short transaction. Without
        // the lock, concurrent requests could all count 4 failures and all take the 5th slot.
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${key}))`;
        const rows = await tx.loginAttempt.findMany({
          where: { ipHash: key, at: { gte: new Date(now.getTime() - WINDOW_MS) } },
          orderBy: { at: 'asc' },
          select: { at: true },
        });
        const decision = lockStatus(rows.map((row) => row.at), now);
        if (decision.allowed) {
          await tx.loginAttempt.create({ data: { ipHash: key, at: now } });
          await tx.loginAttempt.deleteMany({ where: pastRetention(now) });
        }
        return decision;
      });
    },
  };
}
