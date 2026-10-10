import type { BlobStore } from '@/lib/blob';
import { MAX_PHOTO_BYTES, MAX_VIDEO_BYTES, PHOTO_MIME_TYPES, VIDEO_MIME_TYPES } from '@/lib/blob-paths';

// Decides whether the browser may upload to a given Blob pathname. The pathname must
// belong to a media row that was registered first, match its kind, and be a location we
// own: originals go to the PRIVATE store, videos and posters to the PUBLIC one.

export class UploadNotAllowedError extends Error {}

export type UploadRole = 'original' | 'video' | 'poster';
export type ParsedUploadPath = { role: UploadRole; mediaId: string; ext: string };
export type UploadTarget = {
  store: BlobStore;
  mediaId: string;
  allowedContentTypes: string[];
  maximumSizeInBytes: number;
};
export type RegisteredMedia = { id: string; kind: 'PHOTO' | 'VIDEO'; processing: 'PENDING' | 'READY' | 'FAILED' };

const ID = '[a-z0-9]{20,40}';
const PATTERNS: Array<{ role: UploadRole; regex: RegExp }> = [
  { role: 'original', regex: new RegExp(`^originals/(${ID})\\.(jpg|png|webp)$`) },
  { role: 'video', regex: new RegExp(`^videos/(${ID})\\.(mp4|mov|webm)$`) },
  { role: 'poster', regex: new RegExp(`^posters/(${ID})\\.(jpg)$`) },
];

export function parseUploadPath(pathname: string): ParsedUploadPath | null {
  for (const { role, regex } of PATTERNS) {
    const match = regex.exec(pathname);
    if (match) return { role, mediaId: match[1], ext: match[2] };
  }
  return null;
}

const MIME_FOR_EXT: Record<string, string> = {
  jpg: 'image/jpeg', png: 'image/png', webp: 'image/webp', mp4: 'video/mp4', mov: 'video/quicktime', webm: 'video/webm',
};

export function authorizeUpload(pathname: string, media: RegisteredMedia | null): UploadTarget {
  const parsed = parseUploadPath(pathname);
  if (!parsed) throw new UploadNotAllowedError('That upload location is not allowed.');
  if (!media || media.id !== parsed.mediaId) throw new UploadNotAllowedError('Register the file before uploading it.');
  if (media.processing === 'READY') throw new UploadNotAllowedError('This item is already processed.');

  const expectedKind = parsed.role === 'original' ? 'PHOTO' : 'VIDEO';
  if (media.kind !== expectedKind) throw new UploadNotAllowedError('The file type does not match what was registered.');
  const mime = MIME_FOR_EXT[parsed.ext];
  const valid = parsed.role === 'poster' ? mime === 'image/jpeg' : (parsed.role === 'original' ? PHOTO_MIME_TYPES : VIDEO_MIME_TYPES).includes(mime);
  if (!valid) throw new UploadNotAllowedError('The file extension is not allowed here.');

  if (parsed.role === 'original') return { store: 'private', mediaId: media.id, allowedContentTypes: [mime], maximumSizeInBytes: MAX_PHOTO_BYTES };
  if (parsed.role === 'video') return { store: 'public', mediaId: media.id, allowedContentTypes: [mime], maximumSizeInBytes: MAX_VIDEO_BYTES };
  return { store: 'public', mediaId: media.id, allowedContentTypes: ['image/jpeg'], maximumSizeInBytes: 5 * 1024 * 1024 };
}
