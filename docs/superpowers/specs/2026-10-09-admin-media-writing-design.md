# Admin dashboard, media library and writing — design

Date: 2026-10-09
Status: approved in chat, pending spec review

## Goal

Move photo/video files out of the git repo into Vercel Blob, move site content
that is currently JSON in the repo into a Prisma Postgres database, and add an
admin dashboard to manage all of it. This round covers the media library
(photos, videos, nested collections with free-form pages) and the writing
section (articles and publications). Projects, meetings, nav links and the
chatbot prompt are out of scope and stay in the repo.

## Decisions (from the planning conversation)

- **Architecture:** a custom admin inside this Next.js app at `/admin` (not a
  CMS, not browser-side image processing).
- **Storage:** Vercel Blob for files; Prisma Postgres (`DATABASE_URL`) for all
  metadata, collections and articles. Photo originals are kept privately.
- **Admin use:** quick-post from a phone, bulk import from a desktop, and
  curating existing items. All three are first-class.
- **Login:** a single admin password (no users table, no OAuth).
- **Metadata:** capture date and camera as today, plus a public **place name**
  derived from GPS. Exact coordinates are never published and never stored in
  the database.
- **Videos:** short clips only, **stored and served exactly as uploaded**
  (no conversion).
- **Drafts:** photos, videos, collections and articles all start as drafts.
- **Collections:** nested (like Paul Stamatiou's trips), and a collection page
  is a free-form stack of blocks: rich-text blocks and photo/video grid blocks.
- **Writing editor:** Lexical (the user already uses it in `serelora/repo`),
  with bold/italic, headings, links, lists, quotes, drag-in images that upload
  to Blob, and inline/block KaTeX equations.
- **UI:** the admin looks exactly like the rest of the site: same tokens
  (cream/espresso, gold accent, Lato/Lora, light and dark) and the shared UI
  kit in `src/components/ui`. No separate admin theme or component library.
  Missing primitives (dialog, toast, dropzone with progress, switch, sortable
  handle, table/list helpers) are added to the shared kit in the same style.
- **Scope of this spec:** media library + writing, delivered in phases below.

## Data model (Prisma)

```prisma
enum MediaKind       { PHOTO VIDEO }
enum Status          { DRAFT PUBLISHED }
enum ProcessingState { PENDING READY FAILED }
enum BlockType       { TEXT GRID }
enum ArticleKind     { ARTICLE PUBLICATION }

model Media {
  id              String          @id @default(cuid())
  kind            MediaKind
  status          Status          @default(DRAFT)
  processing      ProcessingState @default(PENDING)
  processingError String?
  caption         String          @default("")
  altText         String          @default("")
  placeName       String?                    // public, e.g. "Torrey Pines, San Diego"
  takenAt         DateTime?                  // local wall-clock stored as if UTC (no timezone)
  camera          String?
  width           Int?
  height          Int?
  durationSec     Float?                     // videos
  bytes           Int?
  mimeType        String
  contentHash     String          @unique    // sha-256 of the uploaded original; dedupe
  originalPath    String?                    // PRIVATE store pathname (photos only)
  webUrl          String?                    // PUBLIC Blob URL: photo web copy, or the video file
  posterUrl       String?                    // videos
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
  parent      Collection?  @relation("Tree", fields: [parentId], references: [id], onDelete: Restrict)
  children    Collection[] @relation("Tree")
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
  @@unique([parentId, slug])   // plus a raw-SQL partial unique index on slug WHERE parentId IS NULL
                               // (Postgres treats NULLs as distinct, so the line above alone
                               // would allow two root collections with the same slug)
}

model CollectionSlugHistory {
  id           String     @id @default(cuid())
  collectionId String
  collection   Collection @relation(fields: [collectionId], references: [id], onDelete: Cascade)
  path         String     @unique   // full URL path the collection used to have
}

model CollectionBlock {
  id           String     @id @default(cuid())
  collectionId String
  collection   Collection @relation(fields: [collectionId], references: [id], onDelete: Cascade)
  position     Int
  type         BlockType
  bodyJson     Json?                    // TEXT: Lexical state
  bodyHtml     String?                  // TEXT: sanitized HTML rendered on save
  items        CollectionBlockMedia[]   // GRID
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
  slug        String?     @unique         // ARTICLE: today's id, so /writing/<slug> URLs do not change
  externalUrl String?                     // PUBLICATION: https://doi.org/<doi>; publications have no page
  title       String
  topic       String
  author      String
  publishedOn DateTime    @db.Date
  keywords    String[]
  status      Status      @default(DRAFT)
  bodyJson    Json                        // Lexical state (what the editor loads)
  bodyHtml    String                      // HTML generated from bodyJson on save (what the site serves)
  legacyHtml  String?                     // original HTML from the repo, kept as backup
  publishedAt DateTime?
  createdAt   DateTime    @default(now())
  updatedAt   DateTime    @updatedAt
  @@index([kind, status, publishedOn])
}

model Asset {                             // images dragged into articles; not part of All Photos
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

Rules that follow from the model:
- A collection's photo/video count, date range and cover fallback are derived
  from its grid blocks (parents roll up their children). Nothing is stored twice.
- All Photos is every **published** Media row, newest first by `takenAt`
  (undated last).
- A collection is public only if it **and every ancestor** are published. A
  Media item appears in a public grid or in All Photos only if it is published;
  a draft inside a published grid is hidden publicly and flagged in the admin.
- Deleting Media needs a confirmation that names any published grids it appears
  in. On confirm, one transaction removes its grid items and then the row, and
  the Blob files are deleted afterwards. (`onDelete: Restrict` on grid items
  guards against any code path that tries to delete a Media row without doing
  this.)
- A database CHECK constraint requires a `slug` for every `ARTICLE` (publications
  may omit it). Publications are the repo's two journal abstracts: their ids are
  DOIs (`10.1021/...`, containing `/`), their body is plain text, and the site
  links them out to doi.org instead of rendering a page, so they get a normal
  `cuid` id, `externalUrl`, and no slug.
- Collection depth is unbounded in the schema; the admin and URLs support up to
  3 levels.
- Ordering (`position`) is an integer rewritten for the affected siblings in
  one transaction on reorder.

## Upload and processing pipeline

**Photos**
1. The browser hashes the file (sha-256) and skips duplicates (`contentHash`).
2. It requests an upload token from an authenticated admin route and uploads
   **directly to the private Blob store** (`originals/<id>.<ext>`), with a
   progress bar. Bulk uploads run 3 at a time.
3. When the upload finishes the browser calls one admin endpoint per photo
   (`POST /api/admin/media/[id]/process`), not a webhook, so it works in local
   development. The server: reads the original from the private store; reads
   date, camera and GPS with `exifr`; converts GPS to a place name; creates the
   web copy with `sharp` (auto-orient, fit within 2400px, JPEG q82, **all
   metadata stripped**, the same settings as `scripts/process-photos.ts` today);
   uploads it to the public store (`photos/<id>.jpg`); and writes/updates the
   Media row as a draft. The endpoint is idempotent.
4. New items land in the **Inbox** as drafts. A "publish immediately" switch on
   the upload screen skips the inbox.
5. A failed item stays in the Inbox as `FAILED` with the error and a Retry
   button; the original is never lost. Originals with no Media row after 24h
   are cleaned up.

**Videos**
- Uploaded directly to the **public** store as uploaded; no server processing.
- The browser reads duration/width/height, captures a poster frame (a JPEG,
  uploaded to the public store), and defaults `takenAt` to the file's modified
  date (editable). Limit: 300MB per clip.
- **Accepted risk:** iPhone videos carry a GPS location tag inside the file.
  Because videos are served as uploaded, that tag is public. The upload screen
  shows a notice saying so. (Stripping it without re-encoding was offered and
  declined; it can be added later without a schema change.)

**Accepted file types:** photos JPEG/PNG/WebP (HEIC works from iOS Safari, which
converts on upload; desktop HEIC is rejected with an "export as JPEG" message);
videos MP4/MOV/WebM.

**Place names:** the geocoder sits behind a small interface. The default
implementation is OpenStreetMap Nominatim (free, storing results is allowed with
attribution), called server-side with a descriptive User-Agent, at most one
request per second, sequentially during bulk imports. Photos with no GPS get a
place you type in. Only the place name is stored; coordinates stay in the
private original. OpenStreetMap's terms require visible attribution, so photo
pages carry a small "Place names © OpenStreetMap contributors" line.

## Admin

All screens live under `/admin`, in the site's styling, with a header of
Upload, Inbox, Library, Collections, Articles, "View site", the theme toggle and
Log out. Fully usable at phone width.

1. **Login** — one password field, generic error, rate limited.
2. **Upload** — default screen on a phone. Picker/drop area; per-file thumbnail,
   progress, caption and place; optional "Add to collection"; "Save as drafts"
   or "Publish now". Warns that uploads continue only while the page is open.
3. **Inbox** — drafts and failed items. Multi-select with bulk actions: add to
   collection, set place/date, publish, delete. A detail panel edits caption,
   alt text, place and date (camera is read-only).
4. **Library** — all media with filters (status, kind, collection, date, missing
   place, missing caption) and search, plus the same bulk actions.
5. **Collections** — a tree with drag to reorder/move; shows status and counts.
6. **Collection editor** — title, subtitle, slug, cover, status, and the block
   stack. TEXT blocks use the Lexical editor; GRID blocks pick media from the
   library and reorder by drag. Blocks can be reordered, deleted and previewed
   in the public layout. "Add sub-collection" creates a child.
7. **Articles** — list (drafts first; filter article/publication and topic) and
   an editor: title, topic, date, author, keywords, status and the Lexical
   editor with image upload and KaTeX nodes, autosaving drafts with a visible
   "Saved" state.

Drag and drop works with keyboard, mouse and touch.

## Public site

- Pages are server components reading Prisma through one data layer in
  `src/lib/content/` that replaces `src/lib/photos.ts` and the JSON imports.
  Queries select only published rows and only public fields (never
  `originalPath`).
- Results are cached with tags; publishing, editing or reordering in the admin
  calls `revalidateTag`/`revalidatePath` for the affected tags, so changes are
  live in seconds without a redeploy. New slugs render on first request and are
  then cached. If the database is unreachable at runtime, cached pages keep
  serving; if it is unreachable during a build, the build fails.
- `DATABASE_URL` is per environment; preview deployments use a separate
  database.
- **URLs:** `/photos` (All Photos row + top-level collection cards),
  `/photos/all`, `/photos/<slug>[/<child-slug>...]` (catch-all route),
  `/writing`, `/writing/<id>`. All current URLs keep working. Top-level slugs
  `all` and any route name are reserved. Renaming a slug records the old path in
  `CollectionSlugHistory` and redirects to the new one.
- **Collection page:** hero cover with title and subtitle; a stats line (date
  range, photo and video counts, rolled up from sub-collections); the blocks in
  order (text through the site's prose styles, grids through the existing
  justified grid and lightbox); sub-collection cards; previous/next siblings.
- **Videos:** grids show the poster with a play badge; the lightbox plays the
  clip inline (`playsInline`, `preload="metadata"`).
- **Images:** photos go through `next/image` from the public Blob host
  (`remotePatterns`). This uses Vercel's image optimization quota, counted per
  distinct source image.
- **Articles:** the page renders `bodyHtml`, which a pure function
  (`lexicalToHtml`, no DOM) generates from the Lexical JSON on every save.
  Equations are rendered with KaTeX to HTML at that moment, so math needs no
  client JavaScript (the current page runs KaTeX auto-render in the browser);
  the KaTeX stylesheet loads only on article pages. `/writing` list and article pages keep
  their current components, fed by DB rows adapted to today's shape (date
  formatted for display).
- **SEO:** `next-sitemap` is replaced by `app/sitemap.ts` and `app/robots.ts`
  reading the database, keeping the current exclude rules (`/invoice`,
  `/meetings`, `/meetings/*`, `/sf`, `/legal/*`, `/gallery`) and adding
  `/admin`. Titles, descriptions and share images come from the database (the
  share image is the cover's web copy, absolute URL). `/admin` is `noindex`.
- **Future, not now:** "load more" paging on All Photos once the library passes
  a few hundred items.

## Migration

One-time, re-runnable scripts with a dry-run mode and a verification report
(row counts and checksums). The JSON files remain for one release as a rollback
and are deleted only after the user confirms.

- **Photos:** originals are recoverable from git history (the commit before
  `public/gallery` was removed). The script reads each original from history,
  stores it in the private store, reads GPS for the place name, uploads the web
  copy, and creates Media rows with the existing captions, dates and cameras.
  The 6 current collections become published top-level collections, each with
  its blurb as a TEXT block (if any), a GRID block of its photos in today's
  order, and its cover set. Then `public/images/photos/` is removed from the
  repo.
- **Articles and publications:** the 31 articles and 2 publications are
  imported (articles keep their ids as slugs; publications get `externalUrl`
  `https://doi.org/<their DOI>`), `keywords` as arrays, and "February 13, 2026"
  strings become dates. A purpose-built converter (`htmlToLexical`, jsdom, run
  only by the migration script) turns the legacy HTML into Lexical JSON, and
  `bodyHtml` is generated from it. The converter handles what the 33 items
  actually contain: multi-paragraph blockquotes, three nested lists, bare text
  outside any block (a poem and display math), `<p style="margin-left…">` quoted
  passages (converted to quotes), malformed link attributes, and TeX math. Math
  is stored as TeX delimiters in the HTML (`$$…$$` in one article, `\[…\]` in
  another, 26 equations in total), which become equation nodes. A prototype of
  this converter was run against all 33 items during planning: the text content
  is identical after the round trip, every state loads into Lexical unchanged,
  and every equation renders in KaTeX. The migration script re-runs these same
  checks and reports any difference. `legacyHtml` keeps the original.
- The 4 PDFs in `public/articles` stay where they are.

## Security

- **Password:** only a hash (scrypt via `node:crypto`) in `ADMIN_PASSWORD_HASH`;
  constant-time compare.
- **Session:** a signed cookie (HMAC with `SESSION_SECRET`), HttpOnly, Secure,
  SameSite=Lax, 14-day expiry. Rotating `SESSION_SECRET` logs out everywhere.
- **Login attempts:** rate limited per hashed IP using `LoginAttempt` (5
  failures per 15 minutes, then lockout), because serverless memory does not
  persist.
- **Authorization:** middleware protects `/admin/*` and `/api/admin/*`, and
  **every route handler and server action also verifies the session itself**
  (middleware alone has been bypassed in past Next.js vulnerabilities).
  State-changing JSON endpoints also check the `Origin` header.
- **Blob:** two stores. A public store holds web copies, videos, posters and
  article images; a private store holds originals, which are never reachable by
  URL and are only streamed through an admin-only route. Upload tokens are
  issued only to an authenticated admin, with allowed types and maximum sizes.
- **Content safety:** article and text-block HTML is never stored or accepted
  from the browser. It is generated on the server from the Lexical JSON by a
  serializer that emits a closed set of elements, escapes all text and
  attributes, and only keeps links using `http`, `https`, `mailto`, `#` or a
  site-relative path. Images must come from the public Blob host. This replaces
  a separate HTML sanitizer.
- **Secrets:** `DATABASE_URL`, `BLOB_PUBLIC_TOKEN`, `BLOB_PRIVATE_TOKEN`,
  `ADMIN_PASSWORD_HASH` and `SESSION_SECRET` (plus `CRON_SECRET` for the
  cleanup job) live in Vercel and a gitignored `.env.local`; nothing is
  committed.

## Dependencies

Verified against the real packages during planning:
- `prisma` and `@prisma/client` **7.10.0** with `@prisma/adapter-pg` and `pg`
  (Prisma 7 requires a driver adapter and a `prisma.config.ts`). Generator
  `prisma-client` with `importFileExtension = ""`. `DATABASE_URL` must be a
  standard `postgres://` connection string (the direct TCP URL of Prisma
  Postgres), not a `prisma+postgres://` URL.
- `@vercel/blob` **2.8.1**, which supports `access: 'private'` and
  browser-direct uploads authorised by a server route.
- `lexical` and `@lexical/{react,rich-text,list,link,headless,utils}` pinned to
  **0.41.0** (the version `serelora/repo` uses), `@dnd-kit/core` and
  `@dnd-kit/sortable`, `jsdom` (dev only, for the migration converter).
- Moved from devDependencies to dependencies because they now run in
  production: `sharp`, `exifr`. Already present: `katex`, `tsx`.
- Not needed: `sanitize-html`.

## Phases

Each phase is deployable on its own and has its own implementation plan
(`docs/superpowers/plans/2026-10-09-admin-<n>-<name>.md`).

1. **Foundation:** Prisma schema and migrations, DB client, both Blob stores,
   admin login/session/middleware, admin shell, and the UI-kit additions.
2. **Media admin:** upload pipeline, Inbox, Library, geocoder.
3. **Rich-text editor and writing:** the Lexical editor (image and KaTeX
   nodes), the JSON-to-HTML serializer, the article admin, the public Writing
   pages from the DB, and migration of the 31 articles and 2 publications.
4. **Collections and public media:** collection tree and block editor, public
   pages reading the DB, redirects, sitemap/robots, migration of the 51 photos
   and 6 collections, and removal of the repo copies after confirmation.

The editor comes before collections because a collection's text blocks use the
same editor. Until phase 4 ships, the public photo pages keep reading the repo's
JSON, so nothing regresses.

## Testing

- **Unit tests** (`tsx --test`): slug/path helpers, publishing visibility
  (ancestors, drafts), stat rollups, sanitizer allow-list, password/session
  signing, login rate limiting, place-name formatting, and the HTML → Lexical →
  HTML text round trip over all 31 articles.
- **Integration tests:** Prisma against a throwaway Postgres container started
  by `scripts/test-db.sh` on its own port (never the real database); the photo
  pipeline with fixture JPEGs (GPS, rotated, no EXIF) asserting the web copy has
  no GPS/EXIF bytes; a test that every `/api/admin` route returns 401 without a
  session and that no public query returns `originalPath` or a draft.
- **Browser checks:** the admin flows at phone (375px) and desktop widths, the
  lightbox with video, and a visual comparison that the admin matches the site's
  theme in light and dark.

## Planning findings and remaining checks

Resolved during planning:
1. **Private Blob:** `@vercel/blob` 2.8.1 supports `access: 'private'` for
   `put`, `get` and client uploads. Account/plan availability is still checked by
   a script in the Foundation plan (it tries a private write, read and delete).
2. **Prisma Postgres:** Prisma 7 needs the `pg` driver adapter and a direct
   `postgres://` URL; the Foundation plan includes a connection check that
   explains the fix if the URL is `prisma+postgres://`.
3. **Lexical import fidelity:** a prototype converter was run on all 33
   legacy items: zero text differences, zero load failures, 26 equations all
   rendered by KaTeX (see Migration).
4. **Nominatim policy:** confirmed (max 1 request/second, identifying
   User-Agent, results cached, attribution displayed). User-triggered lookups at
   this volume are within the policy.

Still to verify while building:
5. Vercel function memory/time when processing the largest originals (about
   12MB here, up to 25MB): the process route sets `maxDuration` and the
   Media-admin plan includes a test with a large image.
6. That the generated Prisma client bundles correctly under `next build` (the
   Foundation plan builds in a throwaway copy to confirm).

## Out of scope

Projects, meetings, nav links and the chatbot prompt (a later migration);
video transcoding, location stripping and videos longer than short clips; more
than one admin user; image cropping/editing; maps; EXIF details beyond date and
camera; AI captions and tags; suggested collections; All Photos paging; the
four PDFs in `public/articles`.
