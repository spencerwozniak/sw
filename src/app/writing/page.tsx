// src/app/mcat/page.tsx (Server Component)
import fs from 'fs';
import path from 'path';
import Chatbot from '@/components/Chatbot';
import AnimatedWritingContent from './AnimatedWritingContent';

export const metadata = {
  title: 'Writing',
  description:
    'Essays and publications by Spencer Wozniak on faith, philosophy, science and healthcare technology.',
  alternates: { canonical: '/writing' },
};

export default function ArticlePage() {
  const publicationsPath = path.join(process.cwd(), 'src', 'data', 'publications.json');
  const articlesPath = path.join(process.cwd(), 'src', 'data', 'articles.json');

  const publications = JSON.parse(fs.readFileSync(publicationsPath, 'utf8'));
  const articles = JSON.parse(fs.readFileSync(articlesPath, 'utf8'));

  return (
    <>
      <AnimatedWritingContent articles={articles} publications={publications} />
      <Chatbot />
    </>
  );
}
