'use client';

import { motion } from 'framer-motion';
import Image from 'next/image';
import Link from 'next/link';
import styles from './page.module.css';

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
  article: Article;
  prevArticle: Article | null;
  nextArticle: Article | null;
}

export default function AnimatedArticleContent({ article, prevArticle, nextArticle }: Props) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
      className="flex flex-col text-white"
    >
      <main className="w-full max-w-6xl mx-auto mt-16 mb-5">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
          className="px-6 xl:px-10 mb-4"
        >
          <Link
            href="/writing"
            className="text-base no-underline hover:underline text-[#bbb] hover:text-white transition-colors"
          >
            ← Back to Articles
          </Link>
        </motion.div>
        <motion.article
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3, ease: [0.22, 1, 0.36, 1] }}
          className="px-6 xl:border-t xl:border-b xl:border-[#333] xl:p-10"
        >
          <header className="flex flex-col items-start">
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.4, ease: [0.22, 1, 0.36, 1] }}
              className="text-3xl font-bold text-white mb-4"
            >
              {article.title}
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.5, ease: [0.22, 1, 0.36, 1] }}
              className="text-[1.1rem] text-[#bbb] mb-4"
            >
              {article.name}
            </motion.p>
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.6, ease: [0.22, 1, 0.36, 1] }}
              className="text-[1.1rem] text-[#8d8d8d] mb-0"
            >
              {article.topic} | {article.date}
            </motion.p>
          </header>

          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.7, ease: [0.22, 1, 0.36, 1] }}
            className="text-white text-[1.125rem] leading-8 font-heading"
          >
            <div className="block w-full overflow-hidden relative">
              {article.image.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, x: -30 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.8, delay: 0.8, ease: [0.22, 1, 0.36, 1] }}
                  className="float-left mr-6 my-6 text-left leading-tight"
                >
                  <Image
                    src={`/articles/${article.image[0]}`}
                    alt={article.image[1]}
                    width={300}
                    height={200}
                    className="rounded-xl shadow-md w-full h-auto object-cover"
                  />
                  <p className="text-sm text-[#aaa] mt-1.5 leading-snug">
                    {article.image[1]}
                  </p>
                </motion.div>
              )}
              <div
                className={`mt-4 ${styles.articleContent}`}
                dangerouslySetInnerHTML={{ __html: article.contents }}
              />
              <div className="clear-both" />
            </div>
          </motion.section>
        </motion.article>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.8, ease: [0.22, 1, 0.36, 1] }}
          className="flex justify-between mt-4 px-6"
        >
          {prevArticle && (
            <a
              href={`/writing/${prevArticle.id}`}
              className="text-base no-underline hover:underline text-white"
            >
              ← Previous
            </a>
          )}
          {nextArticle && (
            <a
              href={`/writing/${nextArticle.id}`}
              className="text-base no-underline hover:underline ml-auto text-black dark:text-white"
            >
              Next →
            </a>
          )}
        </motion.div>
      </main>
    </motion.div>
  );
}
