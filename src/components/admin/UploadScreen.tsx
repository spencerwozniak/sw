'use client';

import { useCallback, useEffect, useReducer, useRef, useState } from 'react';
import Link from 'next/link';
import { Film, Upload, X } from 'lucide-react';
import { Button, Dropzone, Input, Panel, Switch, useToast } from '@/components/ui';
import { posterPath, videoPath } from '@/lib/blob-paths';
import { hashBlob } from '@/lib/media/hash';
import { createLimiter } from '@/lib/media/limiter';
import type { AdminMedia } from '@/lib/media/serialize';
import { describeStatus, settleReady, summarize, uploadReducer, type UploadItem } from '@/lib/media/upload-queue';
import { completeVideo, fileDateAsWallClock, processPhoto, readVideoInfo, registerFile, uploadFile } from '@/lib/media/upload-client';
import { mimeFor, validateUpload } from '@/lib/media/validate';
import { setPublishedAction, updateMediaAction } from '@/app/admin/(authed)/media-actions';

const UPLOADS_AT_ONCE = 3;
const PROCESSING_AT_ONCE = 2;

export function UploadScreen() {
  const toast = useToast();
  const [items, dispatch] = useReducer(uploadReducer, []);
  const [publishNow, setPublishNow] = useState(false);

  // Files and preview URLs live outside React state: they are large and never rendered directly.
  const files = useRef(new Map<string, File>());
  const previews = useRef(new Map<string, string>());
  const latestItems = useRef<UploadItem[]>([]);
  latestItems.current = items;
  const publishRef = useRef(false);
  publishRef.current = publishNow;
  const limits = useRef({ upload: createLimiter(UPLOADS_AT_ONCE), process: createLimiter(PROCESSING_AT_ONCE) });

  const patch = useCallback((key: string, changes: Partial<UploadItem>) => dispatch({ type: 'patch', key, patch: changes }), []);

  useEffect(() => {
    const urls = previews.current;
    return () => urls.forEach((url) => URL.revokeObjectURL(url));
  }, []);

  const run = useCallback(
    async (key: string, kind: UploadItem['kind']) => {
      const file = files.current.get(key);
      if (!file) return;
      let finished: { mediaId: string; media: AdminMedia } | undefined;
      try {
        patch(key, { status: 'hashing', error: undefined });
        const hash = await hashBlob(file, kind);

        patch(key, { status: 'registering' });
        const registered = await registerFile(file, hash);
        if (registered.outcome === 'duplicate') {
          patch(key, { status: 'duplicate', duplicateOf: registered.mediaId });
          return;
        }
        const { mediaId } = registered;
        patch(key, { status: 'uploading', progress: 0, mediaId });

        let media: AdminMedia;
        if (registered.kind === 'PHOTO') {
          await limits.current.upload(() =>
            uploadFile(registered.upload.path, file, { access: 'private', contentType: mimeFor(file), mediaId, onProgress: (progress) => patch(key, { progress }) })
          );
          patch(key, { status: 'processing', progress: 1 });
          media = await limits.current.process(() => processPhoto(mediaId));
        } else {
          const info = await readVideoInfo(file);
          const ext = registered.upload.path.split('.').pop() as string;
          const [video, poster] = await limits.current.upload(() =>
            Promise.all([
              uploadFile(videoPath(mediaId, ext), file, { access: 'public', contentType: mimeFor(file), mediaId, onProgress: (progress) => patch(key, { progress }) }),
              uploadFile(posterPath(mediaId), info.poster, { access: 'public', contentType: 'image/jpeg', mediaId }),
            ])
          );
          patch(key, { status: 'processing', progress: 1 });
          media = await completeVideo(mediaId, {
            webUrl: video.url, posterUrl: poster.url, width: info.width, height: info.height, durationSec: info.durationSec, takenAt: fileDateAsWallClock(file),
          });
        }

        finished = { mediaId, media };
      } catch (error) {
        patch(key, { status: 'failed', error: error instanceof Error ? error.message : String(error) });
      }
      if (!finished) return;

      // From here the file is saved on the server, so a problem below must not make it look failed.
      // What was typed while it uploaded is read before the row changes: a place the server found is
      // kept unless a place was typed, and only the typed fields are saved.
      const { mediaId, media } = finished;
      const settled = settleReady(latestItems.current.find((i) => i.key === key) ?? { caption: '', placeName: '' }, media.placeName);
      patch(key, settled.patch);
      try {
        if (settled.save) {
          const saved = await updateMediaAction(mediaId, settled.save);
          if (!saved.ok) toast(saved.error, { tone: 'error' });
        }
        if (publishRef.current) {
          const published = await setPublishedAction([mediaId], true);
          if (!published.ok) toast(published.error, { tone: 'error' });
        }
      } catch (error) {
        toast(error instanceof Error ? error.message : 'Could not save the changes to this item.', { tone: 'error' });
      }
    },
    [patch, toast]
  );

  const onFiles = useCallback(
    (selected: File[]) => {
      const accepted: UploadItem[] = [];
      const toStart: Array<{ key: string; kind: UploadItem['kind'] }> = [];
      for (const file of selected) {
        const key = crypto.randomUUID();
        const check = validateUpload(file);
        const kind = check.ok ? check.kind : mimeFor(file).startsWith('video/') ? 'VIDEO' : 'PHOTO';
        const base = { key, name: file.name, kind, size: file.size, progress: 0, caption: '', placeName: '' } as const;
        if (!check.ok) {
          accepted.push({ ...base, status: 'failed', error: check.error });
          continue;
        }
        files.current.set(key, file);
        if (check.kind === 'PHOTO') previews.current.set(key, URL.createObjectURL(file));
        accepted.push({ ...base, status: 'queued' });
        toStart.push({ key, kind: check.kind });
      }
      dispatch({ type: 'add', items: accepted });
      toStart.forEach(({ key, kind }) => void run(key, kind));
    },
    [run]
  );

  const remove = (key: string) => {
    const url = previews.current.get(key);
    if (url) URL.revokeObjectURL(url);
    previews.current.delete(key);
    files.current.delete(key);
    dispatch({ type: 'remove', key });
  };

  const counts = summarize(items);
  const hasVideo = items.some((i) => i.kind === 'VIDEO');

  return (
    <div className="grid gap-6">
      <Dropzone label="Choose photos or videos to upload" accept="image/jpeg,image/png,image/webp,video/mp4,video/quicktime,video/webm,.jpg,.jpeg,.png,.webp,.mp4,.mov,.webm" onFiles={onFiles}>
        <span className="grid justify-items-center gap-2">
          <Upload aria-hidden="true" className="size-7 text-muted" />
          <span className="font-serif text-[1.25rem] font-semibold text-fg">Add photos or videos</span>
          <span className="max-w-[42ch] text-[0.9375rem] text-muted">Drag files here, or tap to choose them. JPEG, PNG or WebP photos; MP4, MOV or WebM videos.</span>
        </span>
      </Dropzone>

      <div className="grid gap-3 font-sans text-[0.875rem] text-muted">
        <Switch checked={publishNow} onChange={setPublishNow} label="Publish immediately when ready" />
        <p className="m-0">Keep this page open while files upload. Without the switch above, everything arrives in the Inbox as a draft.</p>
        {hasVideo && (
          <p role="note" className="m-0 border-l border-accent-hairline pl-3 text-fg">
            Videos are published exactly as uploaded. If a video was shot with location services on, the filming location is stored inside the file and stays public.
          </p>
        )}
      </div>

      {items.length > 0 && (
        <section aria-label="Uploads" className="grid gap-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="m-0 font-sans text-[0.875rem] text-muted" aria-live="polite">
              {counts.ready} ready · {counts.active + counts.queued} in progress · {counts.failed} failed{counts.duplicates ? ` · ${counts.duplicates} already uploaded` : ''}
            </p>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={() => dispatch({ type: 'clearFinished' })}>
                Clear finished
              </Button>
              <Button size="sm" href="/admin/inbox">
                Go to inbox
              </Button>
            </div>
          </div>
          <ul className="m-0 grid list-none gap-3 p-0">
            {items.map((item) => (
              <UploadRow key={item.key} item={item} preview={previews.current.get(item.key)} onChange={(changes) => patch(item.key, changes)} onRemove={() => remove(item.key)} onRetry={() => void run(item.key, item.kind)} />
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

function UploadRow({ item, preview, onChange, onRemove, onRetry }: {
  item: UploadItem;
  preview?: string;
  onChange: (changes: Partial<UploadItem>) => void;
  onRemove: () => void;
  onRetry: () => void;
}) {
  const toast = useToast();
  const busy = ['hashing', 'registering', 'uploading', 'processing'].includes(item.status);

  // Once the item exists on the server, edits are saved when the field loses focus.
  const save = async () => {
    if (item.status !== 'ready' || !item.mediaId) return;
    const result = await updateMediaAction(item.mediaId, { caption: item.caption, placeName: item.placeName });
    if (!result.ok) toast(result.error, { tone: 'error' });
  };

  return (
    <li>
      <Panel padding="sm" className="grid gap-3 sm:grid-cols-[6rem_1fr] sm:items-start">
        <div className="grid size-24 place-items-center overflow-hidden rounded-ui border border-border bg-bg">
          {preview ? (
            // eslint-disable-next-line @next/next/no-img-element -- a local object URL, not something next/image can optimise
            <img src={preview} alt="" className="size-full object-cover" />
          ) : (
            <Film aria-hidden="true" className="size-6 text-muted" />
          )}
        </div>
        <div className="grid min-w-0 gap-2">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="m-0 truncate font-sans text-[0.9375rem] font-bold text-fg">{item.name}</p>
              <p className={item.status === 'failed' ? 'm-0 font-sans text-[0.875rem] font-bold text-fg' : 'm-0 font-sans text-[0.875rem] text-muted'} role={item.status === 'failed' ? 'alert' : undefined}>
                {describeStatus(item)}
              </p>
            </div>
            <div className="flex shrink-0 gap-1">
              {item.status === 'failed' && item.mediaId && (
                <Button size="sm" variant="outline" onClick={onRetry}>
                  Retry
                </Button>
              )}
              {!busy && (
                <Button size="sm" variant="ghost" square aria-label={`Remove ${item.name}`} onClick={onRemove}>
                  <X aria-hidden="true" />
                </Button>
              )}
            </div>
          </div>
          {item.status === 'uploading' && (
            <div role="progressbar" aria-label={`Uploading ${item.name}`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(item.progress * 100)} className="h-1 w-full overflow-hidden rounded-full bg-border">
              <div className="h-full bg-accent transition-[width] duration-150" style={{ width: `${Math.round(item.progress * 100)}%` }} />
            </div>
          )}
          {item.status !== 'failed' && item.status !== 'duplicate' && (
            <div className="grid gap-2 sm:grid-cols-2">
              <Input label={`Caption for ${item.name}`} placeholder="Caption" value={item.caption} onChange={(e) => onChange({ caption: e.target.value })} onBlur={save} />
              <Input label={`Place for ${item.name}`} placeholder="Place" value={item.placeName} onChange={(e) => onChange({ placeName: e.target.value })} onBlur={save} />
            </div>
          )}
          {item.status === 'ready' && (
            <p className="m-0 font-sans text-[0.8125rem] text-muted">
              Saved as a draft. <Link href="/admin/inbox" className="link">Open the inbox</Link>
            </p>
          )}
        </div>
      </Panel>
    </li>
  );
}
