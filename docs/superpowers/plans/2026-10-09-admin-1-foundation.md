# Admin Foundation Implementation Plan (plan 1 of 4)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give the site a Postgres database, two Vercel Blob stores, a password-protected `/admin` shell in the site's own style, and the UI-kit pieces every later admin screen needs.

**Architecture:** Prisma 7 (with the `pg` driver adapter) talks to Postgres through one lazily created client (`getDb()`). Admin access is a single password checked with scrypt, a signed cookie verified with Web Crypto (so the same code runs in middleware and in Node), a Postgres-backed login throttle, and a guard that every route handler and server action re-checks. The admin is ordinary Next.js pages under `/admin` that reuse the site's tokens and UI kit; new primitives are added to that kit.

**Tech Stack:** Next.js 15 (App Router, React 19), Prisma 7.10.0 + `@prisma/adapter-pg` + `pg`, `@vercel/blob` 2.8.1, Tailwind v4 tokens already in `src/app/globals.css`, `tsx --test` for tests, Docker Postgres for database tests, `playwright-core` for browser checks.

**Spec:** `docs/superpowers/specs/2026-10-09-admin-media-writing-design.md`

**This is plan 1 of 4.** Later plans build on the interfaces produced here: 2 Media admin, 3 Rich-text editor and writing, 4 Collections and public media. Each is deployable on its own.

## Global Constraints

