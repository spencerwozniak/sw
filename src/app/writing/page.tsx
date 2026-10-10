// src/app/mcat/page.tsx (Server Component)
import Chatbot from '@/components/Chatbot';
import { getPublishedArticles, getPublishedPublications } from '@/lib/content/articles';
import AnimatedWritingContent from './AnimatedWritingContent';

export const metadata = {
  title: 'Writing',
  description:
    'Essays and publications by Spencer Wozniak on faith, philosophy, science and healthcare technology.',
  alternates: { canonical: '/writing' },
};

export default async function ArticlePage() {
  const [articles, publications] = await Promise.all([getPublishedArticles(), getPublishedPublications()]);

  return (
    <>
      <AnimatedWritingContent articles={articles} publications={publications} />
      <Chatbot />
    </>
  );
}
