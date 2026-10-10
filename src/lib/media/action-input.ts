import type { MediaPatch } from './repo';

// Validation for what the admin UI sends to server actions. Server actions are public
// HTTP endpoints behind a login, so inputs are checked as if they came from anywhere.

export class InvalidInputError extends Error {}

const ID = /^[a-z0-9]{20,40}$/;
export const MAX_IDS = 200;

export function parseIds(input: unknown): string[] {
  if (!Array.isArray(input) || input.length === 0 || input.length > MAX_IDS) throw new InvalidInputError(`Choose between 1 and ${MAX_IDS} items.`);
  for (const id of input) if (typeof id !== 'string' || !ID.test(id)) throw new InvalidInputError('Invalid item id.');
  return [...new Set(input as string[])];
}

const LIMITS = { caption: 500, altText: 1000, placeName: 200 } as const;

function text(value: unknown, field: keyof typeof LIMITS): string {
  if (typeof value !== 'string') throw new InvalidInputError(`${field} must be text.`);
  const trimmed = value.trim();
  if (trimmed.length > LIMITS[field]) throw new InvalidInputError(`${field} is too long (limit ${LIMITS[field]} characters).`);
  return trimmed;
}

/** "2025-03-20", "2025-03-20T19:01" or "2025-03-20T19:01:28" as local wall-clock time stored as UTC. */
function wallClock(value: unknown): Date | null {
  if (typeof value !== 'string') throw new InvalidInputError('takenAt must be text.');
  const trimmed = value.trim();
  if (!trimmed) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})(?:T(\d{2}):(\d{2})(?::(\d{2}))?)?$/.exec(trimmed);
  if (!m) throw new InvalidInputError('Enter the date as YYYY-MM-DD.');
  const [year, month, day, hour = 0, minute = 0, second = 0] = m.slice(1).map((n) => (n === undefined ? undefined : Number(n)));
  const date = new Date(Date.UTC(year!, month! - 1, day!, hour, minute, second));
  const exact = date.getUTCFullYear() === year && date.getUTCMonth() === month! - 1 && date.getUTCDate() === day;
  if (!exact || year! < 1990 || year! > new Date().getUTCFullYear() + 1) throw new InvalidInputError('That date is not valid.');
  return date;
}

export function parsePatch(input: Record<string, unknown>): MediaPatch {
  const patch: MediaPatch = {};
  if ('caption' in input) patch.caption = text(input.caption, 'caption');
  if ('altText' in input) patch.altText = text(input.altText, 'altText');
  if ('placeName' in input) patch.placeName = text(input.placeName, 'placeName') || null;
  if ('takenAt' in input) patch.takenAt = wallClock(input.takenAt);
  return patch;
}
