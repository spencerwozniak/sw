# Admin setup

The admin lives at `/admin`. It needs a Postgres database, two Vercel Blob stores
and one password. This page is the whole checklist.

## 1. Database

Create a Prisma Postgres database (or any Postgres) and copy its **direct**
connection string: it starts with `postgres://` or `postgresql://`. A
`prisma+postgres://` URL will not work, because the app connects with the `pg`
driver. That is `DATABASE_URL`.

Check it:

```bash
npm run db:check
```

It prints the host and which migrations are applied, never the URL.

## 2. Blob stores

In the Vercel dashboard create **two** Blob stores:

- **Public**: serves web copies, videos, posters and article images.
- **Private**: holds your untouched originals. Nothing in it is reachable by URL.

Copy each store's read-write token into `BLOB_PUBLIC_TOKEN` and `BLOB_PRIVATE_TOKEN`.

Check both, including that the private one really is private:

```bash
npm run blob:check
```

Every line must say `PASS`. If the private store check fails with an access error,
your plan may not include private Blob storage; stop and ask before continuing.

## 3. Admin password

```bash
npm run admin:hash
```

Type a password of at least 12 characters twice. It prints `ADMIN_PASSWORD_HASH` and
`SESSION_SECRET`. Only the hash is stored, never the password. Changing
`SESSION_SECRET` signs you out everywhere.

## 4. Environment variables

Put everything from `.env.example` in:

- `.env.local` for local development (the file is git-ignored), and
- the Vercel project settings, for **Production** and **Preview**.

Use a **different database** for Preview than for Production, so a preview deploy
can never touch live content. Use separate Blob stores for local development
if you can; otherwise everything you try locally lands in the real stores.

## 5. Database migrations

Local development database (needs Docker):

```bash
npm run db:dev      # starts Postgres on port 54330 and applies migrations
```

Production: apply migrations **before** deploying code that needs them. With the
production `DATABASE_URL` in your shell:

```bash
npm run db:deploy
```

`db:deploy` only applies migrations that are already committed; it never resets or
drops anything. Afterwards run `unset DATABASE_URL`, so the production URL does not
linger in that shell. (`npm run verify:start` and `npm run verify:admin` ignore
variables from your shell and refuse any database but the throwaway one, but other
tools will not.)

## 6. Tests that touch the database

```bash
npm run db:test     # starts a throwaway Postgres on port 54329 and applies migrations (needs Docker)
npm run test:db     # runs tests/db against it; it does not start the database itself
```

Run `db:test` first, or `test:db` fails with a connection error. These tests refuse to run against anything but that throwaway database.

## Troubleshooting

| Symptom | Cause |
|---|---|
| `DATABASE_URL is a prisma+postgres:// URL` | Use the direct `postgres://` string from the Prisma Postgres console. |
| `Admin login is not configured on this server.` | `SESSION_SECRET` (32+ characters) or `ADMIN_PASSWORD_HASH` is missing in this environment. |
| `Too many attempts` at login | 5 wrong passwords in 15 minutes; wait, or clear the `LoginAttempt` table. |
| `BLOB_PUBLIC_TOKEN is not set` | Add the token to `.env.local` (local) or Vercel (deployed). |
