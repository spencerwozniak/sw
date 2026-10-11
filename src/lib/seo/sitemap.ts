import type { MetadataRoute } from 'next';

// What search engines are told about the site. One place decides what is public, so the sitemap and robots.txt agree.

export const SITE_URL = 'https://www.spencerwozniak.com';

/** Pages that are never listed: utilities, private pages, retired routes and the admin. */
export const EXCLUDED_PREFIXES = ['/invoice', '/meetings', '/sf', '/legal', '/gallery', '/admin', '/api'] as const;

/** The pages that always exist. Dynamic pages (projects, articles, collections) are added from their data. */
const STATIC_PATHS = ['/', '/contact', '/work', '/writing', '/photos', '/photos/all'];

export const isExcluded = (path: string): boolean => EXCLUDED_PREFIXES.some((prefix) => path === prefix || path.startsWith(`${prefix}/`));

export function buildSitemap(input: {
  projectSlugs: readonly string[];
  articleSlugs: readonly string[];
  /** Slug paths of the collections that are on the site, e.g. ['san-diego', 'la-jolla']. */
  collectionPaths: ReadonlyArray<readonly string[]>;
  now?: Date;
}): MetadataRoute.Sitemap {
  const paths = [
    ...STATIC_PATHS,
    ...input.projectSlugs.map((slug) => `/work/projects/${slug}`),
    ...input.articleSlugs.map((slug) => `/writing/${slug}`),
    ...input.collectionPaths.map((path) => `/photos/${path.join('/')}`),
  ].filter((path) => !isExcluded(path));
  const lastModified = input.now ?? new Date();
  return [...new Set(paths)].map((path) => ({
    url: `${SITE_URL}${path === '/' ? '' : path}`,
    lastModified,
    changeFrequency: 'weekly' as const,
    priority: 0.7,
  }));
}

export function buildRobots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: '*', allow: '/', disallow: ['/admin', '/api/admin'] }],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
