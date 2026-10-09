# Photos section — design

Date: 2026-10-09
Status: approved in chat, pending spec review

## Goal

Replace the single-slideshow `/gallery` page with a `/photos` section modeled on
paulstamatiou.com/photos: a Photostream of individual photos plus curated
Photosets. Scope is organizing the 51 existing photos; no Collections, no CMS.
Visual language follows the site's existing cream/espresso theme with the gold
accent (see `src/components/ui`), not Paul's styling.

## Navigation

- `src/data/navigationData.json`: `MY WORK` → `WORK`; add `PHOTOS` (`/photos`)
  between `WRITING` and `CONTACT`. Navigation and Footer both read this file.
- `next.config.ts`: permanent redirect `/gallery` → `/photos`.

## Routes

### `/photos` (index, server component)
1. Page header (existing `PageHeader`).
2. **Photostream** row: newest 12 photos, fixed row height (~9rem mobile /
   ~12rem desktop), natural widths, horizontal scroll-snap, ←/→ buttons that
   scroll by roughly one viewport and disable at the ends, and a "View all" link
   to `/photos/stream`. Clicking a photo opens the lightbox over the stream.
3. **Photosets** heading and a list of cover cards: full-width image cover,
   bottom gradient, title + subtitle overlaid in white, links to `/photos/[set]`.

### `/photos/stream`
All photos, newest first, grouped under month/year headings, each group a
justified grid. Photos with no date go in a final "Undated" group.

### `/photos/[set]` (static params from photosets.json)
- Hero: cover photo with gradient; title and subtitle overlaid.
- Stats line: date range derived from member photos ("Nov 2024",
  "Mar – Apr 2025", "2022 – 2025") · "N photos".
- Optional blurb paragraph.
- Justified grid of the set's photos in listed order.
- Prev/next photoset links (existing `PrevNext` if it fits).
- `generateMetadata` gives a title and OG image (cover).
- Unknown slug → `notFound()`.

### Lightbox (shared client component)
Dialog over the page, opened from any grid/stream photo, scoped to that
grid's photo list. Shows the full image (contain), caption, date, camera, and
"n / total". Controls: ←/→ keys and buttons, swipe on touch, Esc / backdrop /
close button to dismiss. Focus moves into the dialog and returns to the
clicked photo on close; body scroll is locked while open. No per-photo URLs.

## Justified grid

CSS-only row packing so it server-renders: a flex-wrap container where each
item has `flex-grow: aspect` and `flex-basis: aspect × targetRowHeight`, with
an inner `padding-bottom` set to `100 / aspect`% to hold its shape. A trailing
`flex-grow: 10` spacer stops the last row from stretching. Target row height is
smaller on mobile.

## Data

### One-time processing script: `scripts/process-photos.mjs`
Uses `sharp` (already in node_modules) and runs with `node scripts/process-photos.mjs`.
- Input: `public/gallery/places/*` plus captions from `src/data/gallery.json`.
- For each photo: read EXIF DateTimeOriginal and camera model, apply EXIF
  orientation, resize to max 2400px long edge, re-encode JPEG (q≈82) **with
  all metadata stripped**, write to `public/images/photos/<id>.jpg` (not `public/photos/`, which would share URLs with the `/photos/[set]` route) (id = lowercased
  filename stem).
- Emit `src/data/photos.json`: `[{ id, file, caption, width, height, takenAt
  (ISO string or null), camera (string or null) }]`.
- Afterwards, delete `public/gallery/` and `src/data/gallery.json`. The script
  stays in the repo so new photos can be added the same way. It only writes
  entries that are not already in photos.json, so hand-edited captions survive.

### `src/data/photosets.json` (hand-edited)
`[{ slug, title, subtitle, cover (photo id), blurb?, photos: [photo ids] }]`,
listed in display order. Initial sets:

| slug | title | subtitle | photos |
|---|---|---|---|
| san-jacinto | San Jacinto | Mt. San Jacinto & Suicide Rock | san-jacinto-peak-1..3, suicide-rock, hiking-in-mountains-sunset |
| san-diego-coast | San Diego Coast | La Jolla, Torrey Pines & Coronado | windansea-beach, sunset-at-windansea-beach, seals-at-la-jolla, torrey-pines-beach-1..2, coronado-beach-1, pacific-beach-at-night, san-diego-bay-sunset |
| san-diego | San Diego | The city, day and night | downtown-sd-night-storm, downtown-sd-sunset, downtown-sd-airplane-view, chula-vista, balboa-park-church, cowles-mountain-peak-at-night, view-from-my-apartment, protest-in-downtown-sd, hotel-churchill, flowers-and-sunset |
| grand-haven | Grand Haven | Lake Michigan shoreline | grand-haven-lighthouse, grand-haven-pier-1..2, grand-haven-red-house, train-coal-station, sunset-at-grand-haven, muskegon-beach |
| michigan | Michigan | Seasons back home | michigan-day-snow, michigan-night-snow, michigan-fall-colors, michigan-starry-sky, back-in-michigan, northern-michigan, taquemenon-falls, grand-rapids-1..3 |
| campus | Campus | UCSD, USD & MSU | geisel-library, usd-campus-fountain, usd-campus-hilltop, usd-campus-hilltop-2, msu-campus-fountain, msu-library, memorial-hospital |
| on-the-road | On the Road | Sedona, Nashville & the drive between | sedona-arizona-1..2, nashville, roadtrip-stormclouds |

### Access layer: `src/lib/photos.ts`
Typed loaders: `getPhotos()` (newest first), `getPhoto(id)`, `getPhotosets()`,
`getPhotoset(slug)` (resolves photo ids, throws at build on an unknown id),
`photosetDateRange(photos)`.

## Removed
`src/app/gallery/` (page + Gallery.tsx), `src/data/gallery.json`,
`public/gallery/`. `Frame`/`FrameSlide` stay in the UI kit if used elsewhere.

## Verification
- `npm run build` succeeds; `/photos`, `/photos/stream`, all 7 set pages and
  the `/gallery` redirect are generated or served.
- Each route checked in the browser on desktop and at 375px width: no
  horizontal page scroll, grid rows fill the width, lightbox works with the
  keyboard and closes cleanly.
- A metadata check confirms no file in `public/images/photos` contains EXIF or GPS.

## Out of scope
Collections, per-photo pages, maps, per-set long-form write-ups, CMS.
