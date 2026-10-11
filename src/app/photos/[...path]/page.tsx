import type { Metadata } from 'next';
import { notFound, permanentRedirect } from 'next/navigation';
import { parsePathSegments } from '@/lib/collections/paths';
import { tileSrc } from '@/lib/content/media-format';
import { getPhotosModel } from '@/lib/content/photos';
import { CollectionView } from '../_components/CollectionView';

type Params = Promise<{ path: string[] }>;

// A collection added in the admin has no page until someone asks for it; it is then built once and kept
// until the admin changes something (the admin revalidates /photos).
export async function generateStaticParams() {
  return (await getPhotosModel()).collectionPaths().map((path) => ({ path }));
}

/** First words of the first text block, for search results and link previews. */
function plainText(html: string, max = 160): string {
  const text = html.replace(/<[^>]*>/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/\s+/g, ' ').trim();
  return text.length <= max ? text : `${text.slice(0, max - 1).replace(/\s+\S*$/, '')}…`;
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const segments = parsePathSegments((await params).path);
  const page = segments ? (await getPhotosModel()).collectionPage(segments) : null;
  if (!page) return {};
  const firstText = page.blocks.find((block) => block.type === 'TEXT');
  const title = `${page.title} · Photos`;
  const description = page.subtitle || (firstText?.type === 'TEXT' ? plainText(firstText.html) : '') || `Photos: ${page.title}`;
  const image = page.cover ? tileSrc(page.cover) : null;
  return {
    title,
    description,
    alternates: { canonical: page.href },
    openGraph: {
      type: 'website',
      title,
      description,
      url: page.href,
      ...(image && page.cover ? { images: [{ url: image, width: page.cover.width, height: page.cover.height, alt: page.cover.alt }] } : {}),
    },
    // Set explicitly: the layout's twitter card would otherwise win over the cover.
    twitter: { card: 'summary_large_image', title, description, ...(image ? { images: [image] } : {}) },
  };
}

export default async function CollectionPage({ params }: { params: Params }) {
  const segments = parsePathSegments((await params).path);
  if (!segments) notFound();
  const model = await getPhotosModel();
  const page = model.collectionPage(segments);
  if (!page) {
    // A collection that was renamed or moved: send old links to where it lives now.
    const moved = model.redirectTarget(segments);
    if (moved) permanentRedirect(moved);
    notFound();
  }

  return <CollectionView page={page} />;
}
