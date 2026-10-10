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

## 6. Uploads

Photos and videos are added at `/admin/upload`. Each photo is uploaded straight from the
browser to the **private** store, then processed on the server: the camera, date and GPS are
read, the GPS is turned into a place name (OpenStreetMap's Nominatim service, at most one
lookup per second, identified by `NOMINATIM_USER_AGENT`), and a copy with all metadata removed
is saved to the **public** store. Only that copy and the place name are ever public.

Videos go straight to the public store exactly as uploaded. **A video shot with location
services on carries its filming location inside the file, and that stays public.**

A daily job (`vercel.json`) deletes uploads that never finished. Set `CRON_SECRET` in Vercel
so only Vercel can call it. You can also run it from the admin with `POST /api/admin/cleanup`.

## 7. Articles

Essays and publications live in the database and are written at `/admin/articles`. New items
start as drafts and autosave as you type. A draft cannot be seen on the site until you press
**Publish**, which needs a title, a topic, a URL name and some text. Once an article is live,
edits are **not** autosaved: press **Save changes** when you want them to go out.

Images dragged into an article go to the public store with all metadata removed (the editor
shrinks them first; the limit is 4 MB). Equations are typed as TeX and drawn on the server, so
visitors need no JavaScript to read them.

### Moving the existing articles into the database (once)

The 31 essays and 2 publications currently live in `src/data/articles.json` and
`src/data/publications.json`. **Do this before deploying the version of the site that reads
articles from the database**, otherwise `/writing` would be empty.

```bash
npm run db:deploy               # production DATABASE_URL in your shell: creates the Article tables
npm run articles:migrate        # dry run: converts everything and reports; writes nothing
npm run articles:migrate -- --apply
```

The dry run checks that every article converts with no text lost and that every equation
renders. `--apply` writes to the database named in `.env.local`, so check that file first. It is
safe to run again: items already there are updated in place. Afterwards, open `/writing` and a
few articles on the deployed site. The two JSON files stay in the repository as a rollback and
should only be deleted once you are happy.

To check the article image pipeline against your real public store: `npm run assets:check`.

## 8. Tests that touch the database

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
