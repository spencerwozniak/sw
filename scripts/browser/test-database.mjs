// The browser checks write to the database (they TRUNCATE tables), so they may only ever
// run against the throwaway Postgres from `npm run db:test`. Same rule as tests/db/helpers.ts.
export const THROWAWAY_DATABASE = /@(127\.0\.0\.1|localhost):54329\/swtest$/;

/** Returns the URL if it is the throwaway test database; throws otherwise (without printing the URL). */
export function assertThrowawayDatabase(url = process.env.DATABASE_URL) {
  if (!THROWAWAY_DATABASE.test(url ?? '')) {
    throw new Error(
      'Refusing to run: DATABASE_URL is not the throwaway test database (127.0.0.1:54329/swtest). ' +
        'Run the checks through `npm run verify:admin`, which uses .env.verify.'
    );
  }
  return url;
}