- Prisma and `@prisma/client` **7.10.0** with `@prisma/adapter-pg` and `pg`; generator `prisma-client` with `importFileExtension = ""`; `DATABASE_URL` must be a standard `postgres://` connection string, never `prisma+postgres://`.
- `@vercel/blob` **2.8.1**; two stores: public (`BLOB_PUBLIC_TOKEN`) and private (`BLOB_PRIVATE_TOKEN`). Private blobs are never reachable by URL.
- Admin login is a single password stored only as a scrypt hash (`ADMIN_PASSWORD_HASH`, via `node:crypto`, no extra dependency); sessions are an HMAC-signed cookie (`SESSION_SECRET`), HttpOnly, Secure (in production), SameSite=Lax, 14-day expiry.
- Login attempts are limited to 5 failures per 15 minutes per hashed IP, tracked in Postgres because serverless memory does not persist.
- Middleware protects `/admin/*` and `/api/admin/*`, **and every route handler and server action also verifies the session itself**. State-changing admin requests also need a same-origin `Origin` header.
- Every admin response is `noindex` and `no-store`; `/admin` is disallowed in robots and excluded from the sitemap; admin pages are never reported to Google Analytics.
- The admin looks exactly like the rest of the site: same tokens (cream/espresso, gold accent, Lato/Lora, light and dark) and the shared UI kit in `src/components/ui`. No separate admin theme or component library; missing primitives are added to the shared kit.
- Database tests may only run against the throwaway local test database (port 54329); they refuse anything else.
- Secrets live only in Vercel and a git-ignored `.env.local`; nothing secret is committed. `.env*` is already git-ignored.
- **Never run `npm run build` or `next dev` inside the checkout to verify.** The owner's own dev servers share its `.next` folder. Use `npm run verify:start` (it builds the committed code in a throwaway copy with test-only credentials).
- Existing behaviour must not change: keep every existing redirect in `next.config.ts`, every existing sitemap exclusion, and `git add` explicit paths only (the working tree may contain the owner's uncommitted work).

## Review Focus

1. **A server with no `SESSION_SECRET` / `ADMIN_PASSWORD_HASH`** (or a garbage hash) must refuse every login with a configuration message, never let anyone in. Pinned in Task 4 (`admin-login.test.ts`).
2. **Lockout must also block the correct password** while locked, then lift after the window; a success clears earlier failures. Pinned in Task 4.
3. **The attempt store being down** must fail the login closed, not skip the rate limit. Pinned in Task 4.
4. **Every future `/api/admin/**/route.ts` must answer 401 with no session and 403 to a cross-origin write.** Pinned in Task 4: the test discovers route files itself, so later plans are covered automatically.
5. **Forged, expired, future-dated or wrong-secret cookies** (including after rotating `SESSION_SECRET`) must not grant access, in middleware and in handlers; production cookies must be `Secure`. Pinned in Tasks 3 and 4.

---

## File Structure

| File | Responsibility |
|---|---|
| `prisma.config.ts`, `prisma/schema.prisma`, `prisma/migrations/*` | Schema for the whole spec (media, collections, articles, assets, login attempts) and its two migrations |
| `src/lib/db.ts` | `getDb()`: the one Prisma client |
| `scripts/db.sh` | Local Postgres in Docker (dev and test) |
| `scripts/check-db.ts`, `scripts/check-blob.ts` | Prove the real database and both Blob stores work (and that private is private) |
| `src/lib/env.ts`, `src/lib/blob-paths.ts`, `src/lib/blob.ts` | Required env vars; pure pathname/type/limit helpers; Blob store wrappers |
| `src/lib/admin/password.ts`, `session.ts`, `rate-limit.ts`, `rate-limit-db.ts` | scrypt hashing; signed session cookie; login throttle (pure logic + Postgres store) |
| `src/lib/admin/login.ts`, `redirect.ts`, `auth.ts`, `src/middleware.ts` | The login decision; safe `?next=`; route/action guards; the gatekeeper |
| `src/app/admin/**`, `src/components/admin/AdminHeader.tsx`, `src/lib/admin/nav.ts` | Login page, admin layout, header, dashboard, nav registry |
| `src/components/ui/{Field,Textarea,Select,Switch,Checkbox,StatusTag,Dialog,Toast,toast-reducer}` | New shared UI primitives |
| `scripts/verify-*.{ts,sh}`, `scripts/browser/*.mjs` | Safe build-and-browse verification harness |
| `docs/admin-setup.md`, `.env.example` | The setup checklist |

---

### Task 1: Prisma schema, migrations and the database client

**Files:**
- Create: `prisma.config.ts`, `prisma/schema.prisma`, `prisma/migrations/20261009000000_init/migration.sql`, `prisma/migrations/20261009000100_constraints/migration.sql`
- Create: `src/lib/db.ts`, `scripts/db.sh`, `scripts/check-db.ts`
- Create: `tests/db/helpers.ts`, `tests/db/schema.test.ts`
- Modify: `package.json` (via `npm`), `.gitignore`

**Interfaces:**
- Produces: `getDb(): PrismaClient` from `@/lib/db`; the generated client at `@/generated/prisma/client` (git-ignored, created by `prisma generate`); models `Media`, `Collection`, `CollectionSlugHistory`, `CollectionBlock`, `CollectionBlockMedia`, `Article`, `Asset`, `LoginAttempt` and enums `MediaKind`, `Status`, `ProcessingState`, `BlockType`, `ArticleKind` exactly as in the schema below; npm scripts `db:generate`, `db:dev`, `db:test`, `db:deploy`, `db:check`, `test`, `test:db`.
- Test helpers (`tests/db/helpers.ts`): `assertTestDatabase()`, `resetDb()`, `assertConstraintError(promise, regex)`, `uniqueHash()`, `mediaData(overrides?)`, `articleData(overrides?)`.

Docker must be running for this task (it starts a throwaway Postgres 16 container).

- [ ] **Step 1: Install the packages**

```bash
npm install @prisma/client@7.10.0 @prisma/adapter-pg@7.10.0 pg
npm install --save-dev prisma@7.10.0 @types/pg
```

Expected: both commands finish without errors and `package.json` now lists those five packages.

- [ ] **Step 2: Add the npm scripts**

```bash
npm pkg set \
  'scripts.test=tsx --test "tests/*.test.ts" "tests/unit/**/*.test.ts"' \
  'scripts.test:db=DATABASE_URL=$(scripts/db.sh url test) tsx --test --test-concurrency=1 "tests/db/*.test.ts"' \
  'scripts.postinstall=prisma generate' \
  'scripts.db:generate=prisma generate' \
  'scripts.db:dev=scripts/db.sh up dev' \
  'scripts.db:test=scripts/db.sh up test' \
  'scripts.db:deploy=prisma migrate deploy' \
  'scripts.db:check=tsx --env-file=.env.local scripts/check-db.ts'
```

Expected: no output. `npm pkg get scripts.test` prints `"tsx --test \"tests/*.test.ts\" \"tests/unit/**/*.test.ts\""`.

`test:db` runs files one at a time (`--test-concurrency=1`) because every DB test file truncates the same database.

- [ ] **Step 3: Ignore the generated client and allow `.env.example`**

In `.gitignore`, replace:

```
# env files (can opt-in for committing if needed)
.env*
```

with:

```
# env files (can opt-in for committing if needed)
.env*
!.env.example

# generated Prisma client (created by `prisma generate`, also on postinstall)
/src/generated/
```

- [ ] **Step 4: Write the failing database tests**

Create `tests/db/helpers.ts`:

```typescript
import assert from 'node:assert/strict';
import { getDb } from '@/lib/db';

/** Refuse to run against anything that is not the local throwaway test database. */
export function assertTestDatabase() {
  const url = process.env.DATABASE_URL ?? '';
  assert.match(url, /@(127\.0\.0\.1|localhost):54329\/swtest$/, 'DB tests must run against the local test database (scripts/db.sh up test)');
}

export async function resetDb() {
  assertTestDatabase();
  await getDb().$executeRawUnsafe(
    'TRUNCATE "CollectionBlockMedia","CollectionBlock","CollectionSlugHistory","Collection","Media","Article","Asset","LoginAttempt" RESTART IDENTITY CASCADE'
  );
}

/** Assert a promise rejects with a database constraint error. */
export async function assertConstraintError(promise: Promise<unknown>, hint: RegExp) {
  await assert.rejects(promise, (error: unknown) => {
    const e = error as { message?: string; cause?: { message?: string } };
    const text = `${e.message ?? ''} ${e.cause?.message ?? ''}`;
    assert.match(text, hint, `unexpected error: ${text.slice(0, 300)}`);
    return true;
  });
}

let counter = 0;
export const uniqueHash = () => `hash-${Date.now()}-${counter++}`;

export const mediaData = (overrides: Record<string, unknown> = {}) => ({
  kind: 'PHOTO' as const,
  mimeType: 'image/jpeg',
  contentHash: uniqueHash(),
  ...overrides,
});

export const articleData = (overrides: Record<string, unknown> = {}) => ({
  kind: 'ARTICLE' as const,
  slug: `article-${counter++}`,
  title: 'T',
  topic: 'Topic',
  author: 'A',
  publishedOn: new Date('2026-01-01'),
  bodyJson: { root: { type: 'root', children: [] } },
  bodyHtml: '',
  ...overrides,
});
```

Create `tests/db/schema.test.ts`:

```typescript
import { after, before, beforeEach, describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { getDb } from '@/lib/db';
import { articleData, assertConstraintError, assertTestDatabase, mediaData, resetDb } from './helpers';

describe('database constraints', () => {
  before(assertTestDatabase);
  beforeEach(resetDb);
  after(async () => { await getDb().$disconnect(); });

  test('two root collections cannot share a slug', async () => {
    const db = getDb();
    await db.collection.create({ data: { slug: 'japan', title: 'Japan', position: 0 } });
    await assertConstraintError(db.collection.create({ data: { slug: 'japan', title: 'Japan again', position: 1 } }), /unique|constraint/i);
  });

  test('the same child slug is allowed under different parents but not under the same parent', async () => {
    const db = getDb();
    const a = await db.collection.create({ data: { slug: 'a', title: 'A', position: 0 } });
    const b = await db.collection.create({ data: { slug: 'b', title: 'B', position: 1 } });
    await db.collection.create({ data: { slug: 'tokyo', title: 'Tokyo', position: 0, parentId: a.id } });
    await db.collection.create({ data: { slug: 'tokyo', title: 'Tokyo', position: 0, parentId: b.id } });
    await assertConstraintError(db.collection.create({ data: { slug: 'tokyo', title: 'Tokyo 2', position: 1, parentId: a.id } }), /unique|constraint/i);
  });

  test('an ARTICLE needs a slug but a PUBLICATION does not', async () => {
    const db = getDb();
    await assertConstraintError(db.article.create({ data: articleData({ slug: null }) }), /constraint|check/i);
    const publication = await db.article.create({
      data: articleData({ kind: 'PUBLICATION', slug: null, externalUrl: 'https://doi.org/10.1021/example' }),
    });
    assert.equal(publication.slug, null);
  });

  test('two articles cannot share a slug', async () => {
    const db = getDb();
    await db.article.create({ data: articleData({ slug: 'same' }) });
    await assertConstraintError(db.article.create({ data: articleData({ slug: 'same' }) }), /unique|constraint/i);
  });

  test('media with the same content hash is rejected (duplicate upload)', async () => {
    const db = getDb();
    await db.media.create({ data: mediaData({ contentHash: 'abc' }) });
    await assertConstraintError(db.media.create({ data: mediaData({ contentHash: 'abc' }) }), /unique|constraint/i);
  });

  test('media in a grid cannot be deleted until it is removed from the grid', async () => {
    const db = getDb();
    const media = await db.media.create({ data: mediaData() });
    const collection = await db.collection.create({ data: { slug: 'c', title: 'C', position: 0 } });
    const block = await db.collectionBlock.create({ data: { collectionId: collection.id, position: 0, type: 'GRID' } });
    await db.collectionBlockMedia.create({ data: { blockId: block.id, mediaId: media.id, position: 0 } });

    await assertConstraintError(db.media.delete({ where: { id: media.id } }), /foreign key|constraint|restrict/i);
    await db.collectionBlockMedia.deleteMany({ where: { mediaId: media.id } });
    await db.media.delete({ where: { id: media.id } });
    assert.equal(await db.media.count(), 0);
  });

  test('deleting a collection removes its blocks and slug history, but a parent with children cannot be deleted', async () => {
    const db = getDb();
    const parent = await db.collection.create({ data: { slug: 'p', title: 'P', position: 0 } });
    const child = await db.collection.create({ data: { slug: 'k', title: 'K', position: 0, parentId: parent.id } });
    await db.collectionBlock.create({ data: { collectionId: child.id, position: 0, type: 'TEXT', bodyHtml: '<p>x</p>' } });
    await db.collectionSlugHistory.create({ data: { collectionId: child.id, path: 'old/k' } });

    await assertConstraintError(db.collection.delete({ where: { id: parent.id } }), /foreign key|constraint|restrict/i);
    await db.collection.delete({ where: { id: child.id } });
    assert.equal(await db.collectionBlock.count(), 0);
    assert.equal(await db.collectionSlugHistory.count(), 0);
  });

  test('a slug-history path can belong to only one collection', async () => {
    const db = getDb();
    const a = await db.collection.create({ data: { slug: 'a', title: 'A', position: 0 } });
    const b = await db.collection.create({ data: { slug: 'b', title: 'B', position: 1 } });
    await db.collectionSlugHistory.create({ data: { collectionId: a.id, path: 'old' } });
    await assertConstraintError(db.collectionSlugHistory.create({ data: { collectionId: b.id, path: 'old' } }), /unique|constraint/i);
  });
});
```

- [ ] **Step 5: Run them to verify they fail**

```bash
DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:54329/swtest npx tsx --test tests/db/schema.test.ts
```

Expected: FAIL with `Cannot find module '@/lib/db'` (nothing exists yet).

- [ ] **Step 6: Add the Prisma config, schema and database client**

Create `prisma.config.ts`:

```typescript
import { defineConfig } from 'prisma/config';

// Prisma 7 reads the connection string from here, not from schema.prisma.
// `prisma generate` does not connect, so a placeholder keeps it working on CI
// and in `postinstall` where DATABASE_URL may be absent.
export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: { path: 'prisma/migrations' },
  datasource: { url: process.env.DATABASE_URL ?? 'postgresql://placeholder:placeholder@localhost:5432/placeholder' },
});
```

Create `prisma/schema.prisma`:

```prisma
generator client {
  provider            = "prisma-client"
  output              = "../src/generated/prisma"
  importFileExtension = ""
  moduleFormat        = "esm"
}

datasource db {
  provider = "postgresql"
}

enum MediaKind {
  PHOTO
  VIDEO
}

enum Status {
  DRAFT
  PUBLISHED
}

enum ProcessingState {
  PENDING
  READY
  FAILED
}

enum BlockType {
  TEXT
  GRID
}

enum ArticleKind {
  ARTICLE
  PUBLICATION
}

model Media {
  id              String          @id @default(cuid())
  kind            MediaKind
  status          Status          @default(DRAFT)
  processing      ProcessingState @default(PENDING)
  processingError String?
  caption         String          @default("")
  altText         String          @default("")
  placeName       String?
  takenAt         DateTime?
  camera          String?
  width           Int?
  height          Int?
  durationSec     Float?
  bytes           Int?
  mimeType        String
  contentHash     String          @unique
  originalPath    String?
  webUrl          String?
  posterUrl       String?
  publishedAt     DateTime?
  createdAt       DateTime        @default(now())
  updatedAt       DateTime        @updatedAt
  gridItems       CollectionBlockMedia[]
  coverOf         Collection[]

  @@index([status, takenAt])
}

model Collection {
  id          String       @id @default(cuid())
  parentId    String?
  parent      Collection?  @relation("CollectionTree", fields: [parentId], references: [id], onDelete: Restrict)
  children    Collection[] @relation("CollectionTree")
  slug        String
  title       String
  subtitle    String       @default("")
  coverId     String?
  cover       Media?       @relation(fields: [coverId], references: [id], onDelete: SetNull)
  status      Status       @default(DRAFT)
  position    Int
  publishedAt DateTime?
  blocks      CollectionBlock[]
  slugHistory CollectionSlugHistory[]

  @@unique([parentId, slug])
}

model CollectionSlugHistory {
  id           String     @id @default(cuid())
  collectionId String
  collection   Collection @relation(fields: [collectionId], references: [id], onDelete: Cascade)
  path         String     @unique
}

model CollectionBlock {
  id           String     @id @default(cuid())
  collectionId String
  collection   Collection @relation(fields: [collectionId], references: [id], onDelete: Cascade)
  position     Int
  type         BlockType
  bodyJson     Json?
  bodyHtml     String?
  items        CollectionBlockMedia[]

  @@index([collectionId, position])
}

model CollectionBlockMedia {
  blockId  String
  block    CollectionBlock @relation(fields: [blockId], references: [id], onDelete: Cascade)
  mediaId  String
  media    Media           @relation(fields: [mediaId], references: [id], onDelete: Restrict)
  position Int

  @@id([blockId, mediaId])
}

model Article {
  id          String      @id @default(cuid())
  kind        ArticleKind
  slug        String?     @unique
  externalUrl String?
  title       String
  topic       String
  author      String
  publishedOn DateTime    @db.Date
  keywords    String[]
  status      Status      @default(DRAFT)
  bodyJson    Json
  bodyHtml    String
  legacyHtml  String?
  publishedAt DateTime?
  createdAt   DateTime    @default(now())
  updatedAt   DateTime    @updatedAt

  @@index([kind, status, publishedOn])
}

model Asset {
  id        String   @id @default(cuid())
  url       String
  width     Int
  height    Int
  bytes     Int
  mimeType  String
  createdAt DateTime @default(now())
}

model LoginAttempt {
  id     String   @id @default(cuid())
  ipHash String
  at     DateTime @default(now())

  @@index([ipHash, at])
}
```

Create `src/lib/db.ts`:

```typescript
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
```

- [ ] **Step 7: Add the two migrations**

The first creates every table; the second adds the two rules Prisma's schema language cannot express (a unique slug among *root* collections, and "an article needs a slug"). Use exactly these directory names so migration order is fixed.

Create `prisma/migrations/20261009000000_init/migration.sql`:

```sql
-- CreateEnum
CREATE TYPE "MediaKind" AS ENUM ('PHOTO', 'VIDEO');

-- CreateEnum
CREATE TYPE "Status" AS ENUM ('DRAFT', 'PUBLISHED');

-- CreateEnum
CREATE TYPE "ProcessingState" AS ENUM ('PENDING', 'READY', 'FAILED');

-- CreateEnum
CREATE TYPE "BlockType" AS ENUM ('TEXT', 'GRID');

-- CreateEnum
CREATE TYPE "ArticleKind" AS ENUM ('ARTICLE', 'PUBLICATION');

-- CreateTable
CREATE TABLE "Media" (
    "id" TEXT NOT NULL,
    "kind" "MediaKind" NOT NULL,
    "status" "Status" NOT NULL DEFAULT 'DRAFT',
    "processing" "ProcessingState" NOT NULL DEFAULT 'PENDING',
    "processingError" TEXT,
    "caption" TEXT NOT NULL DEFAULT '',
    "altText" TEXT NOT NULL DEFAULT '',
    "placeName" TEXT,
    "takenAt" TIMESTAMP(3),
    "camera" TEXT,
    "width" INTEGER,
    "height" INTEGER,
    "durationSec" DOUBLE PRECISION,
    "bytes" INTEGER,
    "mimeType" TEXT NOT NULL,
    "contentHash" TEXT NOT NULL,
    "originalPath" TEXT,
    "webUrl" TEXT,
    "posterUrl" TEXT,
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Media_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Collection" (
    "id" TEXT NOT NULL,
    "parentId" TEXT,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "subtitle" TEXT NOT NULL DEFAULT '',
    "coverId" TEXT,
    "status" "Status" NOT NULL DEFAULT 'DRAFT',
    "position" INTEGER NOT NULL,
    "publishedAt" TIMESTAMP(3),

    CONSTRAINT "Collection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CollectionSlugHistory" (
    "id" TEXT NOT NULL,
    "collectionId" TEXT NOT NULL,
    "path" TEXT NOT NULL,

    CONSTRAINT "CollectionSlugHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CollectionBlock" (
    "id" TEXT NOT NULL,
    "collectionId" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "type" "BlockType" NOT NULL,
    "bodyJson" JSONB,
    "bodyHtml" TEXT,

    CONSTRAINT "CollectionBlock_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CollectionBlockMedia" (
    "blockId" TEXT NOT NULL,
    "mediaId" TEXT NOT NULL,
    "position" INTEGER NOT NULL,

    CONSTRAINT "CollectionBlockMedia_pkey" PRIMARY KEY ("blockId","mediaId")
);

-- CreateTable
CREATE TABLE "Article" (
    "id" TEXT NOT NULL,
    "kind" "ArticleKind" NOT NULL,
    "slug" TEXT,
    "externalUrl" TEXT,
    "title" TEXT NOT NULL,
    "topic" TEXT NOT NULL,
    "author" TEXT NOT NULL,
    "publishedOn" DATE NOT NULL,
    "keywords" TEXT[],
    "status" "Status" NOT NULL DEFAULT 'DRAFT',
    "bodyJson" JSONB NOT NULL,
    "bodyHtml" TEXT NOT NULL,
    "legacyHtml" TEXT,
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Article_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Asset" (
    "id" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "width" INTEGER NOT NULL,
    "height" INTEGER NOT NULL,
    "bytes" INTEGER NOT NULL,
    "mimeType" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Asset_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LoginAttempt" (
    "id" TEXT NOT NULL,
    "ipHash" TEXT NOT NULL,
    "at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LoginAttempt_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Media_contentHash_key" ON "Media"("contentHash");

-- CreateIndex
CREATE INDEX "Media_status_takenAt_idx" ON "Media"("status", "takenAt");

-- CreateIndex
CREATE UNIQUE INDEX "Collection_parentId_slug_key" ON "Collection"("parentId", "slug");

-- CreateIndex
CREATE UNIQUE INDEX "CollectionSlugHistory_path_key" ON "CollectionSlugHistory"("path");

-- CreateIndex
CREATE INDEX "CollectionBlock_collectionId_position_idx" ON "CollectionBlock"("collectionId", "position");

-- CreateIndex
CREATE UNIQUE INDEX "Article_slug_key" ON "Article"("slug");

-- CreateIndex
CREATE INDEX "Article_kind_status_publishedOn_idx" ON "Article"("kind", "status", "publishedOn");

-- CreateIndex
CREATE INDEX "LoginAttempt_ipHash_at_idx" ON "LoginAttempt"("ipHash", "at");

-- AddForeignKey
ALTER TABLE "Collection" ADD CONSTRAINT "Collection_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "Collection"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Collection" ADD CONSTRAINT "Collection_coverId_fkey" FOREIGN KEY ("coverId") REFERENCES "Media"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CollectionSlugHistory" ADD CONSTRAINT "CollectionSlugHistory_collectionId_fkey" FOREIGN KEY ("collectionId") REFERENCES "Collection"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CollectionBlock" ADD CONSTRAINT "CollectionBlock_collectionId_fkey" FOREIGN KEY ("collectionId") REFERENCES "Collection"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CollectionBlockMedia" ADD CONSTRAINT "CollectionBlockMedia_blockId_fkey" FOREIGN KEY ("blockId") REFERENCES "CollectionBlock"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CollectionBlockMedia" ADD CONSTRAINT "CollectionBlockMedia_mediaId_fkey" FOREIGN KEY ("mediaId") REFERENCES "Media"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
```

Create `prisma/migrations/20261009000100_constraints/migration.sql`:

```sql
-- Postgres treats NULLs as distinct, so @@unique([parentId, slug]) alone would allow two
-- root collections (parentId IS NULL) to share a slug. This partial index closes that gap.
CREATE UNIQUE INDEX "Collection_root_slug_key" ON "Collection"("slug") WHERE "parentId" IS NULL;

-- Every article needs a slug for its /writing/<slug> URL. Publications link out to a DOI
-- instead of having a page, so they may omit it.
ALTER TABLE "Article" ADD CONSTRAINT "Article_slug_required_for_articles" CHECK ("kind" <> 'ARTICLE' OR "slug" IS NOT NULL);
```

Create `prisma/migrations/migration_lock.toml`:

```toml
# Please do not edit this file manually
# It should be added in your version-control system (e.g., Git)
provider = "postgresql"
```

- [ ] **Step 8: Add the local database script and start the test database**

Create `scripts/db.sh`:

```bash
#!/usr/bin/env bash
# Local Postgres for development and tests. Never touches the production database.
#   scripts/db.sh up [dev|test]    start the container and apply migrations
#   scripts/db.sh down [dev|test]  stop it (dev keeps its data in a Docker volume)
#   scripts/db.sh url [dev|test]   print the connection string
set -euo pipefail

cmd="${1:-}"
kind="${2:-dev}"
case "$kind" in
  dev)  name=sw-dev-pg;  port=54330; db=swdev;  volume=(-v sw-dev-pgdata:/var/lib/postgresql/data) ;;
  test) name=sw-test-pg; port=54329; db=swtest; volume=() ;;
  *) echo "unknown kind: $kind (use dev or test)" >&2; exit 2 ;;
esac
url="postgresql://postgres:postgres@127.0.0.1:${port}/${db}"

case "$cmd" in
  up)
    if ! docker ps --format '{{.Names}}' | grep -qx "$name"; then
      docker rm -f "$name" >/dev/null 2>&1 || true
      docker run -d --rm --name "$name" -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB="$db" \
        -p "127.0.0.1:${port}:5432" "${volume[@]}" postgres:16-alpine >/dev/null
    fi
    for _ in $(seq 1 60); do
      if docker exec "$name" pg_isready -U postgres -d "$db" >/dev/null 2>&1 \
        && docker exec "$name" psql -U postgres -d "$db" -c 'select 1' >/dev/null 2>&1; then break; fi
      sleep 1
    done
    DATABASE_URL="$url" npx prisma migrate deploy
    echo "$kind database ready: $url"
    ;;
  down) docker rm -f "$name" >/dev/null 2>&1 || true; echo "$kind database stopped" ;;
  url)  echo "$url" ;;
  *) echo "usage: scripts/db.sh <up|down|url> [dev|test]" >&2; exit 2 ;;
esac
```

```bash
chmod +x scripts/db.sh
npx prisma generate
npm run db:test
```

Expected: `✔ Generated Prisma Client (7.10.0) to ./src/generated/prisma`, then `All migrations have been successfully applied.` and `test database ready: postgresql://postgres:postgres@127.0.0.1:54329/swtest`.

- [ ] **Step 9: Run the database tests**

```bash
npm run test:db
```

Expected: `# pass 8`, `# fail 0`.

- [ ] **Step 10: Check the migrations match the schema**

```bash
DATABASE_URL=$(scripts/db.sh url test) npx prisma migrate diff --from-config-datasource --to-schema prisma/schema.prisma --exit-code
```

Expected: `No difference detected.` and exit code 0.

- [ ] **Step 11: Add the connection check script and try it**

Create `scripts/check-db.ts`:

```typescript
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
    if (!migrations) console.log('no migrations applied yet: run `npm run db:deploy`');
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
```

```bash
DATABASE_URL=$(scripts/db.sh url test) npx tsx scripts/check-db.ts
DATABASE_URL="prisma+postgres://x/?api_key=y" npx tsx scripts/check-db.ts
env -u DATABASE_URL npx tsx scripts/check-db.ts
```

Expected, in order: `connected to 127.0.0.1:54329: PostgreSQL 16.x` and `2 migration(s) applied: 20261009000000_init, 20261009000100_constraints`; then `FAIL: DATABASE_URL is a prisma+postgres:// URL. ...`; then `FAIL: DATABASE_URL is not set ...`. The first two exit 0 and 1 respectively; the URL is never printed.

- [ ] **Step 12: Typecheck**

```bash
npx tsc --noEmit 2>&1 | grep -E "error TS" | grep -vE "chatbot|invoice|Signature"
```

Expected: no output. (The repo has three older errors in the chatbot, invoice and Signature files; this filter hides only those.)

- [ ] **Step 13: Commit**

```bash
git add package.json package-lock.json .gitignore prisma.config.ts prisma src/lib/db.ts scripts/db.sh scripts/check-db.ts tests/db
git commit -m "feat(admin): Prisma schema, migrations and database client"
```

---

### Task 2: Environment, Blob paths and Blob store helpers

**Files:**
- Create: `src/lib/env.ts`, `src/lib/blob-paths.ts`, `src/lib/blob.ts`, `scripts/check-blob.ts`
- Test: `tests/unit/env.test.ts`, `tests/unit/blob-paths.test.ts`
- Modify: `package.json` (via `npm`)

**Interfaces:**
- Produces from `@/lib/env`: `requireEnv(name: string): string` (throws `"<NAME> is not set. See docs/admin-setup.md."`).
- Produces from `@/lib/blob-paths` (pure, no imports): `MediaKindName = 'PHOTO'|'VIDEO'`; `PHOTO_MIME_TYPES`, `VIDEO_MIME_TYPES: string[]`; `MAX_PHOTO_BYTES` (40 MiB), `MAX_VIDEO_BYTES` (300 MiB), `MAX_ASSET_BYTES` (15 MiB); `kindForMime(mime): MediaKindName|null`; `extensionFor(mime): string|null`; `originalPath(id, ext)`, `webCopyPath(id)`, `videoPath(id, ext)`, `posterPath(id)`, `assetPath(id, ext)`; `isPublicBlobUrl(url): boolean`.
- Produces from `@/lib/blob` (server only): `BlobStore = 'public'|'private'`; `putBlob(store, pathname, body, {contentType?, allowOverwrite?, cacheControlMaxAge?})` returning the `@vercel/blob` put result; `getPrivateBlob(pathname): Promise<{stream: ReadableStream<Uint8Array>; contentType: string; size: number}|null>`; `readPrivateBlob(pathname): Promise<Buffer|null>`; `deleteBlobs(store, urlsOrPaths: string[])`.

- [ ] **Step 1: Install the Blob SDK**

```bash
npm install @vercel/blob@2.8.1
```

Expected: completes without errors and `package.json` lists `@vercel/blob` at `2.8.1`.

- [ ] **Step 2: Write the failing tests**

Create `tests/unit/env.test.ts`:

```typescript
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { requireEnv } from '@/lib/env';

test('requireEnv returns the value when set', () => {
  process.env.SW_TEST_ENV = 'value';
  assert.equal(requireEnv('SW_TEST_ENV'), 'value');
});

test('requireEnv names the missing variable and points at the setup doc', () => {
  delete process.env.SW_TEST_MISSING;
  assert.throws(() => requireEnv('SW_TEST_MISSING'), /SW_TEST_MISSING is not set.*docs\/admin-setup\.md/);
});

test('requireEnv treats an empty string as missing', () => {
  process.env.SW_TEST_EMPTY = '';
  assert.throws(() => requireEnv('SW_TEST_EMPTY'), /SW_TEST_EMPTY is not set/);
});
```

Create `tests/unit/blob-paths.test.ts`:

```typescript
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  MAX_PHOTO_BYTES, MAX_VIDEO_BYTES, assetPath, extensionFor, isPublicBlobUrl, kindForMime, originalPath, posterPath, videoPath, webCopyPath,
} from '@/lib/blob-paths';

test('paths are namespaced by purpose and never contain the original filename', () => {
  assert.equal(originalPath('abc', 'jpg'), 'originals/abc.jpg');
  assert.equal(webCopyPath('abc'), 'photos/abc.jpg');
  assert.equal(videoPath('abc', 'mov'), 'videos/abc.mov');
  assert.equal(posterPath('abc'), 'posters/abc.jpg');
  assert.equal(assetPath('abc', 'png'), 'assets/abc.png');
});

test('kindForMime recognises photo and video types and rejects everything else', () => {
  assert.equal(kindForMime('image/jpeg'), 'PHOTO');
  assert.equal(kindForMime('image/png'), 'PHOTO');
  assert.equal(kindForMime('image/webp'), 'PHOTO');
  assert.equal(kindForMime('video/mp4'), 'VIDEO');
  assert.equal(kindForMime('video/quicktime'), 'VIDEO');
  assert.equal(kindForMime('video/webm'), 'VIDEO');
  assert.equal(kindForMime('image/heic'), null);
  assert.equal(kindForMime('image/svg+xml'), null, 'SVG can carry scripts and is not accepted');
  assert.equal(kindForMime('application/pdf'), null);
  assert.equal(kindForMime(''), null);
});

test('extensionFor maps accepted mime types to a safe extension', () => {
  assert.equal(extensionFor('image/jpeg'), 'jpg');
  assert.equal(extensionFor('image/png'), 'png');
  assert.equal(extensionFor('image/webp'), 'webp');
  assert.equal(extensionFor('video/mp4'), 'mp4');
  assert.equal(extensionFor('video/quicktime'), 'mov');
  assert.equal(extensionFor('video/webm'), 'webm');
  assert.equal(extensionFor('text/html'), null);
});

test('isPublicBlobUrl accepts only https URLs on the public Blob host', () => {
  assert.equal(isPublicBlobUrl('https://abc123.public.blob.vercel-storage.com/photos/x.jpg'), true);
  assert.equal(isPublicBlobUrl('http://abc123.public.blob.vercel-storage.com/photos/x.jpg'), false);
  assert.equal(isPublicBlobUrl('https://evil.com/abc.public.blob.vercel-storage.com/x.jpg'), false);
  assert.equal(isPublicBlobUrl('https://public.blob.vercel-storage.com.evil.com/x.jpg'), false);
  assert.equal(isPublicBlobUrl('https://abc123.private.blob.vercel-storage.com/originals/x.jpg'), false);
  assert.equal(isPublicBlobUrl('not a url'), false);
  assert.equal(isPublicBlobUrl(''), false);
});

test('size limits match the spec', () => {
  assert.equal(MAX_VIDEO_BYTES, 300 * 1024 * 1024);
  assert.ok(MAX_PHOTO_BYTES >= 25 * 1024 * 1024, 'originals up to 25MB must be accepted');
});
```

- [ ] **Step 3: Run them to verify they fail**

```bash
npx tsx --test tests/unit/env.test.ts tests/unit/blob-paths.test.ts
```

Expected: FAIL with `Cannot find module '@/lib/env'` / `'@/lib/blob-paths'`.

- [ ] **Step 4: Implement the helpers**

Create `src/lib/env.ts`:

```typescript
/** Read a required environment variable, failing with a message that says which one and where to look. */
export function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is not set. See docs/admin-setup.md.`);
  return value;
}
```

Create `src/lib/blob-paths.ts`:

```typescript
// Pure helpers for Blob pathnames, accepted file types and size limits.
// No imports, so they are safe in the browser, in middleware and under tsx.

