'use client';

import Image from 'next/image';
import { Play } from 'lucide-react';
import { Checkbox, StatusTag } from '@/components/ui';
import { formatPhotoDate } from '@/lib/photos-core';
import { displayStatus, thumbnailUrl, type AdminMedia } from '@/lib/media/serialize';

function duration(seconds: number | null): string | null {
  if (!seconds) return null;
  const whole = Math.round(seconds);
  return `${Math.floor(whole / 60)}:${String(whole % 60).padStart(2, '0')}`;
}

export function MediaTile({ media, selected, onSelect, onOpen }: {
  media: AdminMedia;
  selected: boolean;
  onSelect: (selected: boolean) => void;
  onOpen: () => void;
}) {
  const src = thumbnailUrl(media);
  const label = media.caption || (media.kind === 'VIDEO' ? 'Untitled video' : 'Untitled photo');
  const details = [media.placeName, formatPhotoDate(media.takenAt)].filter(Boolean).join(' · ');

  return (
    <li className="relative min-w-0">
      <button
        type="button"
        onClick={onOpen}
        aria-label={`Open ${label}`}
        className="relative block aspect-square w-full cursor-pointer overflow-hidden rounded-ui border border-border bg-surface transition-colors duration-150 hover:border-accent-hairline"
      >
        {src ? (
          <Image src={src} alt="" fill sizes="(max-width: 640px) 50vw, (max-width: 1024px) 25vw, 200px" className="object-cover" />
        ) : (
          <span className="grid h-full place-items-center px-2 text-center font-sans text-[0.75rem] text-muted">
            {media.processing === 'PENDING' ? 'Processing…' : media.processing === 'FAILED' ? 'Failed' : 'No preview'}
          </span>
        )}
        {media.kind === 'VIDEO' && (
          <span className="absolute bottom-1.5 left-1.5 inline-flex items-center gap-1 rounded-ui bg-black/70 px-1.5 py-0.5 font-sans text-[0.6875rem] text-white tabular-nums">
            <Play aria-hidden="true" className="size-3" /> {duration(media.durationSec) ?? 'Video'}
          </span>
        )}
      </button>
      <Checkbox
        aria-label={`Select ${label}`}
        checked={selected}
        onChange={(e) => onSelect(e.target.checked)}
        className="absolute left-1.5 top-1.5 rounded-ui bg-bg/85 p-1.5"
      />
      <StatusTag status={displayStatus(media)} className="absolute right-1.5 top-1.5 bg-bg/85" />
      <p className="mt-1.5 truncate font-sans text-[0.8125rem] text-fg">{media.caption || <span className="text-muted">No caption</span>}</p>
      <p className="truncate font-sans text-[0.75rem] text-muted">{details || 'No place or date'}</p>
    </li>
  );
}
