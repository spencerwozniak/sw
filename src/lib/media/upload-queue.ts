import type { MediaKindName } from '@/lib/blob-paths';

// State for the upload screen. Pure, so it can be tested without a browser.

export type UploadStatus = 'queued' | 'hashing' | 'registering' | 'uploading' | 'processing' | 'ready' | 'failed' | 'duplicate';

export type UploadItem = {
  /** Client-side id for this row (not the database id). */
  key: string;
  name: string;
  kind: MediaKindName;
  size: number;
  status: UploadStatus;
  /** 0 to 1, while uploading. */
  progress: number;
  mediaId?: string;
  duplicateOf?: string;
  error?: string;
  caption: string;
  placeName: string;
};

export type UploadAction =
  | { type: 'add'; items: UploadItem[] }
  | { type: 'patch'; key: string; patch: Partial<UploadItem> }
  | { type: 'remove'; key: string }
  | { type: 'clearFinished' };

const IN_PROGRESS: UploadStatus[] = ['queued', 'hashing', 'registering', 'uploading', 'processing'];

export function uploadReducer(state: UploadItem[], action: UploadAction): UploadItem[] {
  switch (action.type) {
    case 'add': {
      const known = new Set(state.map((i) => i.key));
      return [...state, ...action.items.filter((i) => !known.has(i.key))];
    }
    case 'patch':
      return state.some((i) => i.key === action.key) ? state.map((i) => (i.key === action.key ? { ...i, ...action.patch } : i)) : state;
    case 'remove':
      return state.filter((i) => i.key !== action.key);
    case 'clearFinished':
      return state.filter((i) => IN_PROGRESS.includes(i.status));
  }
}

export function summarize(items: UploadItem[]) {
  const count = (statuses: UploadStatus[]) => items.filter((i) => statuses.includes(i.status)).length;
  return {
    total: items.length,
    active: count(['hashing', 'registering', 'uploading', 'processing']),
    queued: count(['queued']),
    ready: count(['ready']),
    failed: count(['failed']),
    duplicates: count(['duplicate']),
  };
}

export function describeStatus(item: UploadItem): string {
  switch (item.status) {
    case 'queued': return 'Waiting';
    case 'hashing': return 'Checking…';
    case 'registering': return 'Starting…';
    case 'uploading': return `Uploading ${Math.round(item.progress * 100)}%`;
    case 'processing': return 'Processing…';
    case 'ready': return 'Ready';
    case 'duplicate': return 'Already uploaded';
    case 'failed': return item.error || 'Failed';
  }
}