export type MediaKindName = 'PHOTO' | 'VIDEO';

const PHOTO_TYPES: Record<string, string> = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' };
const VIDEO_TYPES: Record<string, string> = { 'video/mp4': 'mp4', 'video/quicktime': 'mov', 'video/webm': 'webm' };

export const PHOTO_MIME_TYPES = Object.keys(PHOTO_TYPES);
export const VIDEO_MIME_TYPES = Object.keys(VIDEO_TYPES);
export const MAX_PHOTO_BYTES = 40 * 1024 * 1024;
export const MAX_VIDEO_BYTES = 300 * 1024 * 1024;
export const MAX_ASSET_BYTES = 15 * 1024 * 1024;

export function kindForMime(mime: string): MediaKindName | null {
  if (mime in PHOTO_TYPES) return 'PHOTO';
  if (mime in VIDEO_TYPES) return 'VIDEO';
  return null;
}

export function extensionFor(mime: string): string | null {
  return PHOTO_TYPES[mime] ?? VIDEO_TYPES[mime] ?? null;
}

// Private store: untouched originals. Public store: everything the website serves.
export const originalPath = (id: string, ext: string) => `originals/${id}.${ext}`;
export const webCopyPath = (id: string) => `photos/${id}.jpg`;
export const videoPath = (id: string, ext: string) => `videos/${id}.${ext}`;
export const posterPath = (id: string) => `posters/${id}.jpg`;
export const assetPath = (id: string, ext: string) => `assets/${id}.${ext}`;

const PUBLIC_HOST_SUFFIX = '.public.blob.vercel-storage.com';

/** True only for https URLs hosted on a public Vercel Blob store. */
export function isPublicBlobUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'https:' && parsed.hostname.endsWith(PUBLIC_HOST_SUFFIX) && parsed.hostname.length > PUBLIC_HOST_SUFFIX.length;
  } catch {
    return false;
  }
}
```

Create `src/lib/blob.ts`:

```typescript
import { del, get, put } from '@vercel/blob';
import { requireEnv } from '@/lib/env';

// Two stores: PUBLIC holds everything the website serves (web copies, videos, posters,
// article images); PRIVATE holds untouched originals, which are never reachable by URL.
export type BlobStore = 'public' | 'private';

const tokenFor = (store: BlobStore) => requireEnv(store === 'public' ? 'BLOB_PUBLIC_TOKEN' : 'BLOB_PRIVATE_TOKEN');

type PutBody = Parameters<typeof put>[1];

export async function putBlob(
  store: BlobStore,
  pathname: string,
  body: PutBody,
  options: { contentType?: string; allowOverwrite?: boolean; cacheControlMaxAge?: number } = {}
) {
  return put(pathname, body, {
    access: store,
    token: tokenFor(store),
    addRandomSuffix: false,
    allowOverwrite: options.allowOverwrite ?? false,
    contentType: options.contentType,
    cacheControlMaxAge: options.cacheControlMaxAge,
  });
}

/** Stream a private blob (server only). Returns null when it does not exist. */
export async function getPrivateBlob(pathname: string) {
  const result = await get(pathname, { access: 'private', token: tokenFor('private') });
  if (!result || result.statusCode !== 200) return null;
  return { stream: result.stream, contentType: result.blob.contentType, size: result.blob.size };
}

/** Read a whole private blob into memory (originals are at most a few tens of MB). */
export async function readPrivateBlob(pathname: string): Promise<Buffer | null> {
  const blob = await getPrivateBlob(pathname);
  return blob ? Buffer.from(await new Response(blob.stream).arrayBuffer()) : null;
}

export async function deleteBlobs(store: BlobStore, urlsOrPaths: string[]) {
  if (urlsOrPaths.length) await del(urlsOrPaths, { token: tokenFor(store) });
}
```

- [ ] **Step 5: Run the tests to verify they pass**

```bash
npx tsx --test tests/unit/env.test.ts tests/unit/blob-paths.test.ts
```

Expected: `# pass 8`, `# fail 0`.

- [ ] **Step 6: Add the Blob check script**

This script talks to the real stores, so no test can cover it; it exists so the owner can prove the setup (and that private really is private) in one command.

Create `scripts/check-blob.ts`:

```typescript
// Usage: npm run blob:check   (reads .env.local)
// Proves both Blob stores work AND that private blobs are really private.
import { deleteBlobs, getPrivateBlob, putBlob } from '@/lib/blob';

let failed = false;
const report = (ok: boolean, label: string, detail = '') => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}${detail ? `  (${detail})` : ''}`);
  if (!ok) failed = true;
};

async function main() {
  const stamp = `${Date.now()}`;

  const pub = await putBlob('public', `healthcheck/${stamp}.txt`, 'public ok', { contentType: 'text/plain' });
  const pubFetch = await fetch(pub.url);
  report(pubFetch.status === 200 && (await pubFetch.text()) === 'public ok', 'public store: write and read by URL');
  await deleteBlobs('public', [pub.url]);

  const priv = await putBlob('private', `healthcheck/${stamp}.txt`, 'private ok', { contentType: 'text/plain' });
  const viaToken = await getPrivateBlob(priv.pathname);
  report(!!viaToken && (await new Response(viaToken.stream).text()) === 'private ok', 'private store: write and read with the token');
  const anonymous = await fetch(priv.url);
  report(anonymous.status === 401 || anonymous.status === 403 || anonymous.status === 404, 'private store: NOT readable without the token', `anonymous fetch returned ${anonymous.status}`);
  await deleteBlobs('private', [priv.pathname]);
}

main()
  .catch((error) => report(false, 'unexpected error', error instanceof Error ? error.message : String(error)))
  .finally(() => process.exit(failed ? 1 : 0));
```

```bash
npm pkg set 'scripts.blob:check=tsx --env-file=.env.local scripts/check-blob.ts'
```

Run it only if `.env.local` already contains `BLOB_PUBLIC_TOKEN` and `BLOB_PRIVATE_TOKEN` (Task 7 repeats this check): `npm run blob:check`. Expected: three `PASS` lines (public write and read; private write and read with the token; private NOT readable without it) and exit 0. Without tokens it exits 1 with `BLOB_PUBLIC_TOKEN is not set`, which is fine at this point.

- [ ] **Step 7: Typecheck**

```bash
npx tsc --noEmit 2>&1 | grep -E "error TS" | grep -vE "chatbot|invoice|Signature"
```

Expected: no output.

- [ ] **Step 8: Commit**

```bash
git add package.json package-lock.json src/lib/env.ts src/lib/blob-paths.ts src/lib/blob.ts scripts/check-blob.ts tests/unit/env.test.ts tests/unit/blob-paths.test.ts
git commit -m "feat(admin): env helper, Blob paths and store wrappers"
```

---

### Task 3: Password hashing, session cookie and login throttle

**Files:**
- Create: `src/lib/admin/password.ts`, `src/lib/admin/session.ts`, `src/lib/admin/rate-limit.ts`, `src/lib/admin/rate-limit-db.ts`, `scripts/hash-password.ts`
- Test: `tests/unit/admin-password.test.ts`, `tests/unit/admin-session.test.ts`, `tests/unit/admin-rate-limit.test.ts`, `tests/db/rate-limit-db.test.ts`
- Modify: `package.json` (via `npm`)

**Interfaces:**
- Consumes: `getDb()` from Task 1 (the `LoginAttempt` model).
- Produces from `@/lib/admin/password`: `MIN_PASSWORD_LENGTH` (12); `hashPassword(password): Promise<string>` returning `scrypt:N:r:p:<salt>:<hash>` (base64url parts, no `$`, because Next's env loader expands `$`); `verifyPassword(password, stored): Promise<boolean>` (constant time; `false`, never a throw, for malformed input).
- Produces from `@/lib/admin/session` (Web Crypto only, so it also runs in the Edge middleware): `SESSION_COOKIE = 'sw_admin'`; `SESSION_TTL_SECONDS` (14 days); `SessionPayload = {v: 1; iat: number; exp: number; sid: string}`; `createSessionToken(secret, nowMs?, ttlSeconds?): Promise<string>` (throws if `secret` is under 32 characters); `verifySessionToken(token, secret, nowMs?): Promise<SessionPayload|null>`; `readCookie(header, name): string|undefined`; `sessionCookieOptions(isProduction)`.
- Produces from `@/lib/admin/rate-limit`: `MAX_FAILURES` (5), `WINDOW_MS` (15 min); `AttemptStore = {failuresSince(key, since): Promise<Date[]>; recordFailure(key, at): Promise<void>; clear(key): Promise<void>}`; `LoginCheck = {allowed: true}|{allowed: false; retryAfterSeconds: number}`; `checkLoginAllowed(store, key, now?)`, `recordFailedLogin(store, key, now?)`, `recordSuccessfulLogin(store, key)`, `memoryAttemptStore()`, `hashClientKey(ip, secret): Promise<string>` (HMAC hex), `clientIpFrom(headers: Headers): string`.
- Produces from `@/lib/admin/rate-limit-db`: `prismaAttemptStore(): AttemptStore`.

- [ ] **Step 1: Write the failing tests**

Create `tests/unit/admin-password.test.ts`:

```typescript
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { hashPassword, verifyPassword } from '@/lib/admin/password';

const PASSWORD = 'correct horse battery staple';

test('a hashed password verifies, and a wrong one does not', async () => {
  const stored = await hashPassword(PASSWORD);
  assert.equal(await verifyPassword(PASSWORD, stored), true);
  assert.equal(await verifyPassword(`${PASSWORD}!`, stored), false);
  assert.equal(await verifyPassword('', stored), false);
});

test('the stored form is safe to put in an env file: no $ or whitespace, and never the password', async () => {
  const stored = await hashPassword(PASSWORD);
  assert.doesNotMatch(stored, /[$\s"'`\\]/);
  assert.ok(!stored.includes(PASSWORD));
  assert.match(stored, /^scrypt:\d+:\d+:\d+:[\w-]+:[\w-]+$/);
});

test('hashing the same password twice gives different results (random salt)', async () => {
  assert.notEqual(await hashPassword(PASSWORD), await hashPassword(PASSWORD));
});

test('verifyPassword returns false for malformed or foreign hashes instead of throwing', async () => {
  for (const bad of ['', 'plain', 'scrypt:1:2', 'bcrypt:abc:def', 'scrypt:x:y:z:a:b', 'scrypt:16384:8:1::', undefined as unknown as string]) {
    assert.equal(await verifyPassword(PASSWORD, bad), false, `should reject ${JSON.stringify(bad)}`);
  }
});

test('passwords shorter than 12 characters are refused', async () => {
  await assert.rejects(hashPassword('short'), /at least 12 characters/);
});
```

Create `tests/unit/admin-session.test.ts`:

```typescript
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { SESSION_TTL_SECONDS, createSessionToken, readCookie, sessionCookieOptions, verifySessionToken } from '@/lib/admin/session';

const SECRET = 'a'.repeat(32);
const NOW = Date.UTC(2026, 9, 9, 12, 0, 0);

test('a fresh token verifies and carries issue and expiry times', async () => {
  const token = await createSessionToken(SECRET, NOW);
  const session = await verifySessionToken(token, SECRET, NOW + 1000);
  assert.ok(session);
  assert.equal(session.iat, Math.floor(NOW / 1000));
  assert.equal(session.exp, Math.floor(NOW / 1000) + SESSION_TTL_SECONDS);
});

test('a token expires after the TTL', async () => {
  const token = await createSessionToken(SECRET, NOW);
  assert.ok(await verifySessionToken(token, SECRET, NOW + (SESSION_TTL_SECONDS - 5) * 1000));
  assert.equal(await verifySessionToken(token, SECRET, NOW + (SESSION_TTL_SECONDS + 5) * 1000), null);
});

test('a token signed with a different secret is rejected', async () => {
  const token = await createSessionToken(SECRET, NOW);
  assert.equal(await verifySessionToken(token, 'b'.repeat(32), NOW), null);
});

test('tampering with the payload or the signature is rejected', async () => {
  const token = await createSessionToken(SECRET, NOW);
  const [payload, signature] = token.split('.');
  const forged = Buffer.from(JSON.stringify({ v: 1, iat: 0, exp: 9_999_999_999, sid: 'x' })).toString('base64url');
  assert.equal(await verifySessionToken(`${forged}.${signature}`, SECRET, NOW), null);
  assert.equal(await verifySessionToken(`${payload}.${signature.slice(0, -2)}AA`, SECRET, NOW), null);
});

test('malformed tokens are rejected without throwing', async () => {
  for (const bad of ['', 'abc', 'a.b.c', '.', 'a.', '.b', null, undefined]) {
    assert.equal(await verifySessionToken(bad as string, SECRET, NOW), null, `should reject ${JSON.stringify(bad)}`);
  }
});

test('a token issued in the future is rejected (clock tampering)', async () => {
  const token = await createSessionToken(SECRET, NOW + 3_600_000);
  assert.equal(await verifySessionToken(token, SECRET, NOW), null);
});

test('a weak secret is refused when creating a session and never verifies', async () => {
  await assert.rejects(createSessionToken('short', NOW), /at least 32 characters/);
  assert.equal(await verifySessionToken('a.b', 'short', NOW), null);
});

test('readCookie finds a cookie among several and decodes nothing it should not', () => {
  assert.equal(readCookie('a=1; sw_admin=tok.en; b=2', 'sw_admin'), 'tok.en');
  assert.equal(readCookie('sw_admin_other=1', 'sw_admin'), undefined);
  assert.equal(readCookie(null, 'sw_admin'), undefined);
  assert.equal(readCookie('', 'sw_admin'), undefined);
});

test('the session cookie is HttpOnly and SameSite=Lax, lasts 14 days, and is Secure only in production', () => {
  assert.deepEqual(sessionCookieOptions(true), { httpOnly: true, secure: true, sameSite: 'lax', path: '/', maxAge: 14 * 24 * 60 * 60 });
  assert.equal(sessionCookieOptions(false).secure, false);
  assert.equal(sessionCookieOptions(false).httpOnly, true);
});
```

Create `tests/unit/admin-rate-limit.test.ts`:

```typescript
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  MAX_FAILURES, WINDOW_MS, checkLoginAllowed, clientIpFrom, hashClientKey, memoryAttemptStore, recordFailedLogin, recordSuccessfulLogin,
} from '@/lib/admin/rate-limit';

const T0 = new Date('2026-10-09T12:00:00Z');
const at = (ms: number) => new Date(T0.getTime() + ms);

test('the first failures are allowed, and the fifth locks the key', async () => {
  const store = memoryAttemptStore();
  for (let i = 0; i < MAX_FAILURES - 1; i++) {
    assert.deepEqual(await checkLoginAllowed(store, 'k', at(i * 1000)), { allowed: true });
    await recordFailedLogin(store, 'k', at(i * 1000));
  }
  assert.deepEqual(await checkLoginAllowed(store, 'k', at(5000)), { allowed: true });
  await recordFailedLogin(store, 'k', at(5000));
  const blocked = await checkLoginAllowed(store, 'k', at(6000));
  assert.equal(blocked.allowed, false);
});

test('the lock lifts when enough failures age out of the window, and says how long to wait', async () => {
  const store = memoryAttemptStore();
  for (let i = 0; i < MAX_FAILURES; i++) await recordFailedLogin(store, 'k', at(i * 1000));
  const blocked = await checkLoginAllowed(store, 'k', at(10_000));
  assert.equal(blocked.allowed, false);
  // The oldest failure was at +0s, so the lock lifts at +WINDOW.
  assert.equal(blocked.allowed === false && blocked.retryAfterSeconds, Math.ceil((WINDOW_MS - 10_000) / 1000));
  assert.deepEqual(await checkLoginAllowed(store, 'k', at(WINDOW_MS + 1)), { allowed: true });
});

test('a successful login clears the failures', async () => {
  const store = memoryAttemptStore();
  for (let i = 0; i < MAX_FAILURES - 1; i++) await recordFailedLogin(store, 'k', at(i));
  await recordSuccessfulLogin(store, 'k');
  for (let i = 0; i < MAX_FAILURES - 1; i++) await recordFailedLogin(store, 'k', at(1000 + i));
  assert.deepEqual(await checkLoginAllowed(store, 'k', at(2000)), { allowed: true });
});

test('different keys do not affect each other', async () => {
  const store = memoryAttemptStore();
  for (let i = 0; i < MAX_FAILURES; i++) await recordFailedLogin(store, 'a', at(i));
  assert.equal((await checkLoginAllowed(store, 'a', at(100))).allowed, false);
  assert.equal((await checkLoginAllowed(store, 'b', at(100))).allowed, true);
});

test('hashClientKey is stable, secret-dependent and never contains the IP', async () => {
  const one = await hashClientKey('203.0.113.7', 's'.repeat(32));
  assert.equal(one, await hashClientKey('203.0.113.7', 's'.repeat(32)));
  assert.notEqual(one, await hashClientKey('203.0.113.8', 's'.repeat(32)));
  assert.notEqual(one, await hashClientKey('203.0.113.7', 't'.repeat(32)));
  assert.ok(!one.includes('203'));
  assert.match(one, /^[0-9a-f]{64}$/);
});

test('clientIpFrom prefers the first x-forwarded-for entry, then x-real-ip, then "unknown"', () => {
  assert.equal(clientIpFrom(new Headers({ 'x-forwarded-for': '203.0.113.7, 10.0.0.1' })), '203.0.113.7');
  assert.equal(clientIpFrom(new Headers({ 'x-real-ip': '198.51.100.2' })), '198.51.100.2');
  assert.equal(clientIpFrom(new Headers()), 'unknown');
});
```

Create `tests/db/rate-limit-db.test.ts`:

```typescript
import { after, before, beforeEach, describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { getDb } from '@/lib/db';
import { MAX_FAILURES, checkLoginAllowed, recordFailedLogin, recordSuccessfulLogin } from '@/lib/admin/rate-limit';
import { prismaAttemptStore } from '@/lib/admin/rate-limit-db';
import { assertTestDatabase, resetDb } from './helpers';

describe('prismaAttemptStore', () => {
  before(assertTestDatabase);
  beforeEach(resetDb);
  after(async () => { await getDb().$disconnect(); });

  test('locks a key after the maximum failures and unlocks after a success', async () => {
    const store = prismaAttemptStore();
    const now = new Date();
    for (let i = 0; i < MAX_FAILURES; i++) await recordFailedLogin(store, 'ip-hash', new Date(now.getTime() - 1000 + i));
    assert.equal((await checkLoginAllowed(store, 'ip-hash', now)).allowed, false);
    await recordSuccessfulLogin(store, 'ip-hash');
    assert.equal((await checkLoginAllowed(store, 'ip-hash', now)).allowed, true);
  });

  test('recording a failure prunes attempts older than a day', async () => {
    const db = getDb();
    const store = prismaAttemptStore();
    const now = new Date();
    await db.loginAttempt.create({ data: { ipHash: 'old', at: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000) } });
    await recordFailedLogin(store, 'fresh', now);
    assert.equal(await db.loginAttempt.count({ where: { ipHash: 'old' } }), 0);
    assert.equal(await db.loginAttempt.count({ where: { ipHash: 'fresh' } }), 1);
  });
});
```

- [ ] **Step 2: Run them to verify they fail**

```bash
npx tsx --test tests/unit/admin-password.test.ts tests/unit/admin-session.test.ts tests/unit/admin-rate-limit.test.ts
```

Expected: FAIL with `Cannot find module '@/lib/admin/password'` (and `session`, `rate-limit`).

- [ ] **Step 3: Implement the password hashing**

Create `src/lib/admin/password.ts`:

```typescript
import { randomBytes, scrypt, timingSafeEqual } from 'node:crypto';

// scrypt via node:crypto, so there is no dependency. The stored form is
// `scrypt:N:r:p:<salt>:<hash>` with base64url parts: no `$`, which Next's .env
// loader would try to expand as a variable.

const N = 16384;
const R = 8;
const P = 1;
const KEY_LENGTH = 32;
export const MIN_PASSWORD_LENGTH = 12;

function derive(password: string, salt: Buffer, n: number, r: number, p: number): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scrypt(password, salt, KEY_LENGTH, { N: n, r, p, maxmem: 128 * n * r * 2 }, (error, key) => (error ? reject(error) : resolve(key)));
  });
}

