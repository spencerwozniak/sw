import type { MetadataRoute } from 'next';
import { buildRobots } from '@/lib/seo/sitemap';

export default function robots(): MetadataRoute.Robots {
  return buildRobots();
}
