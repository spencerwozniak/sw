import { isValidSlug } from '@/lib/articles/slug';

// Where collections live on the site: /photos/<slug>/<child-slug>/…

/** Collections can be nested this deep: a trip, a place on it, a day there. */
export const MAX_DEPTH = 3;

/** `/photos/all` is a fixed page, so no top-level collection may take that name. */
export const RESERVED_ROOT_SLUGS: readonly string[] = ['all'];

export const isReservedRootSlug = (slug: string): boolean => RESERVED_ROOT_SLUGS.includes(slug);

/** "san-diego/la-jolla": how a collection's path is stored and compared. */
export const pathString = (slugs: readonly string[]): string => slugs.join('/');

export const photosHref = (slugs: readonly string[]): string => `/photos/${pathString(slugs)}`;

/**
 * The URL segments after /photos, as slugs, or null when the URL could not possibly be a collection
 * (junk never reaches the database, and the page can answer 404 straight away).
 */
export function parsePathSegments(segments: readonly string[] | undefined): string[] | null {
  if (!segments || segments.length === 0 || segments.length > MAX_DEPTH) return null;
  return segments.every((segment) => isValidSlug(segment)) ? [...segments] : null;
}
