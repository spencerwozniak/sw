import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import Image from 'next/image';
import ClientNavigationWrapper from '@/components/ClientNavigationWrapper';
import Chatbot from '@/components/Chatbot';
import Footer from '@/components/Footer';
import articles from '../articles.json';
import styles from './page.module.css';

interface Article {
  id: string;
  title: string;
  date: string;
  location: string;
  contents: string;
  image: [string, string];
  keywords?: string[]; // optional for backward compatibility
}

interface Props {
  params: { id: string };
}

// ✅ Dynamically generate SEO metadata per article
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const article = articles.find((p) => p.id === params.id);

  if (!article) return {};

  const fullTitle = `${article.title} | WozPrep Article`;
  const description = `Read "${article.title}", an article published on ${article.date} by WozPrep in ${article.location}. Learn more about MCAT prep, science education, and tutoring innovations.`;

  return {
    title: fullTitle,
    description,
    keywords: article.keywords || [
      'WozPrep article',
      'Spencer Wozniak',
      article.title
    ],
    icons: {
      icon: '/wp-logo-circle.png',
      shortcut: '/wp-logo-circle.png',
      apple: '/wp-logo-circle.png'
    },
    robots: {
      index: true,
      follow: true
    },
    alternates: {
      canonical: `https://www.wozprep.org/article/${params.id}`
    },
    openGraph: {
      title: fullTitle,
      description,
      url: `https://www.wozprep.org/article/${params.id}`,
      type: 'article',
      publishedTime: new Date(article.date).toISOString(),
      images: [
        {
          url: `https://www.wozprep.org/article/${article.image[0]}`,
          width: 800,
          height: 600,
          alt: article.image[1]
        }
      ]
    },
    twitter: {
      card: 'summary_large_image',
      title: fullTitle,
      description,
      images: [`https://www.wozprep.org/article/${article.image[0]}`]
    },
    other: {
      'article:published_time': new Date(article.date).toISOString(),
      'article:author': 'Spencer Wozniak', // or company name
      'article:section': 'Article',
      'article:tag': 'MCAT, Education, WozPrep'
    }    
  };
}

export function generateStaticParams() {
  return articles.map((article) => ({ id: article.id }));
}

export default function ArticlePage({ params }: Props) {
  const article: Article | undefined = articles.find((p) => p.id === params.id);

  if (!article) return notFound();

  return (
    <div className={styles.articlePage}>
      <ClientNavigationWrapper />
      <main className={styles.container}>
        <article className={styles.glassCard}>
        <header className={styles.header}>
          <h1 className={styles.title}>{article.title}</h1>
          <p className={styles.subhead}>{article.date} · {article.location}</p>
        </header>


        <section className={styles.content}>
        <div className={styles.flowWrapper}>
            {article.image.length > 0 && (
                <div className={styles.inlineImageContainer}>
                  <Image
                    src={`/articles/${article.image[0]}`}
                    alt={article.image[1]}
                    width={300}
                    height={200}
                    className={styles.inlineImage}
                  />
                  <p className={styles.caption}>{article.image[1]}</p>
                </div>
              )}
            <div dangerouslySetInnerHTML={{ __html: article.contents }} />
        </div>
        </section>


        </article>
      </main>
      <Chatbot />
      <Footer />
    </div>
  );
}
