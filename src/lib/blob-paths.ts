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

// Own-property lookups only: `mime in table` and `table[mime]` also see inherited keys such as
// `constructor`, `toString` and `__proto__`, which would pass as accepted types.
export function kindForMime(mime: string): MediaKindName | null {
  if (Object.hasOwn(PHOTO_TYPES, mime)) return 'PHOTO';
  if (Object.hasOwn(VIDEO_TYPES, mime)) return 'VIDEO';
  return null;
}

export function extensionFor(mime: string): string | null {
  if (Object.hasOwn(PHOTO_TYPES, mime)) return PHOTO_TYPES[mime];
  if (Object.hasOwn(VIDEO_TYPES, mime)) return VIDEO_TYPES[mime];
  return null;
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
