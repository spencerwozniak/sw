// Pure photo types and helpers. No imports, so this module is safe for
// client components and runs directly under `node --experimental-strip-types`.

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

export type PhotoGroup = { key: string; label: string; photos: Photo[] };

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

export function groupByMonth(photos: Photo[]): PhotoGroup[] {
  const groups: PhotoGroup[] = [];
  const undated: Photo[] = [];
  for (const photo of sortNewestFirst(photos)) {
    if (!photo.takenAt) {
      undated.push(photo);
      continue;
    }
    const key = photo.takenAt.slice(0, 7);
    let group = groups[groups.length - 1];
    if (!group || group.key !== key) {
      const { year, month } = yearMonth(photo.takenAt);
      group = { key, label: `${MONTHS[month]} ${year}`, photos: [] };
      groups.push(group);
    }
    group.photos.push(photo);
  }
  if (undated.length) groups.push({ key: 'undated', label: 'Undated', photos: undated });
  return groups;
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
