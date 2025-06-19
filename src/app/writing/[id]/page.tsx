

import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import Image from 'next/image';
import ClientNavigationWrapper from '@/components/ClientNavigationWrapper';
import Chatbot from '@/components/Chatbot';
import Footer from '@/components/Footer';
import articles from '@/data/articles.json';
import styles from './page.module.css'

interface Article {
  id: string;
  title: string;
  topic: string;
  date: string;
  name: string;
  contents: string;
  image: [string, string];
  keywords?: string[];
}

interface Props {
  params: { id: string };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const article = articles.find((p) => p.id === params.id);

  if (!article) return {};

  const fullTitle = `${article.title} | Spencer Wozniak`;
  const description = `Read "${article.title}", an article published on ${article.date} by Spencer Wozniak.`;

  return {
    title: fullTitle,
    description,
    keywords: article.keywords || ['Spencer Wozniak', article.title],
    robots: { index: true, follow: true },
    alternates: {
      canonical: `https://www.spencerwozniak.com/writing/${params.id}`,
    },
    openGraph: {
      title: fullTitle,
      description,
      url: `https://www.spencerwozniak.com/writing/${params.id}`,
      type: 'article',
      publishedTime: new Date(article.date).toISOString(),
      images: [
        {
          url: `https://www.spencerwozniak.com/sw-full-signature-white.png`,
          width: 800,
          height: 400,
          alt: 'Spencer Wozniak Signature',
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: fullTitle,
      description,
      images: [`https://www.spencerwozniak.com/sw-full-signature-white.png`],
    },
    other: {
      'article:published_time': new Date(article.date).toISOString(),
      'article:author': 'Spencer Wozniak',
      'article:section': 'Article',
      'article:tag': 'Spencer Wozniak',
    },
  };
}

export function generateStaticParams() {
  return articles.map((article) => ({ id: article.id }));
}

export default function ArticlePage({ params }: Props) {
  const article: Article | undefined = articles.find((p) => p.id === params.id);
  const currentIndex = articles.findIndex((p) => p.id === params.id);
  const nextArticle = currentIndex > 0 ? articles[currentIndex - 1] : null;
  const prevArticle = currentIndex < articles.length - 1 ? articles[currentIndex + 1] : null;

  if (!article) return notFound();

  return (
    <div className="flex flex-col bg-[#0a0a0a] text-[#eaeaea]">
      <ClientNavigationWrapper />
      <main className="w-full max-w-6xl mx-auto mt-32 mb-5">
        <article className="px-6 xl:border-t xl:border-b xl:border-[#333] xl:p-10">
          <header className="flex flex-col items-start">
            <h1 className="text-3xl font-bold text-white mb-4">{article.title}</h1>
            <p className="text-[1.1rem] text-[#bbb] mb-4">{article.name}</p>
            <p className="text-[1.1rem] text-[#8d8d8d] mb-0">{article.topic} | {article.date}</p>
          </header>

          <section className="text-white text-[1.125rem] leading-8 font-heading">
            <div className="block w-full overflow-hidden relative">
              {article.image.length > 0 && (
                <div className="float-left mr-6 my-6 text-left leading-tight">
                  <Image
                    src={`/articles/${article.image[0]}`}
                    alt={article.image[1]}
                    width={300}
                    height={200}
                    className="rounded-xl shadow-md w-full h-auto object-cover"
                  />
                  <p className="text-sm text-[#aaa] mt-1.5 leading-snug">{article.image[1]}</p>
                </div>
              )}
              <div className={styles.articleContent} dangerouslySetInnerHTML={{ __html: article.contents }} />
              <div className="clear-both" />
            </div>
          </section>
        </article>

        <div className="flex justify-between mt-4 px-6">
          {prevArticle && (
            <a href={`/writing/${prevArticle.id}`} className="text-base no-underline hover:underline">
              ← Previous
            </a>
          )}
          {nextArticle && (
            <a href={`/writing/${nextArticle.id}`} className="text-base no-underline hover:underline ml-auto">
              Next →
            </a>
          )}
        </div>
      </main>
      <Chatbot />
      <Footer />
    </div>
  );
}
