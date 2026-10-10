import type { MetadataRoute } from 'next';
import projects from '@/data/projects.json';
import { getPublishedArticles } from '@/lib/content/articles';
import { getPhotosModel } from '@/lib/content/photos';
import { buildSitemap } from '@/lib/seo/sitemap';

// Built from the database, so a newly published article or collection is listed within seconds of the admin
// revalidating it, with no redeploy.
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [articles, photos] = await Promise.all([getPublishedArticles(), getPhotosModel()]);
  return buildSitemap({
    projectSlugs: projects.map((project) => project.slug),
    articleSlugs: articles.map((article) => article.id),
    collectionPaths: photos.collectionPaths(),
  });
}
