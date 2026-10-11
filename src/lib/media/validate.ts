import { MAX_PHOTO_BYTES, MAX_VIDEO_BYTES, extensionFor, kindForMime, type MediaKindName } from '@/lib/blob-paths';

// Used in the browser (to reject a file before uploading it) and on the server (to
// refuse a registration), so the rules and the wording live in one place.

export type UploadCandidate = { name: string; type: string; size: number };
export type UploadValidation = { ok: true; kind: MediaKindName; ext: string } | { ok: false; error: string };

const MIME_BY_EXTENSION: Record<string, string> = {
  jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp', heic: 'image/heic', heif: 'image/heic',
  mp4: 'video/mp4', mov: 'video/quicktime', webm: 'video/webm',
};

/** Browsers often report an empty type for .mov and .jpeg files, so fall back to the extension. */
export function mimeFor(file: Pick<UploadCandidate, 'name' | 'type'>): string {
  if (file.type) return file.type;
  const ext = file.name.split('.').pop()?.toLowerCase() ?? '';
  return MIME_BY_EXTENSION[ext] ?? '';
}

const megabytes = (bytes: number) => `${Math.round(bytes / (1024 * 1024))} MB`;

export function validateUpload(file: UploadCandidate): UploadValidation {
  const mime = mimeFor(file);
  if (mime === 'image/heic' || mime === 'image/heif') {
    return { ok: false, error: `${file.name} is a HEIC photo. Export it as JPEG first (iPhone Safari converts automatically when you pick it from the camera roll).` };
  }
  const kind = kindForMime(mime);
  const ext = extensionFor(mime);
  if (!kind || !ext) return { ok: false, error: `Unsupported file type: ${file.name}. Use JPEG, PNG or WebP photos, or MP4, MOV or WebM videos.` };
  if (file.size <= 0) return { ok: false, error: `${file.name} is empty.` };
  const limit = kind === 'PHOTO' ? MAX_PHOTO_BYTES : MAX_VIDEO_BYTES;
  if (file.size > limit) return { ok: false, error: `${file.name} is too large (the limit for ${kind === 'PHOTO' ? 'photos' : 'videos'} is ${megabytes(limit)}).` };
  return { ok: true, kind, ext };
}
