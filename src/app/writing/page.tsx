// src/app/mcat/page.tsx (Server Component)
import fs from 'fs';
import path from 'path';
import ArticleBrowser from './ArticleBrowser';
import ClientNavigationWrapper from '@/components/ClientNavigationWrapper';
import Chatbot from '@/components/Chatbot';
import Footer from '@/components/Footer';

export default function ArticlePage() {
  const publicationsPath = path.join(process.cwd(), 'src', 'data', 'publications.json');
  const articlesPath = path.join(process.cwd(), 'src', 'data', 'articles.json');

  const publications = JSON.parse(fs.readFileSync(publicationsPath, 'utf8'));
  const articles = JSON.parse(fs.readFileSync(articlesPath, 'utf8'));

  return (
    <>
      <ClientNavigationWrapper />
      <div className="">
        <h1 className="text-center mx-auto mt-40 mb-5 text-4xl font-semibold">Essays</h1>
        <ArticleBrowser itemsPerPage={6} data={articles} />
        <h1 className="text-center mx-auto mb-10 text-4xl font-semibold">Publications</h1>
        <ArticleBrowser itemsPerPage={6} data={publications} showSearchBar={false} />
      </div>
      <Chatbot />
      <Footer />
    </>
  );
}
