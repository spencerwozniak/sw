// Shared helpers for the browser checks. Run through `npm run verify:admin`, which loads .env.verify.
import { mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { chromium } from 'playwright-core';
import pg from 'pg';

export const BASE = process.env.BASE || 'http://localhost:3104';
export const PASSWORD = process.env.ADMIN_TEST_PASSWORD || 'verify-password-123';
export const SHOTS = process.env.SHOT_DIR || join(tmpdir(), 'sw-verify-shots');
mkdirSync(SHOTS, { recursive: true });

export const launch = () => chromium.launch({ channel: 'chrome' });

/** Failed logins from earlier runs would trip the lockout, so start each run clean. */
export async function resetLoginAttempts() {
  const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  try {
    await client.query('TRUNCATE "LoginAttempt"');
  } finally {
    await client.end();
  }
}

export async function signIn(page) {
  await page.goto(`${BASE}/admin/login`);
  await page.getByLabel('Password').fill(PASSWORD);
  await page.getByRole('button', { name: /sign in/i }).click();
  await page.waitForURL((u) => !u.pathname.endsWith('/login'), { waitUntil: 'commit' });
}

/** Print the results, and exit non-zero if any check is false. */
export function finish(results, errors = []) {
  console.log(JSON.stringify(results, null, 1));
  if (errors.length) console.log('page errors:', errors);
  const failed = Object.entries(results).filter(([, ok]) => !ok).map(([name]) => name);
  if (failed.length) console.log('FAILED:', failed.join(', '));
  process.exit(failed.length ? 1 : 0);
}
