import { getRandomArticleSlug } from '@/lib/content/articles';

// A random published essay, for the "Click me!" button in the site header.
export async function GET() {
  return Response.json({ slug: await getRandomArticleSlug() }, { headers: { 'cache-control': 'no-store' } });
}
