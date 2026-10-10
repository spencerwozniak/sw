import { isValidSlug } from '@/lib/articles/slug';

// Validation for what the collection screens send. Every action runs its input through these.

export class InvalidCollectionError extends Error {}

const fail = (message: string): never => {
  throw new InvalidCollectionError(message);
};

export const MAX_TITLE = 120;
export const MAX_SUBTITLE = 200;
export const MAX_IDS = 200;

const ID = /^[a-z0-9]{20,40}$/;

export function parseId(value: unknown, what = 'item'): string {
  return typeof value === 'string' && ID.test(value) ? value : fail(`Unknown ${what}.`);
}

export function parseIdList(value: unknown, what = 'item'): string[] {
  if (!Array.isArray(value)) return fail(`Choose at least one ${what}.`);
  if (value.length > MAX_IDS) return fail(`Choose at most ${MAX_IDS} items at a time.`);
  return [...new Set(value.map((v) => parseId(v, what)))];
}

export function parseBlockType(value: unknown): 'TEXT' | 'GRID' {
  return value === 'TEXT' || value === 'GRID' ? value : fail('Choose a text block or a photo grid.');
}

export type CollectionFields = { title: string; subtitle: string; slug: string };

function text(value: unknown, field: string, max: number, required: boolean): string {
  if (typeof value !== 'string') return required ? fail(`${field} is required.`) : '';
  const trimmed = value.trim();
  if (required && !trimmed) fail(`${field} is required.`);
  if (trimmed.length > max) fail(`${field} is too long (limit ${max} characters).`);
  return trimmed;
}

export function parseCollectionFields(raw: Record<string, unknown>): CollectionFields {
  const slug = typeof raw.slug === 'string' ? raw.slug.trim() : '';
  if (!slug) fail('URL name is required.');
  if (!isValidSlug(slug)) fail('The URL name can only use lower-case letters, numbers and single hyphens.');
  return { title: text(raw.title, 'Title', MAX_TITLE, true), subtitle: text(raw.subtitle, 'Subtitle', MAX_SUBTITLE, false), slug };
}
