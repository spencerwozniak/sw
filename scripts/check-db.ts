// Usage: npm run db:check   (reads .env.local)
// Verifies DATABASE_URL works and that migrations are applied. Never prints the URL.
import { Client } from 'pg';

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) fail('DATABASE_URL is not set (put it in .env.local; see docs/admin-setup.md)');
  if (url.startsWith('prisma+postgres://')) {
    fail('DATABASE_URL is a prisma+postgres:// URL. Use the direct postgres:// connection string from the Prisma Postgres console instead.');
  }
  const host = new URL(url).host;
  const client = new Client({ connectionString: url });
  await client.connect();
  try {
    const version = await client.query<{ version: string }>('select version()');
    console.log(`connected to ${host}: ${version.rows[0].version.split(' ').slice(0, 2).join(' ')}`);
    const migrations = await client
      .query<{ migration_name: string }>('select migration_name from "_prisma_migrations" where finished_at is not null order by started_at')
      .catch(() => null);
    // db:deploy (prisma migrate deploy) reads DATABASE_URL from the shell, not from .env.local.
    if (!migrations) console.log('no migrations applied yet: export this database\'s DATABASE_URL in your shell (db:deploy does not read .env.local), then run `npm run db:deploy`');
    else console.log(`${migrations.rowCount} migration(s) applied: ${migrations.rows.map((r) => r.migration_name).join(', ')}`);
  } finally {
    await client.end();
  }
}

function fail(message: string): never {
  console.error(`FAIL: ${message}`);
  process.exit(1);
}

main().catch((error) => fail(error instanceof Error ? error.message : String(error)));
