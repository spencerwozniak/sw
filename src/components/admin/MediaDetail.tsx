'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { Button, Dialog, Field, Input, StatusTag, Switch, Textarea, useToast } from '@/components/ui';
import { formatPhotoDate } from '@/lib/photos-core';
import { processPhoto } from '@/lib/media/upload-client';
import { canRetryProcessing, displayStatus, thumbnailUrl, type AdminMedia } from '@/lib/media/serialize';
import { setPublishedAction, updateMediaAction } from '@/app/admin/(authed)/media-actions';

// `datetime-local` values look like "2025-03-20T19:01"; stored dates have seconds too.
const toInput = (takenAt: string | null) => (takenAt ? takenAt.slice(0, 16) : '');

export function MediaDetail({ media, onClose, onChanged, onDelete }: {
  media: AdminMedia | null;
  onClose: () => void;
  /** Called after any change, so the list can refresh. */
  onChanged: () => void;
  onDelete: (id: string) => void;
}) {
  const toast = useToast();
  const [caption, setCaption] = useState('');
  const [altText, setAltText] = useState('');
  const [placeName, setPlaceName] = useState('');
  const [takenAt, setTakenAt] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!media) return;
    setCaption(media.caption);
    setAltText(media.altText);
    setPlaceName(media.placeName ?? '');
    setTakenAt(toInput(media.takenAt));
  }, [media]);

  if (!media) return <Dialog open={false} onClose={onClose} title="Details" />;

  const src = thumbnailUrl(media);
  const ready = media.processing === 'READY';

  const act = async (work: () => Promise<{ ok: boolean; error?: string } | void>, success: string) => {
    setBusy(true);
    try {
      const result = await work();
      if (result && !result.ok) toast(result.error ?? 'Something went wrong.', { tone: 'error' });
      else {
        toast(success);
        onChanged();
      }
    } catch (error) {
      toast(error instanceof Error ? error.message : 'Something went wrong.', { tone: 'error' });
    } finally {
      setBusy(false);
    }
  };

  const save = () =>
    act(
      () =>
        updateMediaAction(media.id, {
          caption,
          altText,
          placeName,
          // Only send the date if it was changed, so seconds from the original are not dropped.
          ...(takenAt !== toInput(media.takenAt) ? { takenAt } : {}),
        }),
      'Saved'
    );

  return (
    <Dialog
      open
      size="lg"
      onClose={onClose}
      title={media.kind === 'VIDEO' ? 'Video details' : 'Photo details'}
      actions={
        <>
          <Button variant="outline" onClick={() => onDelete(media.id)} disabled={busy}>
            Delete
          </Button>
          <Button variant="outline" onClick={onClose} disabled={busy}>
            Close
          </Button>
          <Button variant="primary" onClick={save} disabled={busy}>
            Save
          </Button>
        </>
      }
    >
      <div className="grid gap-5 sm:grid-cols-[14rem_1fr]">
        <div className="grid content-start gap-3">
          <div className="relative aspect-square overflow-hidden rounded-ui border border-border bg-surface">
            {src ? <Image src={src} alt={media.altText || media.caption || ''} fill sizes="224px" className="object-cover" /> : null}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <StatusTag status={displayStatus(media)} />
            {media.width && media.height && <span className="font-sans text-[0.75rem] text-muted tabular-nums">{media.width}×{media.height}</span>}
          </div>
          {media.camera && <p className="m-0 font-sans text-[0.8125rem] text-muted">Camera: {media.camera}</p>}
          {media.processing !== 'READY' && (
            <div className="grid gap-2">
              {media.processing === 'FAILED' && (
                <p role="alert" className="m-0 font-sans text-[0.8125rem] font-bold text-fg">{media.processingError ?? 'Processing failed.'}</p>
              )}
              {media.processing === 'PENDING' && canRetryProcessing(media) && (
                <p className="m-0 font-sans text-[0.8125rem] text-muted">Still processing. If this has been more than a few minutes, try again.</p>
              )}
              {canRetryProcessing(media) && (
                <Button size="sm" variant="outline" disabled={busy} onClick={() => act(async () => void (await processPhoto(media.id)), 'Processed')}>
                  Retry processing
                </Button>
              )}
            </div>
          )}
          {media.kind === 'PHOTO' && ready && (
            <Button size="sm" variant="outline" href={`/api/admin/media/${media.id}/original`} newTab>
              Download original
            </Button>
          )}
        </div>
        <div className="grid content-start gap-4">
          <Field label="Caption" htmlFor="detail-caption">
            <Input id="detail-caption" label="Caption" value={caption} onChange={(e) => setCaption(e.target.value)} />
          </Field>
          <Field label="Alt text" htmlFor="detail-alt" hint="Describes the image for people using screen readers.">
            <Textarea id="detail-alt" label="Alt text" rows={3} value={altText} onChange={(e) => setAltText(e.target.value)} />
          </Field>
          <Field label="Place" htmlFor="detail-place">
            <Input id="detail-place" label="Place" value={placeName} onChange={(e) => setPlaceName(e.target.value)} />
          </Field>
          <Field label="Taken" htmlFor="detail-taken" hint={media.takenAt ? formatPhotoDate(media.takenAt) ?? undefined : 'No date yet.'}>
            <Input id="detail-taken" label="Taken" type="datetime-local" value={takenAt} onChange={(e) => setTakenAt(e.target.value)} />
          </Field>
          <Switch
            checked={media.status === 'PUBLISHED'}
            disabled={busy || !ready}
            onChange={(next) => act(() => setPublishedAction([media.id], next), next ? 'Published' : 'Moved back to drafts')}
            label={media.status === 'PUBLISHED' ? 'Published' : ready ? 'Draft' : 'Draft (publish after processing)'}
          />
        </div>
      </div>
    </Dialog>
  );
}
