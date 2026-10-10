import { notFound } from 'next/navigation';
import { Container } from '@/components/ui';
import { ArticleEditor } from '@/components/admin/ArticleEditor';
import { toDateInput } from '@/lib/articles/dates';
import { getArticle } from '@/lib/articles/repo';
import type { LexState } from '@/lib/richtext/state';

export const dynamic = 'force-dynamic';

export default async function EditArticlePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const article = /^[a-z0-9]{20,40}$/.test(id) ? await getArticle(id) : null;
  if (!article) notFound();

  return (
    <Container as="main" width="wide">
      <ArticleEditor
        article={{
          id: article.id,
          kind: article.kind,
          slug: article.slug,
          externalUrl: article.externalUrl,
          title: article.title,
          topic: article.topic,
          author: article.author,
          publishedOn: toDateInput(article.publishedOn),
          keywords: article.keywords,
          status: article.status,
          body: article.bodyJson as unknown as LexState,
        }}
      />
    </Container>
  );
}