export async function hashPassword(password: string): Promise<string> {
  if (password.length < MIN_PASSWORD_LENGTH) throw new Error(`Password must be at least ${MIN_PASSWORD_LENGTH} characters.`);
  const salt = randomBytes(16);
  const key = await derive(password, salt, N, R, P);
  return `scrypt:${N}:${R}:${P}:${salt.toString('base64url')}:${key.toString('base64url')}`;
}

/** Constant-time check. Returns false (never throws) for malformed or foreign hashes. */
export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  try {
    const [scheme, n, r, p, salt, hash] = String(stored).split(':');
    if (scheme !== 'scrypt' || !salt || !hash) return false;
    const params = [n, r, p].map(Number);
    if (params.some((x) => !Number.isInteger(x) || x < 1)) return false;
    const expected = Buffer.from(hash, 'base64url');
    const actual = await derive(password, Buffer.from(salt, 'base64url'), params[0], params[1], params[2]);
    return expected.length === actual.length && timingSafeEqual(expected, actual);
  } catch {
    return false;
  }
}
```

- [ ] **Step 4: Implement the session cookie**

Create `src/lib/admin/session.ts`:

```typescript
// Signed session cookie using only Web Crypto, so the same code runs in the Edge
// middleware and in Node route handlers. The token is `<payload>.<signature>`,
// both base64url, signed with HMAC-SHA-256.

export const SESSION_COOKIE = 'sw_admin';
export const SESSION_TTL_SECONDS = 14 * 24 * 60 * 60;
const MIN_SECRET_LENGTH = 32;
const CLOCK_SKEW_SECONDS = 60;

export type SessionPayload = { v: 1; iat: number; exp: number; sid: string };

const encoder = new TextEncoder();

function toBase64Url(bytes: Uint8Array): string {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromBase64Url(text: string): Uint8Array<ArrayBuffer> | null {
  if (!/^[A-Za-z0-9_-]*$/.test(text)) return null;
  const padded = text.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - (text.length % 4)) % 4);
  try {
    return Uint8Array.from(atob(padded), (c) => c.charCodeAt(0));
  } catch {
    return null;
  }
}

function importKey(secret: string, usage: 'sign' | 'verify') {
  return crypto.subtle.importKey('raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, [usage]);
}

export async function createSessionToken(secret: string, nowMs = Date.now(), ttlSeconds = SESSION_TTL_SECONDS): Promise<string> {
  if (secret.length < MIN_SECRET_LENGTH) throw new Error(`SESSION_SECRET must be at least ${MIN_SECRET_LENGTH} characters.`);
  const iat = Math.floor(nowMs / 1000);
  const payload: SessionPayload = { v: 1, iat, exp: iat + ttlSeconds, sid: toBase64Url(crypto.getRandomValues(new Uint8Array(12))) };
  const body = toBase64Url(encoder.encode(JSON.stringify(payload)));
  const signature = await crypto.subtle.sign('HMAC', await importKey(secret, 'sign'), encoder.encode(body));
  return `${body}.${toBase64Url(new Uint8Array(signature))}`;
}

export async function verifySessionToken(token: string | null | undefined, secret: string, nowMs = Date.now()): Promise<SessionPayload | null> {
  if (!token || secret.length < MIN_SECRET_LENGTH) return null;
  const parts = token.split('.');
  if (parts.length !== 2 || !parts[0] || !parts[1]) return null;
  const signature = fromBase64Url(parts[1]);
  if (!signature) return null;
  // subtle.verify compares in constant time.
  const valid = await crypto.subtle.verify('HMAC', await importKey(secret, 'verify'), signature, encoder.encode(parts[0]));
  if (!valid) return null;
  const bytes = fromBase64Url(parts[0]);
  if (!bytes) return null;
  try {
    const payload = JSON.parse(new TextDecoder().decode(bytes)) as SessionPayload;
    const now = Math.floor(nowMs / 1000);
    if (payload.v !== 1 || typeof payload.exp !== 'number' || typeof payload.iat !== 'number') return null;
    if (payload.exp <= now || payload.iat > now + CLOCK_SKEW_SECONDS) return null;
    return payload;
  } catch {
    return null;
  }
}

export function readCookie(header: string | null | undefined, name: string): string | undefined {
  if (!header) return undefined;
  for (const part of header.split(';')) {
    const index = part.indexOf('=');
    if (index > 0 && part.slice(0, index).trim() === name) return part.slice(index + 1).trim();
  }
  return undefined;
}

export function sessionCookieOptions(isProduction: boolean) {
  return { httpOnly: true, secure: isProduction, sameSite: 'lax' as const, path: '/', maxAge: SESSION_TTL_SECONDS };
}
```

- [ ] **Step 5: Implement the login throttle and its Postgres store**

Create `src/lib/admin/rate-limit.ts`:

```typescript
// Login throttling. The store is injectable: a Prisma-backed one runs in
// production (serverless memory does not persist between requests), an
// in-memory one runs in tests.

export const MAX_FAILURES = 5;
export const WINDOW_MS = 15 * 60 * 1000;

export type AttemptStore = {
  /** Failure timestamps for a key at or after `since`, oldest first. */
  failuresSince(key: string, since: Date): Promise<Date[]>;
  recordFailure(key: string, at: Date): Promise<void>;
  clear(key: string): Promise<void>;
};

export type LoginCheck = { allowed: true } | { allowed: false; retryAfterSeconds: number };

export async function checkLoginAllowed(store: AttemptStore, key: string, now = new Date()): Promise<LoginCheck> {
  const failures = await store.failuresSince(key, new Date(now.getTime() - WINDOW_MS));
  if (failures.length < MAX_FAILURES) return { allowed: true };
  // Locked until the oldest of the last MAX_FAILURES failures leaves the window.
  const deciding = failures[failures.length - MAX_FAILURES];
  const retryAfterSeconds = Math.max(1, Math.ceil((deciding.getTime() + WINDOW_MS - now.getTime()) / 1000));
  return { allowed: false, retryAfterSeconds };
}

export const recordFailedLogin = (store: AttemptStore, key: string, now = new Date()) => store.recordFailure(key, now);
export const recordSuccessfulLogin = (store: AttemptStore, key: string) => store.clear(key);

export function memoryAttemptStore(): AttemptStore {
  const attempts = new Map<string, Date[]>();
  return {
    async failuresSince(key, since) {
      return (attempts.get(key) ?? []).filter((d) => d >= since).sort((a, b) => a.getTime() - b.getTime());
    },
    async recordFailure(key, at) {
      attempts.set(key, [...(attempts.get(key) ?? []), at]);
    },
    async clear(key) {
      attempts.delete(key);
    },
  };
}

/** Keyed hash of the client IP, so raw addresses are never stored. */
export async function hashClientKey(ip: string, secret: string): Promise<string> {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const digest = new Uint8Array(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(ip)));
  return Array.from(digest, (b) => b.toString(16).padStart(2, '0')).join('');
}

export function clientIpFrom(headers: Headers): string {
  return headers.get('x-forwarded-for')?.split(',')[0]?.trim() || headers.get('x-real-ip')?.trim() || 'unknown';
}
```

Create `src/lib/admin/rate-limit-db.ts`:

```typescript
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
```

- [ ] **Step 6: Run the unit and database tests**

```bash
npx tsx --test tests/unit/admin-password.test.ts tests/unit/admin-session.test.ts tests/unit/admin-rate-limit.test.ts
npm run test:db
```

Expected: first command `# pass 20`, `# fail 0` (5 password, 9 session, 6 rate-limit); second `# pass 10`, `# fail 0` (8 schema plus 2 throttle-store tests). If `npm run test:db` cannot connect, run `npm run db:test` first.

- [ ] **Step 7: Add the password-hashing command**

This is how the owner turns a chosen password into the two values that go in Vercel and `.env.local`.

Create `scripts/hash-password.ts`:

```typescript
// Usage: npm run admin:hash
// Prompts (without echo) for the admin password and prints the two values to put in
// Vercel and .env.local. Nothing is written to disk. Needs macOS or Linux for the
// hidden prompt (it uses `stty`); with piped input it just reads the lines.
import { execSync } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import readline from 'node:readline';
import { MIN_PASSWORD_LENGTH, hashPassword } from '@/lib/admin/password';

function setEcho(on: boolean) {
  if (!process.stdin.isTTY) return;
  try {
    execSync(on ? 'stty echo' : 'stty -echo', { stdio: 'inherit' });
  } catch {
    // No stty available: the prompt still works, it just echoes.
  }
}

async function main() {
  const lines = readline.createInterface({ input: process.stdin })[Symbol.asyncIterator]();
  const ask = async (question: string) => {
    process.stdout.write(question);
    setEcho(false);
    try {
      return (await lines.next()).value ?? '';
    } finally {
      setEcho(true);
      process.stdout.write('\n');
    }
  };

  const first = await ask(`Admin password (at least ${MIN_PASSWORD_LENGTH} characters): `);
  const second = await ask('Repeat it: ');
  if (first !== second) throw new Error('The passwords do not match.');
  console.log('\nAdd these to Vercel (Production and Preview) and to .env.local:\n');
  console.log(`ADMIN_PASSWORD_HASH=${await hashPassword(first)}`);
  console.log(`SESSION_SECRET=${randomBytes(32).toString('hex')}\n`);
  console.log('Rotating SESSION_SECRET signs everyone out. Keep both values private.');
  process.exit(0);
}

main().catch((error) => {
  console.error(`FAIL: ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
});
```

```bash
npm pkg set 'scripts.admin:hash=tsx scripts/hash-password.ts'
printf 'correct horse battery\ncorrect horse battery\n' | npm run -s admin:hash
printf 'aaaaaaaaaaaaaa\nbbbbbbbbbbbbbb\n' | npm run -s admin:hash
printf 'short\nshort\n' | npm run -s admin:hash
```

Expected: the first prints two prompts, then `ADMIN_PASSWORD_HASH=scrypt:16384:8:1:<salt>:<hash>` and `SESSION_SECRET=<64 hex characters>`; the second prints `FAIL: The passwords do not match.`; the third prints `FAIL: Password must be at least 12 characters.`. In a real terminal the typed password is not echoed.

- [ ] **Step 8: Typecheck and commit**

```bash
npx tsc --noEmit 2>&1 | grep -E "error TS" | grep -vE "chatbot|invoice|Signature"
git add package.json src/lib/admin/password.ts src/lib/admin/session.ts src/lib/admin/rate-limit.ts src/lib/admin/rate-limit-db.ts scripts/hash-password.ts tests/unit/admin-password.test.ts tests/unit/admin-session.test.ts tests/unit/admin-rate-limit.test.ts tests/db/rate-limit-db.test.ts
git commit -m "feat(admin): scrypt password hashing, signed session cookie and login throttle"
```

Expected: the typecheck prints nothing.

---

### Task 4: The login decision, route guards and middleware

**Files:**
- Create: `src/lib/admin/login.ts`, `src/lib/admin/redirect.ts`, `src/lib/admin/auth.ts`, `src/middleware.ts`, `src/app/api/admin/session/route.ts`
- Test: `tests/unit/admin-login.test.ts`, `tests/unit/admin-redirect.test.ts`, `tests/unit/admin-api-guard.test.ts`, `tests/unit/admin-middleware.test.ts`, `tests/unit/admin-routes-guarded.test.ts`

**Interfaces:**
- Consumes: everything produced by Task 3.
- Produces from `@/lib/admin/login`: `LOGIN_NOT_CONFIGURED` (the string `'Admin login is not configured on this server.'`); `LoginInput = {password: string; ip: string; secret: string; passwordHash: string; store: AttemptStore; now?: Date}`; `LoginResult = {ok: true; token: string}|{ok: false; error: string}`; `attemptLogin(input): Promise<LoginResult>` (fails closed).
- Produces from `@/lib/admin/redirect`: `safeNext(raw): string` (an admin path, else `'/admin'`).
- Produces from `@/lib/admin/auth`: `getAdminSession(): Promise<SessionPayload|null>` and `requireAdmin(): Promise<SessionPayload>` (redirects to `/admin/login`) for server components and actions; `requireAdminApi(request: Request): Promise<Response|null>` for route handlers (returns the 401/403 `Response` to send, or `null` when allowed); `isSameOrigin(request): boolean`.
- Produces: `src/middleware.ts` exporting `middleware` and `config.matcher = ['/admin/:path*', '/api/admin/:path*']`; `GET /api/admin/session` returning `{ ok: true }`.
- **Rule for every later admin route handler:** its first lines are `const denied = await requireAdminApi(request); if (denied) return denied;`. `admin-routes-guarded.test.ts` fails the build if a route does not.

- [ ] **Step 1: Write the failing tests**

Create `tests/unit/admin-login.test.ts`:

```typescript
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { attemptLogin } from '@/lib/admin/login';
import { hashPassword } from '@/lib/admin/password';
import { MAX_FAILURES, hashClientKey, memoryAttemptStore, type AttemptStore } from '@/lib/admin/rate-limit';
import { verifySessionToken } from '@/lib/admin/session';

const SECRET = 's'.repeat(32);
const PASSWORD = 'correct horse battery';
const NOW = new Date('2026-10-09T12:00:00Z');

async function setup(overrides: Partial<Parameters<typeof attemptLogin>[0]> = {}) {
  const store = memoryAttemptStore();
  const input = { password: PASSWORD, ip: '203.0.113.7', secret: SECRET, passwordHash: await hashPassword(PASSWORD), store, now: NOW, ...overrides };
  return { store, input };
}

test('the right password returns a session token that verifies', async () => {
  const { input } = await setup();
  const result = await attemptLogin(input);
  assert.ok(result.ok);
  assert.ok(await verifySessionToken(result.token, SECRET, NOW.getTime()));
});

test('a wrong password is refused with a generic message and counts as a failure', async () => {
  const { input, store } = await setup({ password: 'wrong password!!' });
  const result = await attemptLogin(input);
  assert.deepEqual(result, { ok: false, error: 'Incorrect password.' });
  const failures = await store.failuresSince(await hashClientKey(input.ip, SECRET), new Date(0));
  assert.equal(failures.length, 1);
});

test('the failures are stored under a hash of the IP, never the IP itself', async () => {
  const seen: string[] = [];
  const spy: AttemptStore = { ...memoryAttemptStore(), recordFailure: async (key) => void seen.push(key) };
  const { input } = await setup({ password: 'wrong password!!', store: spy });
  await attemptLogin(input);
  assert.equal(seen.length, 1);
  assert.ok(!seen[0].includes('203.0.113.7'));
});

test('after the maximum failures even the CORRECT password is refused until the lock lifts', async () => {
  const { input } = await setup();
  for (let i = 0; i < MAX_FAILURES; i++) await attemptLogin({ ...input, password: `wrong-password-${i}` });
  const locked = await attemptLogin(input);
  assert.equal(locked.ok, false);
  assert.match(locked.ok === false ? locked.error : '', /Too many attempts\. Try again in 15 minutes\./);
  const later = await attemptLogin({ ...input, now: new Date(NOW.getTime() + 16 * 60 * 1000) });
  assert.equal(later.ok, true);
});

