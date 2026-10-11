import type { Prisma } from '@/generated/prisma/client';

export const PAGE_SIZE = 48;
const MAX_PAGE = 1000;

export type MediaState = 'draft' | 'published' | 'processing' | 'failed';
export type MediaScope = 'inbox' | 'library';
export type MediaFilters = {
  state?: MediaState;
  kind?: 'PHOTO' | 'VIDEO';
  q?: string;
  missing?: 'place' | 'caption';
  collection?: string;
  page: number;
};

const STATES: MediaState[] = ['draft', 'published', 'processing', 'failed'];
const one = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value);

export function parseMediaFilters(params: Record<string, string | string[] | undefined>): MediaFilters {
  const filters: MediaFilters = { page: 1 };
  const state = one(params.state);
  if (STATES.includes(state as MediaState)) filters.state = state as MediaState;
  const kind = one(params.kind);
  if (kind === 'PHOTO' || kind === 'VIDEO') filters.kind = kind;
  const q = one(params.q)?.trim();
  if (q) filters.q = q;
  const missing = one(params.missing);
  if (missing === 'place' || missing === 'caption') filters.missing = missing;
  const collection = one(params.collection);
  if (collection) filters.collection = collection;
  const page = one(params.page);
  if (page && /^\d+$/.test(page) && Number(page) >= 1) filters.page = Math.min(Number(page), MAX_PAGE);
  return filters;
}

export function mediaWhere(filters: MediaFilters, scope: MediaScope): Prisma.MediaWhereInput {
  const and: Prisma.MediaWhereInput[] = [];
  if (scope === 'inbox') and.push({ status: 'DRAFT' });
  if (filters.state === 'draft') and.push({ status: 'DRAFT', processing: 'READY' });
  if (filters.state === 'published') and.push({ status: 'PUBLISHED' });
  if (filters.state === 'processing') and.push({ processing: 'PENDING' });
  if (filters.state === 'failed') and.push({ processing: 'FAILED' });
  if (filters.kind) and.push({ kind: filters.kind });
  if (filters.q) {
    const contains = { contains: filters.q, mode: 'insensitive' as const };
    and.push({ OR: [{ caption: contains }, { placeName: contains }, { altText: contains }] });
  }
  if (filters.missing === 'place') and.push({ OR: [{ placeName: null }, { placeName: '' }] });
  if (filters.missing === 'caption') and.push({ caption: '' });
  if (filters.collection) and.push({ gridItems: { some: { block: { collectionId: filters.collection } } } });
  return { AND: and };
}

export function mediaOrderBy(scope: MediaScope): Prisma.MediaOrderByWithRelationInput[] {
  return scope === 'inbox' ? [{ createdAt: 'desc' }] : [{ takenAt: { sort: 'desc', nulls: 'last' } }, { createdAt: 'desc' }];
}

/** A query string for links that keep the current filters, with optional overrides. Defaults are left out. */
export function filtersToQuery(filters: MediaFilters, overrides: Partial<MediaFilters> = {}): string {
  const merged = { ...filters, ...overrides };
  const params = new URLSearchParams();
  if (merged.state) params.set('state', merged.state);
  if (merged.kind) params.set('kind', merged.kind);
  if (merged.q) params.set('q', merged.q);
  if (merged.missing) params.set('missing', merged.missing);
  if (merged.collection) params.set('collection', merged.collection);
  if (merged.page > 1) params.set('page', String(merged.page));
  const text = params.toString();
  return text ? `?${text}` : '';
}
