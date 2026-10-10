// Pure photo types and helpers. No imports, so this module is safe for
// client components and the tsx-run tests and photo script.

export type Photo = {
  id: string;
  file: string;
  caption: string;
  width: number;
  height: number;
  /** Local capture time from EXIF, "YYYY-MM-DDTHH:mm:ss", no timezone. */
  takenAt: string | null;
  camera: string | null;
};

export type PhotosetRecord = {
  slug: string;
  title: string;
  subtitle: string;
  cover: string;
  blurb?: string;
  photos: string[];
};

export type Photoset = Omit<PhotosetRecord, 'cover' | 'photos'> & { cover: Photo; photos: Photo[] };

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

export const PHOTO_DIR = '/images/photos';

export function photoSrc(photo: Pick<Photo, 'file'>): string {
  return `${PHOTO_DIR}/${photo.file}`;
}

export function idFromFilename(filename: string): string {
  return filename.replace(/\.[^.]+$/, '').toLowerCase();
}

export function captionFromId(id: string): string {
  return id
    .replace(/-\d+$/, '')
    .split('-')
    .filter(Boolean)
    .map((word) => word[0].toUpperCase() + word.slice(1))
    .join(' ');
}

export function exifDateToIso(value: string | null | undefined): string | null {
  const m = value?.match(/^(\d{4}):(\d{2}):(\d{2}) (\d{2}):(\d{2}):(\d{2})/);
  return m ? `${m[1]}-${m[2]}-${m[3]}T${m[4]}:${m[5]}:${m[6]}` : null;
}

// Read date parts from the string itself; `new Date()` would apply a timezone.
function yearMonth(takenAt: string) {
  return { year: Number(takenAt.slice(0, 4)), month: Number(takenAt.slice(5, 7)) - 1 };
}

const shortMonth = (month: number) => MONTHS[month].slice(0, 3);

export function sortNewestFirst(photos: Photo[]): Photo[] {
  return [...photos].sort((a, b) => {
    if (a.takenAt === b.takenAt) return 0;
    if (a.takenAt === null) return 1;
    if (b.takenAt === null) return -1;
    return a.takenAt < b.takenAt ? 1 : -1;
  });
}

export function resolvePhotoset(record: PhotosetRecord, byId: ReadonlyMap<string, Photo>): Photoset {
  const lookup = (id: string) => {
    const photo = byId.get(id);
    if (!photo) throw new Error(`Photoset "${record.slug}" references unknown photo "${id}"`);
    return photo;
  };
  return { ...record, cover: lookup(record.cover), photos: record.photos.map(lookup) };
}

export function formatDateRange(photos: Photo[]): string | null {
  const dates = photos
    .map((p) => p.takenAt)
    .filter((d): d is string => d !== null)
    .sort();
  if (!dates.length) return null;
  const first = yearMonth(dates[0]);
  const last = yearMonth(dates[dates.length - 1]);
  if (first.year !== last.year) return `${first.year} – ${last.year}`;
  if (first.month !== last.month) return `${shortMonth(first.month)} – ${shortMonth(last.month)} ${first.year}`;
  return `${shortMonth(first.month)} ${first.year}`;
}

export function formatPhotoDate(takenAt: string | null): string | null {
  if (!takenAt) return null;
  const { year, month } = yearMonth(takenAt);
  return `${shortMonth(month)} ${Number(takenAt.slice(8, 10))}, ${year}`;
}

export function stepIndex(index: number, step: number, total: number): number {
  return (((index + step) % total) + total) % total;
}

/** Existing entries win, so re-running the import never clobbers edited captions. */
export function mergePhotos(existing: Photo[], incoming: Photo[]): Photo[] {
  const seen = new Set(existing.map((p) => p.id));
  const merged = [...existing];
  for (const photo of incoming) {
    if (seen.has(photo.id)) continue;
    seen.add(photo.id);
    merged.push(photo);
  }
  return merged;
}

/** Date then camera, the same details the lightbox and grid hover show. */
export function photoDetails(photo: Photo): string[] {
  return [formatPhotoDate(photo.takenAt), photo.camera].filter((d): d is string => Boolean(d));
}

/**
 * A length relative to the grid's container width: calc(<cqw>cqw + <px>px).
 * Masonry positions are linear in the container width, so computing them in
 * this form lets the server lay out the collage once and CSS scale it exactly.
 */
export type FluidLength = { cqw: number; px: number };

export type MasonryTile = { top: FluidLength; left: FluidLength; height: FluidLength };

export type MasonryLayout = {
  columnWidth: FluidLength;
  tiles: MasonryTile[];
  /** Height of each non-empty column; the grid is as tall as the tallest. */
  columnHeights: FluidLength[];
};

// Rounds away float noise and normalizes -0 so lengths compare and print cleanly.
const tidy = (n: number) => Math.round(n * 1e6) / 1e6 + 0;
const fluid = (cqw: number, px: number): FluidLength => ({ cqw: tidy(cqw), px: tidy(px) });
const add = (a: FluidLength, b: FluidLength) => fluid(a.cqw + b.cqw, a.px + b.px);

/**
 * Masonry placement: each photo goes into the currently shortest column
 * (leftmost on ties), so reading order stays left-to-right across the top.
 * `referenceWidth` (px) only breaks near-ties between columns.
 */
export function masonryLayout(
  photos: Pick<Photo, 'width' | 'height'>[],
  columns: number,
  gap: number,
  referenceWidth = 1200
): MasonryLayout {
  const columnWidth = fluid(100 / columns, (-gap * (columns - 1)) / columns);
  const bottoms: (FluidLength | null)[] = Array.from({ length: columns }, () => null);
  const at = (len: FluidLength | null) => (len ? (len.cqw * referenceWidth) / 100 + len.px + gap : 0);

  const tiles = photos.map((photo) => {
    let column = 0;
    for (let c = 1; c < columns; c++) if (at(bottoms[c]) < at(bottoms[column])) column = c;
    const ratio = photo.width / photo.height;
    const top = bottoms[column] ? add(bottoms[column]!, fluid(0, gap)) : fluid(0, 0);
    const height = fluid(columnWidth.cqw / ratio, columnWidth.px / ratio);
    bottoms[column] = add(top, height);
    return { top, left: fluid((column * 100) / columns, (column * gap) / columns), height };
  });

  return { columnWidth, tiles, columnHeights: bottoms.filter((b): b is FluidLength => b !== null) };
}

const trim = (n: number) => Number(Math.abs(n).toFixed(4));

export function fluidCss({ cqw, px }: FluidLength): string {
  return `calc(${Number(cqw.toFixed(4))}cqw ${px < 0 ? '-' : '+'} ${trim(px)}px)`;
}

export function fluidMax(lengths: FluidLength[]): string {
  if (!lengths.length) return '0px';
  if (lengths.length === 1) return fluidCss(lengths[0]);
  return `max(${lengths.map(fluidCss).join(', ')})`;
}