test('a successful login clears earlier failures', async () => {
  const { input } = await setup();
  for (let i = 0; i < MAX_FAILURES - 1; i++) await attemptLogin({ ...input, password: `wrong-password-${i}` });
  assert.equal((await attemptLogin(input)).ok, true);
  for (let i = 0; i < MAX_FAILURES - 1; i++) await attemptLogin({ ...input, password: `wrong-again-${i}` });
  assert.equal((await attemptLogin(input)).ok, true, 'the counter restarted after the success');
});

test('a server without SESSION_SECRET or ADMIN_PASSWORD_HASH fails closed with a configuration message', async () => {
  for (const broken of [{ secret: '' }, { secret: 'short' }, { passwordHash: '' }]) {
    const { input, store } = await setup(broken);
    const result = await attemptLogin(input);
    assert.deepEqual(result, { ok: false, error: 'Admin login is not configured on this server.' }, JSON.stringify(broken));
    assert.equal((await store.failuresSince('anything', new Date(0))).length, 0);
  }
});

test('a garbage ADMIN_PASSWORD_HASH never lets anyone in', async () => {
  for (const passwordHash of ['plain', 'scrypt:1:1:1::', 'x:y:z']) {
    const { input } = await setup({ passwordHash });
    assert.equal((await attemptLogin(input)).ok, false, passwordHash);
  }
});

test('if the attempt store is down the login fails closed instead of skipping the rate limit', async () => {
  const broken: AttemptStore = {
    failuresSince: async () => { throw new Error('connection refused'); },
    recordFailure: async () => { throw new Error('connection refused'); },
    clear: async () => { throw new Error('connection refused'); },
  };
  const { input } = await setup({ store: broken });
  const result = await attemptLogin(input);
  assert.deepEqual(result, { ok: false, error: 'Could not check sign-in attempts. Try again in a moment.' });
});
```

Create `tests/unit/admin-redirect.test.ts`:

```typescript
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { safeNext } from '@/lib/admin/redirect';

test('safeNext keeps admin paths, including query strings', () => {
  assert.equal(safeNext('/admin'), '/admin');
  assert.equal(safeNext('/admin/inbox'), '/admin/inbox');
  assert.equal(safeNext('/admin/library?kind=VIDEO&page=2'), '/admin/library?kind=VIDEO&page=2');
});

test('safeNext falls back to /admin for anything that could leave the admin area', () => {
  for (const bad of [
    '', undefined, null, '/', '/photos', '//evil.com', '/\\evil.com', 'https://evil.com/admin', 'javascript:alert(1)',
    '/administrator', '/adminx/foo', '/admin\r\nSet-Cookie: x=1', '/admin\nfoo', '/admin/../photos', 'admin',
  ]) {
    assert.equal(safeNext(bad as string), '/admin', `should reject ${JSON.stringify(bad)}`);
  }
});
```

Create `tests/unit/admin-api-guard.test.ts`:

```typescript
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { SESSION_COOKIE, createSessionToken } from '@/lib/admin/session';
import { isSameOrigin, requireAdminApi } from '@/lib/admin/auth';

// auth.ts reads SESSION_SECRET when a request is checked, so setting it here is early enough.
process.env.SESSION_SECRET = 'k'.repeat(32);

const URL_ = 'https://example.com/api/admin/thing';
const withCookie = async (extra: Record<string, string> = {}, method = 'GET') =>
  new Request(URL_, { method, headers: { cookie: `${SESSION_COOKIE}=${await createSessionToken(process.env.SESSION_SECRET!)}`, ...extra } });

test('no cookie is 401', async () => {
  const response = await requireAdminApi(new Request(URL_));
  assert.equal(response?.status, 401);
  assert.deepEqual(await response?.json(), { error: 'Unauthorized' });
});

test('a forged or foreign cookie is 401', async () => {
  const forged = new Request(URL_, { headers: { cookie: `${SESSION_COOKIE}=abc.def` } });
  assert.equal((await requireAdminApi(forged))?.status, 401);
  const wrongSecret = await createSessionToken('z'.repeat(32));
  assert.equal((await requireAdminApi(new Request(URL_, { headers: { cookie: `${SESSION_COOKIE}=${wrongSecret}` } })))?.status, 401);
});

test('a valid session passes GET without any Origin header', async () => {
  assert.equal(await requireAdminApi(await withCookie()), null);
});

test('state-changing requests also need a same-origin Origin header', async () => {
  const headers = { host: 'example.com' };
  assert.equal(await requireAdminApi(await withCookie({ ...headers, origin: 'https://example.com' }, 'POST')), null);
  assert.equal((await requireAdminApi(await withCookie({ ...headers, origin: 'https://evil.com' }, 'POST')))?.status, 403);
  assert.equal((await requireAdminApi(await withCookie(headers, 'POST')))?.status, 403, 'missing Origin is refused');
  assert.equal((await requireAdminApi(await withCookie({ ...headers, origin: 'https://evil.com' }, 'DELETE')))?.status, 403);
});

test('isSameOrigin compares the Origin host with the request host, honouring x-forwarded-host', () => {
  const req = (headers: Record<string, string>) => new Request('http://internal:3000/x', { method: 'POST', headers });
  assert.equal(isSameOrigin(req({ origin: 'https://www.site.com', 'x-forwarded-host': 'www.site.com' })), true);
  assert.equal(isSameOrigin(req({ origin: 'http://localhost:3000', host: 'localhost:3000' })), true);
  assert.equal(isSameOrigin(req({ origin: 'https://www.site.com.evil.com', host: 'www.site.com' })), false);
  assert.equal(isSameOrigin(req({ origin: 'null', host: 'www.site.com' })), false);
  assert.equal(isSameOrigin(req({ host: 'www.site.com' })), false);
});
```

Create `tests/unit/admin-middleware.test.ts`:

```typescript
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { NextRequest } from 'next/server';
import { SESSION_COOKIE, createSessionToken } from '@/lib/admin/session';
import { config, middleware } from '@/middleware';

// The middleware reads SESSION_SECRET per request, so setting it here is early enough.
process.env.SESSION_SECRET = 'm'.repeat(32);

const request = async (path: string, signedIn = false) =>
  new NextRequest(`https://example.com${path}`, {
    headers: signedIn ? { cookie: `${SESSION_COOKIE}=${await createSessionToken(process.env.SESSION_SECRET!)}` } : {},
  });

test('the matcher covers the admin pages and the admin API, and nothing else', () => {
  assert.deepEqual(config.matcher, ['/admin/:path*', '/api/admin/:path*']);
});

test('a signed-out visitor to an admin page is sent to the login page, remembering where they were going', async () => {
  const response = await middleware(await request('/admin/library?kind=VIDEO'));
  assert.equal(response.status, 307);
  assert.equal(response.headers.get('location'), 'https://example.com/admin/login?next=%2Fadmin%2Flibrary%3Fkind%3DVIDEO');
});

test('a signed-out call to the admin API gets 401 JSON, not a redirect', async () => {
  const response = await middleware(await request('/api/admin/media'));
  assert.equal(response.status, 401);
  assert.deepEqual(await response.json(), { error: 'Unauthorized' });
});

test('the login page is reachable when signed out, and bounces to /admin when already signed in', async () => {
  const open = await middleware(await request('/admin/login'));
  assert.equal(open.headers.get('x-middleware-next'), '1');
  const bounced = await middleware(await request('/admin/login', true));
  assert.equal(bounced.status, 307);
  assert.equal(bounced.headers.get('location'), 'https://example.com/admin');
});

test('a signed-in visitor passes through', async () => {
  for (const path of ['/admin', '/admin/inbox', '/api/admin/media']) {
    const response = await middleware(await request(path, true));
    assert.equal(response.headers.get('x-middleware-next'), '1', path);
  }
});

test('every admin response is marked noindex and uncacheable, including redirects and 401s', async () => {
  for (const response of [
    await middleware(await request('/admin')),
    await middleware(await request('/api/admin/x')),
    await middleware(await request('/admin/login')),
    await middleware(await request('/admin', true)),
  ]) {
    assert.equal(response.headers.get('x-robots-tag'), 'noindex, nofollow');
    assert.equal(response.headers.get('cache-control'), 'private, no-store');
  }
});

test('a cookie signed with the wrong secret counts as signed out', async () => {
  const forged = new NextRequest('https://example.com/admin', {
    headers: { cookie: `${SESSION_COOKIE}=${await createSessionToken('x'.repeat(32))}` },
  });
  assert.equal((await middleware(forged)).status, 307);
});
```

Create `tests/unit/admin-routes-guarded.test.ts`:

```typescript
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

process.env.SESSION_SECRET = 'r'.repeat(32);

const ROOT = join(process.cwd(), 'src/app/api/admin');
const METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'] as const;

function routeFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const full = join(dir, name);
    return statSync(full).isDirectory() ? routeFiles(full) : name === 'route.ts' ? [full] : [];
  });
}

const files = routeFiles(ROOT);

test('there is at least one admin route to check', () => {
  assert.ok(files.length > 0);
});

for (const file of files) {
  const label = relative(process.cwd(), file);

  test(`${label}: every handler answers 401 to a request with no session`, async () => {
    const routeModule = (await import(file)) as Record<string, unknown>;
    const handlers = METHODS.filter((m) => typeof routeModule[m] === 'function');
    assert.ok(handlers.length > 0, 'route exports no handlers');
    for (const method of handlers) {
      const handler = routeModule[method] as (req: Request, ctx: { params: Promise<Record<string, string>> }) => Promise<Response>;
      const response = await handler(new Request('https://example.com/api/admin/x', { method }), { params: Promise.resolve({ id: 'x' }) });
      assert.equal(response.status, 401, `${method} must not run without a session`);
    }
  });
}
```

- [ ] **Step 2: Run them to verify they fail**

```bash
npx tsx --test tests/unit/admin-login.test.ts tests/unit/admin-redirect.test.ts tests/unit/admin-api-guard.test.ts tests/unit/admin-middleware.test.ts tests/unit/admin-routes-guarded.test.ts
```

Expected: FAIL: `Cannot find module '@/lib/admin/login'` (and `redirect`, `auth`, `@/middleware`), and the routes test fails because `src/app/api/admin` does not exist yet.

- [ ] **Step 3: Implement the login decision and the safe redirect**

Create `src/lib/admin/login.ts`:

```typescript
import { verifyPassword } from './password';
import { checkLoginAllowed, hashClientKey, recordFailedLogin, recordSuccessfulLogin, type AttemptStore } from './rate-limit';
import { createSessionToken } from './session';

export const LOGIN_NOT_CONFIGURED = 'Admin login is not configured on this server.';

export type LoginInput = {
  password: string;
  ip: string;
  secret: string;
  passwordHash: string;
  store: AttemptStore;
  now?: Date;
};
export type LoginResult = { ok: true; token: string } | { ok: false; error: string };

/**
 * The whole login decision, free of Next.js so it can be unit-tested. It fails
 * closed: a missing secret or hash, a locked-out client, or an unreachable attempt
 * store all refuse the login.
 */
