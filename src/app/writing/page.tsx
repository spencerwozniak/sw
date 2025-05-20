// src/app/mcat/page.tsx (Server Component)
import fs from 'fs';
import path from 'path';
import ArticleBrowser from './ArticleBrowser';
import ClientNavigationWrapper from '@/components/ClientNavigationWrapper';
import Chatbot from '@/components/Chatbot';
import Footer from '@/components/Footer';
import styles from './page.module.css';

export default function ArticlePage() {
  const publicationsPath = path.join(process.cwd(), 'src', 'data', 'publications.json');
  const articlesPath = path.join(process.cwd(), 'src', 'data', 'articles.json');

  const publications = JSON.parse(fs.readFileSync(publicationsPath, 'utf8'));
  const articles = JSON.parse(fs.readFileSync(articlesPath, 'utf8'));

  return (
    <>
      <ClientNavigationWrapper />
      <div className={styles.articleContainer}>
        <h1 className={styles.sectionTitle}>Essays</h1>
        <ArticleBrowser itemsPerPage={6} data={articles} />
        <h1 className={styles.sectionTitle}>Publications</h1>
        <ArticleBrowser itemsPerPage={6} data={publications} showSearchBar={false} />
      </div>
      <Chatbot />
      <Footer />
    </>
  );
}
