import { extensionFor, originalPath, webCopyPath } from '@/lib/blob-paths';
import { readPhotoMetadata } from './exif';
import { makeWebCopy } from './image';
import type { Geocoder } from './place-name';
import type { PhotoReady } from './repo';

// Turns an uploaded original into a published-ready photo. Every outside dependency is
// injected, so the whole flow is tested with real image fixtures and no network.

export type ProcessDeps = {
  getMedia(id: string): Promise<{ id: string; kind: 'PHOTO' | 'VIDEO'; processing: 'PENDING' | 'READY' | 'FAILED'; mimeType: string } | null>;
  markPhotoReady(id: string, data: PhotoReady): Promise<void>;
  markFailed(id: string, message: string): Promise<void>;
  /** Reads an original from the PRIVATE store; null when it is not there. */
  readOriginal(pathname: string): Promise<Buffer | null>;
  /** Writes the metadata-free copy to the PUBLIC store. */
  putWebCopy(pathname: string, data: Buffer): Promise<{ url: string }>;
  geocoder: Geocoder;
};

export type ProcessOutcome =
  | { status: 'ready'; placeName: string | null }
  | { status: 'already-ready' }
  | { status: 'not-found' }
  | { status: 'not-a-photo' }
  | { status: 'failed'; error: string };

const message = (error: unknown) => (error instanceof Error ? error.message : String(error));

export async function processPhoto(id: string, deps: ProcessDeps): Promise<ProcessOutcome> {
  const media = await deps.getMedia(id);
  if (!media) return { status: 'not-found' };
  if (media.kind !== 'PHOTO') return { status: 'not-a-photo' };
  if (media.processing === 'READY') return { status: 'already-ready' };

  const fail = async (error: string): Promise<ProcessOutcome> => {
    await deps.markFailed(id, error);
    return { status: 'failed', error };
  };

  const ext = extensionFor(media.mimeType);
  if (!ext) return fail(`Unsupported file type: ${media.mimeType}.`);
  const privatePath = originalPath(id, ext);

  try {
    const original = await deps.readOriginal(privatePath);
    if (!original) return await fail('The original file was not found in storage. Upload it again.');

    const metadata = await readPhotoMetadata(original);
    let placeName: string | null = null;
    if (metadata.gps) {
      try {
        placeName = await deps.geocoder.reverse(metadata.gps.latitude, metadata.gps.longitude);
      } catch {
        placeName = null; // A place name is a nicety: never fail a photo because of it.
      }
    }

    let copy;
    try {
      copy = await makeWebCopy(original);
    } catch (error) {
      return await fail(`Could not read this image: ${message(error)}`);
    }

    const { url } = await deps.putWebCopy(webCopyPath(id), copy.data);
    await deps.markPhotoReady(id, {
      width: copy.width,
      height: copy.height,
      takenAt: metadata.takenAt,
      camera: metadata.camera,
      placeName,
      webUrl: url,
      originalPath: privatePath,
    });
    return { status: 'ready', placeName };
  } catch (error) {
    return fail(`Processing failed: ${message(error)}`);
  }
}