export async function attemptLogin(input: LoginInput): Promise<LoginResult> {
  const { password, ip, secret, passwordHash, store, now = new Date() } = input;
  if (secret.length < 32 || !passwordHash) return { ok: false, error: LOGIN_NOT_CONFIGURED };

  try {
    const key = await hashClientKey(ip, secret);
    const check = await checkLoginAllowed(store, key, now);
    if (!check.allowed) {
      const minutes = Math.ceil(check.retryAfterSeconds / 60);
      return { ok: false, error: `Too many attempts. Try again in ${minutes} minute${minutes === 1 ? '' : 's'}.` };
    }
    if (!(await verifyPassword(password, passwordHash))) {
      await recordFailedLogin(store, key, now);
      return { ok: false, error: 'Incorrect password.' };
    }
    await recordSuccessfulLogin(store, key);
    return { ok: true, token: await createSessionToken(secret, now.getTime()) };
  } catch (error) {
    console.error('Admin login could not complete:', error);
    return { ok: false, error: 'Could not check sign-in attempts. Try again in a moment.' };
  }
}
```

Create `src/lib/admin/redirect.ts`:

```typescript
/** Where to go after login. Only same-site admin paths are honoured, so a crafted ?next= cannot bounce a user elsewhere. */
export function safeNext(raw: string | null | undefined): string {
  const fallback = '/admin';
  if (!raw || typeof raw !== 'string') return fallback;
  if (/[\r\n\\]/.test(raw)) return fallback;
  if (raw !== '/admin' && !raw.startsWith('/admin/') && !raw.startsWith('/admin?')) return fallback;
  if (raw.includes('//') || raw.split(/[?#]/)[0].split('/').includes('..')) return fallback;
  return raw;
}
```

- [ ] **Step 4: Implement the guards, the middleware and the first admin route**

Create `src/lib/admin/auth.ts`:

```typescript
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { SESSION_COOKIE, readCookie, verifySessionToken, type SessionPayload } from './session';

// Defence in depth: middleware already turns away signed-out visitors, but every
// route handler and server action re-checks here, because middleware alone has been
// bypassed in past Next.js vulnerabilities.

const secret = () => process.env.SESSION_SECRET ?? '';

/** For server components and server actions. */
export async function getAdminSession(): Promise<SessionPayload | null> {
  return verifySessionToken((await cookies()).get(SESSION_COOKIE)?.value, secret());
}

/** For server components and server actions: redirects to the login page when signed out. */
export async function requireAdmin(): Promise<SessionPayload> {
  const session = await getAdminSession();
  if (!session) redirect('/admin/login');
  return session;
}

/**
 * For Route Handlers. Reads the cookie from the request itself, so it also works
 * outside Next's request scope (which is how it is unit-tested).
 * Returns a Response to send back when access is denied, or null when allowed.
 *
 *   const denied = await requireAdminApi(request);
 *   if (denied) return denied;
 */
export async function requireAdminApi(request: Request): Promise<Response | null> {
  const session = await verifySessionToken(readCookie(request.headers.get('cookie'), SESSION_COOKIE), secret());
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const safeMethod = request.method === 'GET' || request.method === 'HEAD' || request.method === 'OPTIONS';
  if (!safeMethod && !isSameOrigin(request)) return Response.json({ error: 'Forbidden' }, { status: 403 });
  return null;
}

/** The Origin header's host must be this site's host. A missing Origin on a write is refused. */
export function isSameOrigin(request: Request): boolean {
  const origin = request.headers.get('origin');
  if (!origin) return false;
  const host = request.headers.get('x-forwarded-host') ?? request.headers.get('host');
  try {
    return !!host && new URL(origin).host === host;
  } catch {
    return false;
  }
}
```

Create `src/middleware.ts`:

```typescript
import { NextResponse, type NextRequest } from 'next/server';
import { SESSION_COOKIE, verifySessionToken } from '@/lib/admin/session';

// Gatekeeper for the admin area. Every admin response is marked noindex and
// uncacheable. Route handlers and server actions re-check the session themselves.
export const config = { matcher: ['/admin/:path*', '/api/admin/:path*'] };

export async function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const isApi = pathname.startsWith('/api/');
  const isLoginPage = pathname === '/admin/login';
  const session = await verifySessionToken(request.cookies.get(SESSION_COOKIE)?.value, process.env.SESSION_SECRET ?? '');

  let response: NextResponse;
  if (!session && !isLoginPage) {
    response = isApi
      ? NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      : NextResponse.redirect(new URL(`/admin/login?next=${encodeURIComponent(pathname + search)}`, request.url));
  } else if (session && isLoginPage) {
    response = NextResponse.redirect(new URL('/admin', request.url));
  } else {
    response = NextResponse.next();
  }
  response.headers.set('X-Robots-Tag', 'noindex, nofollow');
  response.headers.set('Cache-Control', 'private, no-store');
  return response;
}
```

Create `src/app/api/admin/session/route.ts`:

```typescript
import { requireAdminApi } from '@/lib/admin/auth';

/** Lets the admin UI cheaply confirm its session is still valid. */
export async function GET(request: Request) {
  const denied = await requireAdminApi(request);
  if (denied) return denied;
  return Response.json({ ok: true });
}
```

- [ ] **Step 5: Run the tests to verify they pass**

```bash
npx tsx --test tests/unit/admin-login.test.ts tests/unit/admin-redirect.test.ts tests/unit/admin-api-guard.test.ts tests/unit/admin-middleware.test.ts tests/unit/admin-routes-guarded.test.ts
```

Expected: `# pass 24`, `# fail 0` (8 login, 2 redirect, 5 guard, 7 middleware, 2 route discovery).

If a test in `admin-login.test.ts` fails on the "Too many attempts. Try again in 15 minutes." message, check that `attemptLogin` passes `now` through to `recordFailedLogin` and `checkLoginAllowed`.

- [ ] **Step 6: Typecheck and commit**

```bash
npx tsc --noEmit 2>&1 | grep -E "error TS" | grep -vE "chatbot|invoice|Signature"
git add src/lib/admin/login.ts src/lib/admin/redirect.ts src/lib/admin/auth.ts src/middleware.ts src/app/api/admin/session/route.ts tests/unit/admin-login.test.ts tests/unit/admin-redirect.test.ts tests/unit/admin-api-guard.test.ts tests/unit/admin-middleware.test.ts tests/unit/admin-routes-guarded.test.ts
git commit -m "feat(admin): login decision, route guards and middleware"
```

Expected: the typecheck prints nothing.

---

### Task 5: New UI-kit primitives

**Files:**
- Create: `src/components/ui/toast-reducer.ts`, `src/components/ui/Toast.tsx`, `src/components/ui/Field.tsx`, `src/components/ui/Textarea.tsx`, `src/components/ui/Select.tsx`, `src/components/ui/Switch.tsx`, `src/components/ui/Checkbox.tsx`, `src/components/ui/StatusTag.tsx`, `src/components/ui/Dialog.tsx`
- Test: `tests/unit/toast-reducer.test.ts`
- Modify: `src/components/ui/index.ts`

**Interfaces:**
- Consumes: existing kit pieces `Button`, `Title`, `iconButtonClasses` (from `IconButton`), `cx` from `@/lib/cx`; icons from `lucide-react`.
- Produces (all exported from `@/components/ui`):
  - `Field({label, htmlFor, hint?, error?, className?, children})`: a visible label plus control plus hint/error text; the control must carry `id={htmlFor}`.
  - `Textarea({label, wrapperClassName?, rows?, ...textareaProps})` and `Select({label, wrapperClassName?, ...selectProps, children})`: styled like `Input`; `label` becomes `aria-label`.
  - `Switch({checked, onChange(checked), label, disabled?, className?})` (`role="switch"`); `Checkbox({label?, ...inputProps})` (a bare checkbox needs `aria-label`).
  - `Status = 'DRAFT'|'PUBLISHED'|'PENDING'|'FAILED'` and `StatusTag({status, className?})`.
  - `Dialog({open, onClose, title, description?, children?, actions?})` and `ConfirmDialog({open, title, description?, confirmLabel, cancelLabel?, busy?, onConfirm, onCancel})`, built on the native `<dialog>`.
  - `ToastProvider` and `useToast(): (message: string, options?: {tone?: 'info'|'error'; durationMs?: number}) => void` (at most 3 toasts at once; errors stay 8 s, others 5 s).
  - `toast-reducer.ts` (pure): `ToastTone`, `ToastItem = {id: number; message: string; tone: ToastTone; durationMs: number}`, `MAX_TOASTS = 3`, `toastReducer(state, action)` with actions `{type: 'add'; toast}` and `{type: 'dismiss'; id}`.

The spec also lists a dropzone and a sortable (drag-to-reorder) list. They are added by the plans that first use them (the dropzone in plan 2's upload screen, the sortable list in plan 4's collection editor), so they are built against a real use instead of guessed at here.

These components are exercised in a browser in Task 6 (on the `/admin/kit` page), so this task checks the logic that can be tested directly (the toast reducer) plus types and lint.

- [ ] **Step 1: Write the failing test**

Create `tests/unit/toast-reducer.test.ts`:

```typescript
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { MAX_TOASTS, toastReducer, type ToastItem } from '@/components/ui/toast-reducer';

const item = (id: number, message = `m${id}`): ToastItem => ({ id, message, tone: 'info', durationMs: 5000 });

test('adding a toast appends it', () => {
  assert.deepEqual(toastReducer([], { type: 'add', toast: item(1) }), [item(1)]);
});

test('dismissing removes only that toast and ignores unknown ids', () => {
  const state = [item(1), item(2)];
  assert.deepEqual(toastReducer(state, { type: 'dismiss', id: 1 }), [item(2)]);
  assert.deepEqual(toastReducer(state, { type: 'dismiss', id: 99 }), state);
});

test('only the newest MAX_TOASTS are kept, so a burst of errors cannot cover the screen', () => {
  let state: ToastItem[] = [];
  for (let i = 1; i <= MAX_TOASTS + 2; i++) state = toastReducer(state, { type: 'add', toast: item(i) });
  assert.equal(state.length, MAX_TOASTS);
  assert.equal(state[0].id, 3);
  assert.equal(state[state.length - 1].id, MAX_TOASTS + 2);
});

test('the reducer never mutates its input', () => {
  const state = Object.freeze([item(1)]) as ToastItem[];
  assert.doesNotThrow(() => toastReducer(state, { type: 'add', toast: item(2) }));
  assert.doesNotThrow(() => toastReducer(state, { type: 'dismiss', id: 1 }));
});
```

- [ ] **Step 2: Run it to verify it fails**

```bash
npx tsx --test tests/unit/toast-reducer.test.ts
```

Expected: FAIL with `Cannot find module '@/components/ui/toast-reducer'`.

- [ ] **Step 3: Implement the toast reducer and provider**

Create `src/components/ui/toast-reducer.ts`:

```typescript
export type ToastTone = 'info' | 'error';
export type ToastItem = { id: number; message: string; tone: ToastTone; durationMs: number };
export type ToastAction = { type: 'add'; toast: ToastItem } | { type: 'dismiss'; id: number };

export const MAX_TOASTS = 3;

export function toastReducer(state: ToastItem[], action: ToastAction): ToastItem[] {
  if (action.type === 'add') return [...state, action.toast].slice(-MAX_TOASTS);
  return state.some((t) => t.id === action.id) ? state.filter((t) => t.id !== action.id) : state;
}
```

Create `src/components/ui/Toast.tsx`:

```tsx
'use client';

import React, { createContext, useCallback, useContext, useEffect, useMemo, useReducer, useRef } from 'react';
import { X } from 'lucide-react';
import { cx } from '@/lib/cx';
import { iconButtonClasses } from './IconButton';
import { toastReducer, type ToastTone } from './toast-reducer';

type ToastOptions = { tone?: ToastTone; durationMs?: number };
type ToastFn = (message: string, options?: ToastOptions) => void;

const ToastContext = createContext<ToastFn | null>(null);

/** `const toast = useToast(); toast('Saved'); toast('Upload failed', { tone: 'error' });` */
export function useToast(): ToastFn {
  const toast = useContext(ToastContext);
  if (!toast) throw new Error('useToast must be used inside <ToastProvider>.');
  return toast;
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, dispatch] = useReducer(toastReducer, []);
  const nextId = useRef(1);
  const timers = useRef(new Map<number, ReturnType<typeof setTimeout>>());

  const dismiss = useCallback((id: number) => {
    clearTimeout(timers.current.get(id));
    timers.current.delete(id);
    dispatch({ type: 'dismiss', id });
  }, []);

  const toast = useCallback<ToastFn>(
    (message, options = {}) => {
      const tone = options.tone ?? 'info';
      const id = nextId.current++;
      const durationMs = options.durationMs ?? (tone === 'error' ? 8000 : 5000);
      dispatch({ type: 'add', toast: { id, message, tone, durationMs } });
      timers.current.set(id, setTimeout(() => dismiss(id), durationMs));
    },
    [dismiss]
  );

  useEffect(() => {
    const pending = timers.current;
    return () => pending.forEach(clearTimeout);
  }, []);

  const value = useMemo(() => toast, [toast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div role="region" aria-label="Notifications" className="pointer-events-none fixed inset-x-0 bottom-4 z-[2000] flex flex-col items-center gap-2 px-4">
        {toasts.map((t) => (
          <div
            key={t.id}
            role={t.tone === 'error' ? 'alert' : 'status'}
            className={cx(
              'pointer-events-auto flex w-full max-w-md items-start gap-3 rounded-ui border bg-bg px-4 py-3 font-sans text-[0.9375rem] text-fg shadow-[0_8px_30px_rgba(0,0,0,0.12)]',
              t.tone === 'error' ? 'border-fg' : 'border-border-strong'
            )}
          >
            <span className="min-w-0 flex-1 leading-[1.45]">{t.message}</span>
            <button type="button" aria-label="Dismiss notification" onClick={() => dismiss(t.id)} className={cx(iconButtonClasses('plain', 'sm'), '-mr-2 -mt-1')}>
              <X aria-hidden="true" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
```

- [ ] **Step 4: Implement the form and feedback primitives**

Create `src/components/ui/Field.tsx`:

```tsx
import React from 'react';
import { cx } from '@/lib/cx';

export type FieldProps = {
  label: string;
  htmlFor: string;
  hint?: React.ReactNode;
  error?: React.ReactNode;
  className?: string;
  children: React.ReactNode;
};

/** A visible label, a control, and optional hint/error text. The control needs `id={htmlFor}`. */
export function Field({ label, htmlFor, hint, error, className, children }: FieldProps) {
  return (
    <div className={cx('grid gap-1.5', className)}>
      <label htmlFor={htmlFor} className="eyebrow text-[0.75rem] text-muted">
        {label}
      </label>
      {children}
      {error ? (
        <p role="alert" className="font-sans text-[0.8125rem] font-bold text-fg">
          {error}
        </p>
      ) : hint ? (
        <p className="font-sans text-[0.8125rem] text-muted">{hint}</p>
      ) : null}
    </div>
  );
}
```

Create `src/components/ui/Textarea.tsx`:

```tsx
import React from 'react';
import { cx } from '@/lib/cx';

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: string;
  wrapperClassName?: string;
}

export function Textarea({ label, wrapperClassName, className, rows = 4, ...rest }: TextareaProps) {
  return (
    <div className={cx('relative w-full', wrapperClassName)}>
      <textarea
        aria-label={label}
        rows={rows}
        {...rest}
        className={cx(
          'min-h-24 w-full resize-y rounded-ui border border-faint bg-transparent px-3 py-2.5 font-sans text-[0.9375rem] leading-[1.5] text-fg placeholder:text-muted transition-colors duration-150 hover:border-accent-hairline focus-visible:border-accent',
          className
        )}
      />
    </div>
  );
}
```

Create `src/components/ui/Select.tsx`:

```tsx
import React from 'react';
import { ChevronDown } from 'lucide-react';
import { cx } from '@/lib/cx';

export interface SelectProps extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, 'size'> {
  label: string;
  wrapperClassName?: string;
}

/** A native <select> (best on phones) styled like Input. */
export function Select({ label, wrapperClassName, className, children, ...rest }: SelectProps) {
  return (
    <div className={cx('relative w-full', wrapperClassName)}>
      <select
        aria-label={label}
        {...rest}
        className={cx(
          'h-11 w-full cursor-pointer appearance-none rounded-ui border border-faint bg-transparent pl-3 pr-9 font-sans text-[0.9375rem] text-fg transition-colors duration-150 hover:border-accent-hairline focus-visible:border-accent disabled:cursor-not-allowed disabled:opacity-45',
          className
        )}
      >
        {children}
      </select>
      <ChevronDown aria-hidden="true" className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted" />
    </div>
  );
}
```

Create `src/components/ui/Switch.tsx`:

```tsx
'use client';

import React from 'react';
import { cx } from '@/lib/cx';

export type SwitchProps = {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: React.ReactNode;
  disabled?: boolean;
  className?: string;
};

export function Switch({ checked, onChange, label, disabled, className }: SwitchProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cx('group inline-flex cursor-pointer items-center gap-3 text-left font-sans text-[0.9375rem] text-fg disabled:cursor-not-allowed disabled:opacity-45', className)}
    >
      <span
        aria-hidden="true"
        className={cx(
          'relative h-5 w-9 shrink-0 rounded-full border transition-colors duration-150 ease-ui',
          checked ? 'border-accent bg-accent' : 'border-faint bg-transparent group-hover:border-accent-hairline'
        )}
      >
        <span
          className={cx(
            'absolute top-0.5 size-3.5 rounded-full transition-all duration-150 ease-ui',
            checked ? 'left-[1.0625rem] bg-bg' : 'left-0.5 bg-faint'
          )}
        />
      </span>
      <span>{label}</span>
    </button>
  );
}
```

Create `src/components/ui/Checkbox.tsx`:

```tsx
import React from 'react';
import { cx } from '@/lib/cx';

export interface CheckboxProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type' | 'size'> {
  /** Visible text. Omit it for a bare checkbox (e.g. in a grid tile) and pass `aria-label` instead. */
  label?: React.ReactNode;
}

export function Checkbox({ label, className, ...rest }: CheckboxProps) {
  return (
    <label className={cx('inline-flex cursor-pointer items-center gap-2 font-sans text-[0.9375rem] text-fg', className)}>
      <input type="checkbox" {...rest} className="size-4 shrink-0 cursor-pointer rounded-ui accent-[var(--accent)]" />
      {label && <span>{label}</span>}
    </label>
  );
}
```

Create `src/components/ui/StatusTag.tsx`:

```tsx
import React from 'react';
import { cx } from '@/lib/cx';

export type Status = 'DRAFT' | 'PUBLISHED' | 'PENDING' | 'FAILED';

const LABELS: Record<Status, string> = { DRAFT: 'Draft', PUBLISHED: 'Published', PENDING: 'Processing', FAILED: 'Failed' };
const TONES: Record<Status, string> = {
  PUBLISHED: 'border-accent text-accent',
  DRAFT: 'border-border text-muted',
  PENDING: 'border-border text-muted',
  FAILED: 'border-fg font-bold text-fg',
};

export function StatusTag({ status, className }: { status: Status; className?: string }) {
  return (
    <span className={cx('inline-flex min-h-6 items-center rounded-ui border px-2 py-0.5 font-sans text-[0.75rem] leading-none', TONES[status], className)}>
      {LABELS[status]}
    </span>
  );
}
```

Create `src/components/ui/Dialog.tsx`:

```tsx
'use client';

import React, { useEffect, useRef } from 'react';
import { Button } from './Button';
import { Title } from './Title';

export type DialogProps = {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: React.ReactNode;
  children?: React.ReactNode;
  /** Buttons shown at the bottom (right-aligned). */
  actions?: React.ReactNode;
};

/** A modal built on the native <dialog>: focus trapping, Esc to close and an inert page behind it come for free. */
export function Dialog({ open, onClose, title, description, children, actions }: DialogProps) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      aria-labelledby="dialog-title"
      onClose={onClose}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="m-auto w-[calc(100%-2rem)] max-w-md rounded-ui border border-border bg-bg p-0 text-fg backdrop:bg-black/50"
    >
      {open && (
        <div className="grid gap-4 p-5 sm:p-6">
          <Title as="h2" size="h3" id="dialog-title">
            {title}
          </Title>
          {description && <p className="m-0 font-sans text-[0.9375rem] leading-[1.55] text-muted">{description}</p>}
          {children}
          {actions && <div className="mt-2 flex flex-wrap justify-end gap-2">{actions}</div>}
        </div>
      )}
    </dialog>
  );
}

export type ConfirmDialogProps = {
  open: boolean;
  title: string;
  description?: React.ReactNode;
  confirmLabel: string;
  cancelLabel?: string;
  busy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
};

export function ConfirmDialog({ open, title, description, confirmLabel, cancelLabel = 'Cancel', busy, onConfirm, onCancel }: ConfirmDialogProps) {
  return (
    <Dialog
      open={open}
      onClose={onCancel}
      title={title}
      description={description}
      actions={
        <>
          <Button variant="outline" onClick={onCancel} disabled={busy}>
            {cancelLabel}
          </Button>
          <Button variant="primary" onClick={onConfirm} disabled={busy}>
            {busy ? 'Working…' : confirmLabel}
          </Button>
        </>
      }
    />
  );
}
```

- [ ] **Step 5: Export them from the kit**

In `src/components/ui/index.ts`, replace:

```typescript
export * from './ChatBubble';
```

with:

```typescript
export * from './ChatBubble';
export * from './Field';
export * from './Textarea';
export * from './Select';
export * from './Switch';
export * from './Checkbox';
export * from './StatusTag';
export * from './Dialog';
export * from './Toast';
```

- [ ] **Step 6: Run the test, typecheck and lint**

```bash
npx tsx --test tests/unit/toast-reducer.test.ts
npx tsc --noEmit 2>&1 | grep -E "error TS" | grep -vE "chatbot|invoice|Signature"
npx eslint src/components/ui tests
```

Expected: `# pass 4`, `# fail 0`; then no output from the typecheck and no output from eslint.

- [ ] **Step 7: Commit**

```bash
git add src/components/ui tests/unit/toast-reducer.test.ts
git commit -m "feat(ui): form fields, switch, checkbox, status tag, dialog and toasts"
```

---

### Task 6: Login page, admin shell, dashboard, site wiring and the verification harness

**Files:**
- Create: `src/lib/admin/nav.ts`, `src/app/admin/layout.tsx`, `src/app/admin/login/actions.ts`, `src/app/admin/login/LoginForm.tsx`, `src/app/admin/login/page.tsx`, `src/app/admin/(authed)/layout.tsx`, `src/app/admin/(authed)/page.tsx`, `src/app/admin/(authed)/kit/page.tsx`, `src/app/admin/(authed)/kit/KitDemo.tsx`, `src/components/admin/AdminHeader.tsx`, `src/components/AnalyticsGate.tsx`
- Create: `scripts/verify-env.ts`, `scripts/verify-build.sh`, `scripts/browser/common.mjs`, `scripts/browser/admin-auth.mjs`, `scripts/browser/admin-kit.mjs`
- Test: `tests/unit/admin-nav.test.ts`, `tests/unit/next-config.test.ts`
- Modify: `src/app/ClientLayoutWrapper.tsx`, `src/app/layout.tsx`, `next.config.ts`, `next-sitemap.config.js`, `package.json` (via `npm`)

**Interfaces:**
- Consumes: Tasks 3-5 (`attemptLogin`, `LOGIN_NOT_CONFIGURED`, `clientIpFrom`, `prismaAttemptStore`, `safeNext`, `SESSION_COOKIE`, `sessionCookieOptions`, `requireAdmin`, `getDb`, the new UI kit, `ToastProvider`).
- Produces: `ADMIN_NAV: AdminNavItem[]` and `isNavActive(item, pathname)` from `@/lib/admin/nav`, where `AdminNavItem = {label: string; href: string; exact?: boolean}`. **Each later phase appends its screens to `ADMIN_NAV`.**
- Produces: `loginAction(prev, formData): Promise<LoginState>`, `logoutAction()` from `@/app/admin/login/actions`; `<AdminHeader />`; the route group `src/app/admin/(authed)/`, whose layout calls `requireAdmin()` and wraps pages in `<ToastProvider>`. **Every later admin page lives inside `(authed)`.**
- Produces: `npm run verify:env`, `verify:start`, `verify:stop`, `verify:admin`, and `scripts/browser/common.mjs` exporting `BASE`, `PASSWORD`, `SHOTS`, `launch()`, `resetLoginAttempts()`, `signIn(page)`, `finish(results, errors?)` for later plans' browser checks.

- [ ] **Step 1: Write the failing tests**

Create `tests/unit/admin-nav.test.ts`:

```typescript
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isNavActive } from '@/lib/admin/nav';

test('an exact item is active only on its own path', () => {
  const dashboard = { label: 'Dashboard', href: '/admin', exact: true };
  assert.equal(isNavActive(dashboard, '/admin'), true);
  assert.equal(isNavActive(dashboard, '/admin/library'), false);
});

test('a section item is active on its path and below it, but not on a sibling that shares a prefix', () => {
  const library = { label: 'Library', href: '/admin/library' };
  assert.equal(isNavActive(library, '/admin/library'), true);
  assert.equal(isNavActive(library, '/admin/library/abc'), true);
  assert.equal(isNavActive(library, '/admin/library-old'), false);
  assert.equal(isNavActive(library, '/admin'), false);
});
```

Create `tests/unit/next-config.test.ts`:

```typescript
import { test } from 'node:test';
import assert from 'node:assert/strict';
import nextConfig from '../../next.config';
import { isPublicBlobUrl } from '@/lib/blob-paths';

test('next/image may load from public Blob stores', () => {
  assert.deepEqual(nextConfig.images?.remotePatterns, [{ protocol: 'https', hostname: '**.public.blob.vercel-storage.com' }]);
});

test('the Blob host pattern agrees with the URL check used for article images', () => {
  assert.equal(isPublicBlobUrl('https://store123.public.blob.vercel-storage.com/photos/a.jpg'), true);
});

test('existing redirects are untouched', async () => {
  const redirects = (await nextConfig.redirects?.()) ?? [];
  const sources = redirects.map((r) => r.source);
  for (const source of ['/gallery', '/about', '/resume', '/mcat', '/articles']) assert.ok(sources.includes(source), `${source} redirect must remain`);
});
```

- [ ] **Step 2: Run them to verify they fail**

```bash
npx tsx --test tests/unit/admin-nav.test.ts tests/unit/next-config.test.ts
```

Expected: FAIL: `Cannot find module '@/lib/admin/nav'`, and the config test fails because `images.remotePatterns` is not configured yet.

- [ ] **Step 3: Add the nav registry**

Create `src/lib/admin/nav.ts`:

```typescript
/** Admin navigation. Each later phase appends its screens here. */
export type AdminNavItem = { label: string; href: string; exact?: boolean };

export const ADMIN_NAV: AdminNavItem[] = [{ label: 'Dashboard', href: '/admin', exact: true }];

export function isNavActive(item: AdminNavItem, pathname: string): boolean {
  return item.exact ? pathname === item.href : pathname === item.href || pathname.startsWith(`${item.href}/`);
}
```

- [ ] **Step 4: Add the login page**

Create `src/app/admin/login/actions.ts`:

```typescript
'use server';

import { cookies, headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { LOGIN_NOT_CONFIGURED, attemptLogin } from '@/lib/admin/login';
import { clientIpFrom } from '@/lib/admin/rate-limit';
import { prismaAttemptStore } from '@/lib/admin/rate-limit-db';
import { safeNext } from '@/lib/admin/redirect';
import { SESSION_COOKIE, sessionCookieOptions } from '@/lib/admin/session';

export type LoginState = { error?: string };

export async function loginAction(_previous: LoginState, formData: FormData): Promise<LoginState> {
  const result = await attemptLogin({
    password: String(formData.get('password') ?? ''),
    ip: clientIpFrom(await headers()),
    secret: process.env.SESSION_SECRET ?? '',
    passwordHash: process.env.ADMIN_PASSWORD_HASH ?? '',
    store: prismaAttemptStore(),
  });

  if (!result.ok) {
    if (result.error === LOGIN_NOT_CONFIGURED) {
      console.error('Admin login is not configured: set SESSION_SECRET and ADMIN_PASSWORD_HASH (see docs/admin-setup.md).');
    }
    return { error: result.error };
  }

  (await cookies()).set(SESSION_COOKIE, result.token, sessionCookieOptions(process.env.NODE_ENV === 'production'));
  redirect(safeNext(String(formData.get('next') ?? '')));
}

export async function logoutAction() {
  (await cookies()).delete(SESSION_COOKIE);
  redirect('/admin/login');
}
```

Create `src/app/admin/login/LoginForm.tsx`:

```tsx
'use client';

import { useActionState } from 'react';
import { Button, Input } from '@/components/ui';
import { loginAction, type LoginState } from './actions';

export function LoginForm({ next }: { next: string }) {
  const [state, action, pending] = useActionState<LoginState, FormData>(loginAction, {});

  return (
    <form action={action} className="grid gap-4">
      <input type="hidden" name="next" value={next} />
      <Input label="Password" type="password" name="password" placeholder="Password" autoComplete="current-password" autoFocus required />
      {state.error && (
        <p role="alert" className="font-sans text-[0.875rem] text-fg">
          {state.error}
        </p>
      )}
      <Button type="submit" variant="primary" fullWidth disabled={pending}>
        {pending ? 'Signing in…' : 'Sign in'}
      </Button>
    </form>
  );
}
```

Create `src/app/admin/login/page.tsx`:

```tsx
import { Meta, Panel, Title } from '@/components/ui';
import { safeNext } from '@/lib/admin/redirect';
import { LoginForm } from './LoginForm';

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  return (
    <main className="mx-auto grid min-h-dvh w-full max-w-[26rem] place-items-center px-[var(--gutter)] py-12">
      <Panel className="w-full">
        <Meta as="p" className="mb-2">
          Admin
        </Meta>
        <Title as="h1" size="h2" className="mb-6">
          Sign in
        </Title>
        <LoginForm next={safeNext(next)} />
      </Panel>
    </main>
  );
}
```

- [ ] **Step 5: Add the admin layout, header, dashboard and UI-kit page**

Create `src/app/admin/layout.tsx`:

```tsx
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Admin',
  robots: { index: false, follow: false },
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return children;
}
```

Create `src/components/admin/AdminHeader.tsx`:

```tsx
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Button, Container, Signature, ThemeToggle } from '@/components/ui';
import { logoutAction } from '@/app/admin/login/actions';
import { ADMIN_NAV, isNavActive } from '@/lib/admin/nav';

const linkClass =
  'whitespace-nowrap py-1.5 font-sans text-[0.9375rem] font-bold text-muted transition-colors duration-300 hover:text-fg aria-[current=page]:text-fg';

export function AdminHeader() {
  const pathname = usePathname();
  const links = ADMIN_NAV.map((item) => (
    <Link key={item.href} href={item.href} aria-current={isNavActive(item, pathname) ? 'page' : undefined} className={linkClass}>
      {item.label}
    </Link>
  ));

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-bg">
      <Container width="wide" className="flex h-[var(--nav-h)] items-center justify-between gap-4">
        <Link href="/admin" aria-label="Admin home" className="leading-none">
          <Signature tone="muted" className="h-[30px] w-auto text-muted transition-colors duration-150 ease-ui hover:text-fg sm:h-[34px]" />
        </Link>
        <nav aria-label="Admin" className="hidden items-center gap-6 md:flex">
          {links}
        </nav>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="ghost" href="/" newTab>
            View site
          </Button>
          <ThemeToggle />
          <form action={logoutAction}>
            <Button size="sm" type="submit">
              Log out
            </Button>
          </form>
        </div>
      </Container>
      <nav aria-label="Admin sections" className="border-t border-border md:hidden">
        <Container width="wide" className="flex gap-6 overflow-x-auto py-1">
          {links}
        </Container>
      </nav>
    </header>
  );
}
```

Create `src/app/admin/(authed)/layout.tsx`:

```tsx
import { AdminHeader } from '@/components/admin/AdminHeader';
import { ToastProvider } from '@/components/ui';
import { requireAdmin } from '@/lib/admin/auth';

export default async function AuthedAdminLayout({ children }: { children: React.ReactNode }) {
  await requireAdmin();
  return (
    <ToastProvider>
      <AdminHeader />
      <div className="pb-24">{children}</div>
    </ToastProvider>
  );
}
```

Create `src/app/admin/(authed)/page.tsx`:

```tsx
import { Container, PageHeader, Panel, Stat } from '@/components/ui';
import { getDb } from '@/lib/db';

export const dynamic = 'force-dynamic';

export default async function AdminDashboard() {
  const db = getDb();
  const [photos, videos, drafts, collections, articles] = await Promise.all([
    db.media.count({ where: { kind: 'PHOTO' } }),
    db.media.count({ where: { kind: 'VIDEO' } }),
    db.media.count({ where: { status: 'DRAFT' } }),
    db.collection.count(),
    db.article.count(),
  ]);

  return (
    <Container as="main" width="wide">
      <PageHeader title="Admin" subtitle="Everything you publish on the site, in one place." />
      <Panel>
        <dl className="m-0 grid grid-cols-2 gap-x-6 gap-y-8 sm:grid-cols-5">
          <Stat value={photos} label="Photos" />
          <Stat value={videos} label="Videos" />
          <Stat value={drafts} label="Drafts" />
          <Stat value={collections} label="Collections" />
          <Stat value={articles} label="Articles" />
        </dl>
      </Panel>
    </Container>
  );
}
```

Create `src/app/admin/(authed)/kit/page.tsx`:

```tsx
import { Container, PageHeader } from '@/components/ui';
import { KitDemo } from './KitDemo';

export default function KitPage() {
  return (
    <Container as="main" width="wide">
      <PageHeader title="UI kit" subtitle="The admin's building blocks, in the site's own style." />
      <KitDemo />
    </Container>
  );
}
```

Create `src/app/admin/(authed)/kit/KitDemo.tsx`:

```tsx
'use client';

import { useState } from 'react';
import { Button, Checkbox, ConfirmDialog, Dialog, Field, Input, Panel, Select, StatusTag, Switch, Textarea, Title, useToast } from '@/components/ui';

export function KitDemo() {
  const toast = useToast();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [infoOpen, setInfoOpen] = useState(false);
  const [published, setPublished] = useState(false);
  const [checked, setChecked] = useState(false);

  return (
    <div className="grid gap-8">
      <Panel>
        <Title as="h2" size="h3" className="mb-4">Fields</Title>
        <div className="grid max-w-md gap-4">
          <Field label="Caption" htmlFor="kit-caption" hint="Shown under the photo and in the viewer.">
            <Input id="kit-caption" label="Caption" placeholder="A quiet morning" />
          </Field>
          <Field label="Place" htmlFor="kit-place" error="Place is required.">
            <Input id="kit-place" label="Place" placeholder="Torrey Pines, San Diego" />
          </Field>
          <Field label="Notes" htmlFor="kit-notes">
            <Textarea id="kit-notes" label="Notes" placeholder="Anything worth remembering" />
          </Field>
          <Field label="Status" htmlFor="kit-status">
            <Select id="kit-status" label="Status" defaultValue="DRAFT">
              <option value="DRAFT">Draft</option>
              <option value="PUBLISHED">Published</option>
            </Select>
          </Field>
        </div>
      </Panel>

      <Panel>
        <Title as="h2" size="h3" className="mb-4">Controls</Title>
        <div className="flex flex-wrap items-center gap-6">
          <Switch checked={published} onChange={setPublished} label={published ? 'Published' : 'Draft'} />
          <Checkbox label="Select" checked={checked} onChange={(e) => setChecked(e.target.checked)} />
          <div className="flex gap-2">
            <StatusTag status="DRAFT" />
            <StatusTag status="PUBLISHED" />
            <StatusTag status="PENDING" />
            <StatusTag status="FAILED" />
          </div>
        </div>
      </Panel>

      <Panel>
        <Title as="h2" size="h3" className="mb-4">Dialogs and toasts</Title>
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => setInfoOpen(true)}>Open dialog</Button>
          <Button onClick={() => setConfirmOpen(true)}>Open confirm</Button>
          <Button variant="outline" onClick={() => toast('Saved')}>Info toast</Button>
          <Button variant="outline" onClick={() => toast('Upload failed: file too large', { tone: 'error' })}>Error toast</Button>
        </div>
      </Panel>

      <Dialog open={infoOpen} onClose={() => setInfoOpen(false)} title="About this dialog" description="It is a native dialog, so Esc closes it and focus stays inside." actions={<Button onClick={() => setInfoOpen(false)}>Close</Button>} />
      <ConfirmDialog
        open={confirmOpen}
        title="Delete this photo?"
        description="It appears in 2 published grids. This cannot be undone."
        confirmLabel="Delete"
        onCancel={() => setConfirmOpen(false)}
        onConfirm={() => {
          setConfirmOpen(false);
          toast('Deleted');
        }}
      />
    </div>
  );
}
```

- [ ] **Step 6: Keep the site chrome off the admin, and keep analytics off it too**

The site wrapper currently adds the public nav, footer and page offset to every page except `/invoice`. The admin brings its own header, so it joins that exception:

In `src/app/ClientLayoutWrapper.tsx`, replace:

```tsx
  const invoiceLayout = ['/invoice'].some((path) => pathname.startsWith(path));
```

with:

```tsx
  // Pages that bring their own chrome (or none): no site nav, footer or page offset.
  const invoiceLayout = ['/invoice', '/admin'].some((path) => pathname.startsWith(path));
```

Create `src/components/AnalyticsGate.tsx`:

```tsx
'use client';

import { GoogleAnalytics } from '@next/third-parties/google';
import { usePathname } from 'next/navigation';

/** Google Analytics for the public site only: admin pages are never reported. */
export function AnalyticsGate({ gaId }: { gaId: string }) {
  const pathname = usePathname();
  if (pathname.startsWith('/admin')) return null;
  return <GoogleAnalytics gaId={gaId} />;
}
```

Use it in the root layout instead of `GoogleAnalytics` directly. Two edits in `src/app/layout.tsx`:

In `src/app/layout.tsx`, replace:

```tsx
import { GoogleAnalytics } from "@next/third-parties/google";
```

with:

```tsx
import { AnalyticsGate } from "@/components/AnalyticsGate";
```

In `src/app/layout.tsx`, replace:

```tsx
<GoogleAnalytics gaId="G-5YDYQ636NM" />
```

with:

```tsx
<AnalyticsGate gaId="G-5YDYQ636NM" />
```

- [ ] **Step 7: Allow Blob images, and disallow the admin in robots**

In `next.config.ts`, replace:

```typescript
  async redirects() {
```

with:

```typescript
  images: {
    // Photos, posters and article images are served from the public Vercel Blob store.
    remotePatterns: [{ protocol: 'https', hostname: '**.public.blob.vercel-storage.com' }],
  },
  async redirects() {
```

In `next-sitemap.config.js`, replace:

```javascript
    exclude: ['/invoice', '/meetings', '/meetings/*', '/sf', '/legal/*', '/gallery'],
```

with:

```javascript
    exclude: ['/invoice', '/meetings', '/meetings/*', '/sf', '/legal/*', '/gallery', '/admin', '/admin/*'],
    robotsTxtOptions: {
      // The admin is also noindex via middleware; disallow keeps well-behaved crawlers from even requesting it.
      policies: [{ userAgent: '*', allow: '/', disallow: ['/admin', '/api/admin'] }],
    },
```

- [ ] **Step 8: Add the verification harness**

These scripts build the *committed* code in a throwaway copy (never in your checkout, so your dev servers and their `.next` folder are untouched) with test-only credentials, then drive it with a real browser.

```bash
npm install --save-dev playwright-core@1.55.0
```

Create `scripts/verify-env.ts`:

```typescript
// Usage: npm run verify:env
// Writes .env.verify: TEST-ONLY settings for `npm run verify:start`. It points at the local
// throwaway database and uses a made-up admin password, so verification never touches
// real data or real secrets. The file is git-ignored (.env*).
import { randomBytes } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import { hashPassword } from '@/lib/admin/password';

export const VERIFY_PASSWORD = 'verify-password-123';

async function main() {
  const databaseUrl = execFileSync('scripts/db.sh', ['url', 'test'], { encoding: 'utf8' }).trim();
  const lines = [
    '# TEST-ONLY values for local verification. Generated by `npm run verify:env`.',
    `DATABASE_URL=${databaseUrl}`,
    `ADMIN_PASSWORD_HASH=${await hashPassword(VERIFY_PASSWORD)}`,
    `SESSION_SECRET=${randomBytes(32).toString('hex')}`,
    'OPENAI_API_KEY=verify-placeholder',
    'STRIPE_SECRET_KEY=verify-placeholder',
    '',
  ];
  writeFileSync('.env.verify', lines.join('\n'));
  console.log(`wrote .env.verify (admin password for verification: ${VERIFY_PASSWORD})`);
}

main().catch((error) => {
  console.error(`FAIL: ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
});
```

Create `scripts/verify-build.sh`:

```bash
#!/usr/bin/env bash
# Build and serve the COMMITTED code (HEAD) in a throwaway copy, so your own dev server
# and its .next folder are never touched, and with TEST-ONLY settings from .env.verify.
#   scripts/verify-build.sh start [port]   build, serve, print the URL (default port 3104)
#   scripts/verify-build.sh stop  [port]   stop the server and delete the copy
set -euo pipefail

