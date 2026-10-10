'use client';

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { Check, Play } from 'lucide-react';
import { Button, Dialog, Input, Select } from '@/components/ui';
import { cx } from '@/lib/cx';
import { thumbnailUrl, type AdminMedia } from '@/lib/media/serialize';
import { searchPickerMediaAction } from '@/app/admin/(authed)/collections/actions';

/**
 * Choose photos and videos from the library. Everything fully processed is offered, drafts included, because
 * a collection is usually put together before its photos are published.
 */
export function MediaPicker({ open, onClose, title, confirmLabel, multiple = true, excludeIds = [], onPick }: {
  open: boolean;
  onClose: () => void;
  title: string;
  /** Button text for one choice; with several chosen it becomes "<label> (3)". */
  confirmLabel: string;
  multiple?: boolean;
  /** Items already in the grid: not offered again. */
  excludeIds?: readonly string[];
  onPick: (items: AdminMedia[]) => void;
}) {
  const [q, setQ] = useState('');
  const [kind, setKind] = useState('');
  const [items, setItems] = useState<AdminMedia[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [chosen, setChosen] = useState<AdminMedia[]>([]);
  const request = useRef(0);

  const load = async (nextPage: number, replace: boolean) => {
    const mine = ++request.current;
    setLoading(true);
    setError(null);
    const result = await searchPickerMediaAction({ q, kind, page: nextPage });
    if (mine !== request.current) return; // a newer search has replaced this one
    setLoading(false);
    if (!result.ok) return setError(result.error);
    setItems((current) => (replace ? result.items : [...current, ...result.items]));
    setPage(nextPage);
    setHasMore(result.hasMore);
  };

  // Start fresh each time it opens.
  useEffect(() => {
    if (!open) return;
    setQ('');
    setKind('');
    setChosen([]);
    setItems([]);
  }, [open]);

  // Search as the writer types (after a short pause) or changes the type.
  useEffect(() => {
    if (!open) return;
    const timer = setTimeout(() => void load(1, true), q ? 250 : 0);
    return () => clearTimeout(timer);
  }, [open, q, kind]); // eslint-disable-line react-hooks/exhaustive-deps

  const toggle = (media: AdminMedia) =>
    setChosen((current) => (current.some((c) => c.id === media.id) ? current.filter((c) => c.id !== media.id) : multiple ? [...current, media] : [media]));

  const visible = items.filter((media) => !excludeIds.includes(media.id));

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={title}
      size="lg"
      actions={
        <>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button variant="primary" disabled={chosen.length === 0} onClick={() => onPick(chosen)}>
            {multiple && chosen.length > 1 ? `${confirmLabel} (${chosen.length})` : confirmLabel}
          </Button>
        </>
      }
    >
      <div className="grid gap-2 sm:grid-cols-[1fr_10rem]">
        <Input label="Search captions and places" placeholder="Search" value={q} onChange={(e) => setQ(e.target.value)} autoFocus />
        <Select label="Type" value={kind} onChange={(e) => setKind(e.target.value)}>
          <option value="">Photos and videos</option>
          <option value="PHOTO">Photos</option>
          <option value="VIDEO">Videos</option>
        </Select>
      </div>

      {error && <p role="alert" className="m-0 font-sans text-[0.875rem] font-bold text-fg">{error}</p>}

      <ul aria-label="Photos and videos" className="m-0 grid max-h-[50dvh] list-none grid-cols-3 gap-2 overflow-y-auto p-0 sm:grid-cols-4">
        {visible.map((media) => {
          const on = chosen.some((c) => c.id === media.id);
          const src = thumbnailUrl(media);
          const label = media.caption || media.placeName || (media.kind === 'VIDEO' ? 'Untitled video' : 'Untitled photo');
          return (
            <li key={media.id} className="min-w-0">
              <button
                type="button"
                aria-pressed={on}
                aria-label={label}
                onClick={() => toggle(media)}
                className={cx('relative block aspect-square w-full cursor-pointer overflow-hidden rounded-ui border bg-surface', on ? 'border-accent ring-2 ring-accent' : 'border-border hover:border-accent-hairline')}
              >
                {src && <Image src={src} alt="" fill sizes="(max-width: 640px) 33vw, 160px" className="object-cover" />}
                {media.kind === 'VIDEO' && (
                  <span className="absolute bottom-1 left-1 inline-flex items-center gap-1 rounded-ui bg-black/70 px-1.5 py-0.5 font-sans text-[0.6875rem] text-white">
                    <Play aria-hidden="true" className="size-3" /> Video
                  </span>
                )}
                {media.status === 'DRAFT' && <span className="absolute right-1 top-1 rounded-ui bg-bg/90 px-1.5 py-0.5 font-sans text-[0.6875rem] text-muted">Draft</span>}
                {on && (
                  <span className="absolute left-1 top-1 grid size-5 place-items-center rounded-full bg-accent text-bg">
                    <Check aria-hidden="true" className="size-3.5" />
                  </span>
                )}
              </button>
              <p className="mt-1 truncate font-sans text-[0.75rem] text-muted">{label}</p>
            </li>
          );
        })}
      </ul>

      {!loading && visible.length === 0 && !error && <p className="m-0 text-center font-sans text-[0.875rem] text-muted">{q || kind ? 'Nothing matches.' : 'No photos or videos to add yet.'}</p>}
      {hasMore && (
        <div className="text-center">
          <Button size="sm" variant="outline" onClick={() => void load(page + 1, false)} disabled={loading}>
            {loading ? 'Loading…' : 'Show more'}
          </Button>
        </div>
      )}
    </Dialog>
  );
}
