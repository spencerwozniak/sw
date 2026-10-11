// Browser-side steps of an upload. Only runs in the browser (uses fetch, <video>, <canvas>).
import { upload } from '@vercel/blob/client';
import type { AdminMedia } from './serialize';

export type RegisterResult =
  | { outcome: 'created' | 'resumed'; mediaId: string; kind: 'PHOTO' | 'VIDEO'; upload: { store: 'private' | 'public'; path: string; posterPath?: string } }
  | { outcome: 'duplicate'; mediaId: string };

async function postJson<T>(url: string, body: unknown, okStatuses: number[] = [200]): Promise<{ status: number; data: T }> {
  const response = await fetch(url, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
  const data = (await response.json().catch(() => ({}))) as T & { error?: string };
  if (!okStatuses.includes(response.status)) throw new Error(data.error || `Request failed (${response.status}).`);
  return { status: response.status, data };
}

export async function registerFile(file: File, contentHash: string): Promise<RegisterResult> {
  const { data } = await postJson<RegisterResult>('/api/admin/media', { name: file.name, type: file.type, size: file.size, contentHash }, [200, 201, 409]);
  return data;
}

const MULTIPART_THRESHOLD = 40 * 1024 * 1024;

/** Upload straight to Blob (the server only hands out a short-lived token for this one path). */
export async function uploadFile(
  path: string,
  file: Blob,
  options: { access: 'private' | 'public'; contentType: string; mediaId: string; onProgress?: (fraction: number) => void }
): Promise<{ url: string }> {
  const result = await upload(path, file, {
    access: options.access,
    handleUploadUrl: '/api/admin/upload',
    clientPayload: JSON.stringify({ mediaId: options.mediaId }),
    contentType: options.contentType,
    multipart: file.size > MULTIPART_THRESHOLD,
    onUploadProgress: ({ percentage }) => options.onProgress?.(percentage / 100),
  });
  return { url: result.url };
}

export async function processPhoto(mediaId: string): Promise<AdminMedia> {
  const { data } = await postJson<{ outcome: { status: string; error?: string }; media: AdminMedia | null }>(`/api/admin/media/${mediaId}/process`, {});
  if (data.outcome.status === 'failed') throw new Error(data.outcome.error || 'Processing failed.');
  if (!data.media) throw new Error('The item disappeared while processing.');
  return data.media;
}

export async function completeVideo(
  mediaId: string,
  details: { webUrl: string; posterUrl: string; width: number; height: number; durationSec: number; takenAt?: string }
): Promise<AdminMedia> {
  const { data } = await postJson<{ media: AdminMedia }>(`/api/admin/media/${mediaId}/complete`, details);
  return data.media;
}

/** Local wall-clock time of the file's last-modified date, as "YYYY-MM-DDTHH:mm:ss". Editable later. */
export function fileDateAsWallClock(file: File): string {
  const d = new Date(file.lastModified);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

export type VideoInfo = { width: number; height: number; durationSec: number; poster: Blob };

/** Reads a video's size and length and grabs a poster frame, entirely in the browser. */
export function readVideoInfo(file: File): Promise<VideoInfo> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const video = document.createElement('video');
    video.muted = true;
    video.playsInline = true;
    video.preload = 'metadata';
    const finish = (action: () => void) => {
      clearTimeout(timer);
      URL.revokeObjectURL(url);
      video.removeAttribute('src');
      video.load();
      action();
    };
    const timer = setTimeout(() => finish(() => reject(new Error("This browser could not read the video. Try another browser, or convert it to MP4."))), 20000);
    video.onerror = () => finish(() => reject(new Error("This browser could not read the video. Try another browser, or convert it to MP4.")));
    video.onloadedmetadata = () => {
      video.currentTime = Math.min(1, video.duration / 2);
    };
    video.onseeked = () => {
      const scale = Math.min(1, 1280 / video.videoWidth);
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(video.videoWidth * scale);
      canvas.height = Math.round(video.videoHeight * scale);
      canvas.getContext('2d')?.drawImage(video, 0, 0, canvas.width, canvas.height);
      const info = { width: video.videoWidth, height: video.videoHeight, durationSec: video.duration };
      canvas.toBlob(
        (poster) => finish(() => (poster ? resolve({ ...info, poster }) : reject(new Error('Could not capture a poster frame.')))),
        'image/jpeg',
        0.82
      );
    };
    video.src = url;
  });
}