cmd="${1:-}"
port="${2:-3104}"
root="$(git rev-parse --show-toplevel)"
dir="${HOME}/.cache/sw-verify-${port}"

# PID listening on the port. lsof works on macOS and most Linux; some sandboxes only allow ss.
listener_pid() {
  local pid=""
  if command -v lsof >/dev/null 2>&1; then
    pid="$(lsof -ti "tcp:${port}" -sTCP:LISTEN 2>/dev/null | head -1 || true)"
  fi
  if [ -z "${pid}" ] && command -v ss >/dev/null 2>&1; then
    pid="$(ss -ltnp 2>/dev/null | grep ":${port} " | grep -oE 'pid=[0-9]+' | head -1 | cut -d= -f2 || true)"
  fi
  echo "${pid}"
}

stop_server() {
  local pid
  pid="$(listener_pid)"
  [ -n "${pid}" ] || return 0
  kill "${pid}" 2>/dev/null || true
  # Next shuts down gracefully; give it a few seconds, then insist.
  for _ in $(seq 1 10); do
    [ -z "$(listener_pid)" ] && return 0
    sleep 0.5
  done
  kill -9 "${pid}" 2>/dev/null || true
  sleep 0.5
}

case "${cmd}" in
  start)
    [ -f "${root}/.env.verify" ] || { echo "Missing .env.verify. Run: npm run verify:env" >&2; exit 1; }
    [ -z "$(listener_pid)" ] || { echo "Port ${port} is already in use. Pick another port or run: scripts/verify-build.sh stop ${port}" >&2; exit 1; }
    rm -rf "${dir}"
    mkdir -p "${dir}"
    git -C "${root}" archive HEAD | tar -x -C "${dir}"
    [ -f "${dir}/package.json" ] || { echo "Could not extract HEAD into ${dir}" >&2; exit 1; }
    ln -s "${root}/node_modules" "${dir}/node_modules"
    cp "${root}/.env.verify" "${dir}/.env.local"
    cd "${dir}"
    echo "Generating the Prisma client and building (about a minute)..."
    npx prisma generate >/dev/null
    NEXT_TELEMETRY_DISABLED=1 npx next build >build.log 2>&1 || { tail -40 build.log >&2; exit 1; }
    nohup npx next start -p "${port}" >start.log 2>&1 &
    for _ in $(seq 1 60); do curl -s -o /dev/null "http://localhost:${port}/admin/login" && break; sleep 1; done
    curl -s -o /dev/null "http://localhost:${port}/admin/login" || { tail -20 start.log >&2; exit 1; }
    echo "serving http://localhost:${port} from ${dir}"
    ;;
  stop)
    stop_server
    case "${dir}" in "${HOME}"/.cache/sw-verify-*) rm -rf "${dir}" ;; esac
    echo "stopped port ${port} and removed ${dir}"
    ;;
  *)
    echo "usage: scripts/verify-build.sh <start|stop> [port]" >&2
    exit 2
    ;;
