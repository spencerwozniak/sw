import { timingSafeEqual } from 'node:crypto';

/** Vercel Cron calls with `Authorization: Bearer <CRON_SECRET>`. A missing or short secret authorizes nobody. */
export function isCronAuthorized(header: string | null, secret: string | undefined): boolean {
  if (!secret || secret.length < 16 || !header) return false;
  const expected = Buffer.from(`Bearer ${secret}`);
  const actual = Buffer.from(header);
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}