esac
```

Create `scripts/browser/common.mjs`:

```javascript
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
```

Create `scripts/browser/admin-auth.mjs`:

```javascript
import { BASE, PASSWORD, SHOTS, finish, launch, resetLoginAttempts } from './common.mjs';

await resetLoginAttempts();
const browser = await launch();
const results = {};

const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
const errors = [];
const analytics = [];
page.on('request', (r) => { if (r.url().includes('google-analytics.com') || r.url().includes('googletagmanager.com')) analytics.push(r.url()); });
page.on('pageerror', (e) => errors.push(e.message));

// 1. Visiting /admin signed out lands on login with ?next preserved.
await page.goto(`${BASE}/admin/library?kind=VIDEO`);
results.redirectedToLogin = page.url().includes('/admin/login?next=%2Fadmin%2Flibrary%3Fkind%3DVIDEO');
results.noSiteChromeOnLogin = (await page.locator('header').count()) === 0 && (await page.locator('footer').count()) === 0;
await page.screenshot({ path: `${SHOTS}/admin-login.png` });

// 2. Wrong password shows an error and stays on the login page.
await page.getByLabel('Password').fill('not the password');
await page.getByRole('button', { name: /sign in/i }).click();
await page.locator('form [role="alert"]').waitFor();
results.wrongPasswordMessage = (await page.locator('form [role="alert"]').textContent()) === 'Incorrect password.';

// 3. Correct password signs in, honours ?next (which is a 404 for now, so check the cookie instead) and sets an HttpOnly cookie.
await page.getByLabel('Password').fill(PASSWORD);
await page.getByRole('button', { name: /sign in/i }).click();
await page.waitForURL((u) => !u.pathname.endsWith('/login'), { waitUntil: 'commit' });
const cookies = await page.context().cookies();
const session = cookies.find((c) => c.name === 'sw_admin');
results.sessionCookie = !!session && session.httpOnly && session.sameSite === 'Lax';

// 4. Dashboard renders inside the admin shell with the site's styling.
await page.goto(`${BASE}/admin`);
results.dashboardVisible = await page.getByRole('heading', { name: 'Admin', exact: true }).isVisible();
results.statsShown = (await page.getByText('Photos', { exact: true }).count()) === 1;
results.navHasDashboard = await page.getByRole('navigation', { name: 'Admin' }).getByRole('link', { name: 'Dashboard' }).isVisible();
results.dashboardCurrent = (await page.getByRole('navigation', { name: 'Admin' }).getByRole('link', { name: 'Dashboard' }).getAttribute('aria-current')) === 'page';
await page.screenshot({ path: `${SHOTS}/admin-dashboard-light.png` });

// Theme tokens come from the site: body background matches --bg in each theme.
const bgLight = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
await page.getByRole('button', { name: 'Toggle dark mode' }).click();
await page.waitForTimeout(300);
const bgDark = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
results.lightBgIsCream = bgLight === 'rgb(248, 243, 236)';
results.darkBgIsEspresso = bgDark === 'rgb(23, 19, 15)';
await page.screenshot({ path: `${SHOTS}/admin-dashboard-dark.png` });
await page.getByRole('button', { name: 'Toggle dark mode' }).click();

// 5. The API accepts the session cookie.
const apiStatus = await page.evaluate(async () => (await fetch('/api/admin/session')).status);
results.apiAcceptsSession = apiStatus === 200;

// 6. Mobile layout: section nav row appears, no horizontal scroll.
await page.setViewportSize({ width: 375, height: 812 });
await page.waitForTimeout(200);
results.noHorizontalScrollMobile = (await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)) === 0;
await page.screenshot({ path: `${SHOTS}/admin-dashboard-mobile.png` });
await page.setViewportSize({ width: 1280, height: 800 });

// 7. Log out returns to login and the API rejects again.
await page.getByRole('button', { name: 'Log out' }).click();
await page.waitForURL('**/admin/login');
results.loggedOut = (await page.evaluate(async () => (await fetch('/api/admin/session')).status)) === 401;

// 8. Five wrong attempts lock the form; the lock message names a wait time.
for (let i = 0; i < 5; i++) {
  await page.getByLabel('Password').fill(`wrong-${i}`);
  await page.getByRole('button', { name: /sign in/i }).click();
  await page.waitForTimeout(500);
}
await page.getByLabel('Password').fill(PASSWORD);
await page.getByRole('button', { name: /sign in/i }).click();
await page.getByText(/Too many attempts/).waitFor();
results.lockedAfterFiveFailures = /Try again in \d+ minutes?\./.test(await page.locator('form [role="alert"]').textContent());

results.noPageErrors = errors.length === 0;
results.noAnalyticsOnAdmin = analytics.length === 0;
await browser.close();
finish(results, errors);
```

Create `scripts/browser/admin-kit.mjs`:

```javascript
import { BASE, SHOTS, finish, launch, resetLoginAttempts, signIn } from './common.mjs';

await resetLoginAttempts();
const browser = await launch();
const results = {};

const page = await browser.newPage({ viewport: { width: 1100, height: 1500 } });
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));

await signIn(page);
await page.goto(`${BASE}/admin/kit`);
await page.screenshot({ path: `${SHOTS}/kit-light.png`, fullPage: true });

// Switch: toggles by click and by keyboard, and reports state to assistive tech.
const sw = page.getByRole('switch');
results.switchStartsOff = (await sw.getAttribute('aria-checked')) === 'false';
await sw.click();
results.switchOnByClick = (await sw.getAttribute('aria-checked')) === 'true';
await sw.focus();
await page.keyboard.press('Space');
results.switchOffByKeyboard = (await sw.getAttribute('aria-checked')) === 'false';

// Select and textarea accept input.
await page.getByLabel('Status', { exact: true }).selectOption('PUBLISHED');
results.selectChanged = (await page.getByLabel('Status', { exact: true }).inputValue()) === 'PUBLISHED';
await page.getByLabel('Notes').fill('hello');
results.textareaFilled = (await page.getByLabel('Notes').inputValue()) === 'hello';

// Field error is announced.
results.fieldErrorRole = (await page.getByText('Place is required.').getAttribute('role')) === 'alert';

// Dialog: opens, traps focus inside, Esc closes.
await page.getByRole('button', { name: 'Open dialog' }).click();
const dialog = page.getByRole('dialog');
results.dialogOpens = await dialog.isVisible();
results.dialogLabelled = (await dialog.getAttribute('aria-labelledby')) === 'dialog-title';
await page.keyboard.press('Escape');
await page.waitForTimeout(150);
results.dialogClosesOnEsc = !(await dialog.isVisible());

// Confirm: Cancel does nothing, Delete fires a toast and closes.
await page.getByRole('button', { name: 'Open confirm' }).click();
await page.getByRole('button', { name: 'Cancel' }).click();
await page.waitForTimeout(150);
results.confirmCancelCloses = !(await page.getByRole('dialog').isVisible());
await page.getByRole('button', { name: 'Open confirm' }).click();
await page.getByRole('button', { name: 'Delete', exact: true }).click();
await page.waitForTimeout(150);
results.confirmDeleteToasts = await page.getByRole('status').filter({ hasText: 'Deleted' }).isVisible();

// Backdrop click closes a dialog.
await page.getByRole('button', { name: 'Open dialog' }).click();
await page.mouse.click(10, 10);
await page.waitForTimeout(150);
results.backdropCloses = !(await page.getByRole('dialog').isVisible());

// Toasts: error is an alert, can be dismissed, and is capped at three.
await page.getByRole('button', { name: 'Error toast' }).click();
const errorToast = page.getByRole('alert').filter({ hasText: 'Upload failed' });
results.errorToastShown = await errorToast.isVisible();
await errorToast.getByRole('button', { name: 'Dismiss notification' }).click();
results.toastDismissed = (await errorToast.count()) === 0;
for (let i = 0; i < 5; i++) await page.getByRole('button', { name: 'Info toast' }).click();
results.toastsCapped = (await page.getByRole('region', { name: 'Notifications' }).getByRole('status').count()) <= 3;
await page.screenshot({ path: `${SHOTS}/kit-toasts.png` });

// Dark theme renders the same components with the dark tokens.
await page.getByRole('button', { name: 'Toggle dark mode' }).click();
await page.waitForTimeout(300);
await page.screenshot({ path: `${SHOTS}/kit-dark.png`, fullPage: true });

results.noPageErrors = errors.length === 0;
await browser.close();
finish(results, errors);
```

```bash
chmod +x scripts/verify-build.sh
npm pkg set \
  'scripts.verify:env=tsx scripts/verify-env.ts' \
  'scripts.verify:start=scripts/verify-build.sh start' \
  'scripts.verify:stop=scripts/verify-build.sh stop' \
  'scripts.verify:admin=node --env-file=.env.verify scripts/browser/admin-auth.mjs && node --env-file=.env.verify scripts/browser/admin-kit.mjs'
```

The browser scripts need Google Chrome installed (`channel: 'chrome'`).

- [ ] **Step 9: Run the unit tests, typecheck and lint**

```bash
npx tsx --test tests/unit/admin-nav.test.ts tests/unit/next-config.test.ts
npx tsc --noEmit 2>&1 | grep -E "error TS" | grep -vE "chatbot|invoice|Signature"
npx eslint src/lib/admin src/middleware.ts src/app/admin src/app/api/admin src/components/admin src/components/AnalyticsGate.tsx src/components/ui scripts tests
```

Expected: `# pass 5`, `# fail 0` (2 nav, 3 config); then no output from either of the other two commands.

- [ ] **Step 10: Commit, so the harness has something to build**

```bash
git add src/lib/admin/nav.ts src/app/admin src/components/admin src/components/AnalyticsGate.tsx src/app/ClientLayoutWrapper.tsx src/app/layout.tsx next.config.ts next-sitemap.config.js scripts/verify-env.ts scripts/verify-build.sh scripts/browser package.json package-lock.json tests/unit/admin-nav.test.ts tests/unit/next-config.test.ts
git commit -m "feat(admin): login page, shell, dashboard, UI kit page and verification harness"
```

- [ ] **Step 11: Build the committed code and check it in a real browser**

```bash
npm run db:test
npm run verify:env
npm run verify:start
npm run verify:admin
```

Expected: `verify:env` prints `wrote .env.verify (admin password for verification: verify-password-123)`. `verify:start` prints `serving http://localhost:3104 from <your home>/.cache/sw-verify-3104` after about a minute. `verify:admin` prints two JSON objects in which **every value is `true`** (16 checks in each: redirect to login, no site chrome on login, wrong-password message, HttpOnly SameSite=Lax cookie, dashboard and nav, cream light theme and espresso dark theme, API accepts the session, no horizontal scroll on a phone, logout, lockout after 5 failures, no analytics requests, and for the kit page: the switch, select, textarea, field error, dialog, confirm, toasts and backdrop behaviour), and exits 0.

Look at the screenshots it saved in `${TMPDIR:-/tmp}/sw-verify-shots` (`admin-login.png`, `admin-dashboard-light.png`, `admin-dashboard-dark.png`, `admin-dashboard-mobile.png`, `kit-light.png`, `kit-dark.png`) and confirm the admin looks like the public site: cream or espresso background, Lora headings, Lato body, the signature mark in the header, the black primary button.

While the server is still running, check what a signed-out visitor and a crawler see:

```bash
curl -s -o /dev/null -D - http://localhost:3104/admin | grep -iE "^HTTP|^location|x-robots|cache-control"
curl -s -D - http://localhost:3104/api/admin/session | grep -iE "^HTTP|x-robots|^\{"
for p in / /photos /writing; do printf "%s %s\n" "$p" "$(curl -s -o /dev/null -w '%{http_code}' http://localhost:3104$p)"; done
(cd ~/.cache/sw-verify-3104 && npx next-sitemap > /dev/null && cat public/robots.txt)
```

Expected: `HTTP/1.1 307 Temporary Redirect`, `cache-control: private, no-store`, `location: http://localhost:3104/admin/login?next=%2Fadmin` (the middleware builds the redirect with `new URL(..., request.url)`, so the `location` is always an absolute URL on the host you requested), `x-robots-tag: noindex, nofollow`; then `HTTP/1.1 401 Unauthorized`, the same `x-robots-tag`, and `{"error":"Unauthorized"}`; then `/ 200`, `/photos 200`, `/writing 200`; and `robots.txt` containing `Disallow: /admin` and `Disallow: /api/admin`. (The verification build runs `next build` directly, which skips the `postbuild` hook that generates `robots.txt`, so the last command above generates it inside the throwaway copy first.)

```bash
npm run verify:stop
```

Expected: `stopped port 3104 and removed <your home>/.cache/sw-verify-3104`. If a check failed, fix the code, commit, and repeat this step (`verify:start` always builds the latest commit).

---

### Task 7: Setup guide, environment template and final verification

**Files:**
- Create: `docs/admin-setup.md`, `.env.example`

**Interfaces:**
- Consumes: all earlier tasks.
- Produces: the owner-facing checklist for connecting the real database and Blob stores.

- [ ] **Step 1: Write the setup guide and the environment template**

Create `docs/admin-setup.md`:

````markdown
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
drops anything.

## 6. Tests that touch the database

```bash
npm run test:db     # starts a throwaway Postgres on port 54329 and runs tests/db
```

These tests refuse to run against anything but that throwaway database.

## Troubleshooting

| Symptom | Cause |
|---|---|
| `DATABASE_URL is a prisma+postgres:// URL` | Use the direct `postgres://` string from the Prisma Postgres console. |
| `Admin login is not configured on this server.` | `SESSION_SECRET` (32+ characters) or `ADMIN_PASSWORD_HASH` is missing in this environment. |
| `Too many attempts` at login | 5 wrong passwords in 15 minutes; wait, or clear the `LoginAttempt` table. |
| `BLOB_PUBLIC_TOKEN is not set` | Add the token to `.env.local` (local) or Vercel (deployed). |
````

Create `.env.example`:

```bash
# Copy to .env.local for local development. Never commit real values.

# Postgres. A standard postgres:// URL (for Prisma Postgres, use the "direct TCP"
# connection string, not the prisma+postgres:// one). Local: `npm run db:dev` prints it.
DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:54330/swdev

# Two Vercel Blob stores: one Public (web copies, videos, article images) and one
# Private (untouched originals). Paste each store's read-write token.
BLOB_PUBLIC_TOKEN=
BLOB_PRIVATE_TOKEN=

# Admin login. Generate both with `npm run admin:hash`.
ADMIN_PASSWORD_HASH=
SESSION_SECRET=

# Used by the site's existing features.
OPENAI_API_KEY=
STRIPE_SECRET_KEY=
```

- [ ] **Step 2: Run everything**

```bash
npm test
npm run test:db
npx tsc --noEmit 2>&1 | grep -E "error TS" | grep -vE "chatbot|invoice|Signature"
npx eslint src/lib/admin src/middleware.ts src/app/admin src/app/api/admin src/components/admin src/components/AnalyticsGate.tsx src/components/ui scripts tests
```

Expected: both test commands end with `# fail 0` (`npm test` also runs the older photo tests, which must still pass); the other two print nothing.

- [ ] **Step 3: Commit the docs, then run the browser checks once more on the final commit**

```bash
git add docs/admin-setup.md .env.example
git commit -m "docs(admin): setup guide and environment template"
npm run verify:start
npm run verify:admin
npm run verify:stop
```

Expected: every value in both JSON outputs is `true`, and the server stops cleanly.

- [ ] **Step 4: Connect the real services (needs the owner's credentials)**

Follow `docs/admin-setup.md` sections 1-4, then run, with the real values in `.env.local`:

```bash
npm run db:check
npm run blob:check
```

Expected: `db:check` prints the host and the migration list (after `npm run db:deploy` has been run against that database); `blob:check` prints three `PASS` lines. **If the private-store line fails with an access error, stop here and tell the owner: their Vercel plan may not include private Blob storage, and the originals design needs a different private location.**

- [ ] **Step 5: Deployment checklist (owner)**

1. Add `DATABASE_URL`, `BLOB_PUBLIC_TOKEN`, `BLOB_PRIVATE_TOKEN`, `ADMIN_PASSWORD_HASH`, `SESSION_SECRET` (plus the existing `OPENAI_API_KEY` and `STRIPE_SECRET_KEY`) to Vercel for Production and Preview, using a different database for Preview.
2. With the production `DATABASE_URL` in the shell, run `npm run db:deploy` once. It only applies the two committed migrations.
3. Deploy, open `/admin`, sign in, and confirm the dashboard shows zeros.

No step in this plan changes any public page, so the public site is unaffected by deploying it.
