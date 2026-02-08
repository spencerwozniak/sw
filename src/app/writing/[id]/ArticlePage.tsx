"use client";

import { useEffect, useRef } from "react";
import { motion } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import renderMathInElement from "katex/contrib/auto-render";
import "katex/dist/katex.min.css";
import Breadcrumb from "./_components/Breadcrumb";
import ShareButtons from "./_components/ShareButtons";
import styles from "./page.module.css";

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

export default function ArticlePage({
  article,
  prevArticle,
  nextArticle,
}: Props) {
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!contentRef.current) return;
    renderMathInElement(contentRef.current, {
      throwOnError: false,
      errorColor: "#cc0000",
    });
  }, [article.contents]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
      className="flex flex-col text-white"
    >
      <main className="w-full max-w-4xl mx-auto mt-16 mb-5">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
          className="px-6 xl:px-10 mb-4"
        >
          <Breadcrumb
            items={[
              { label: "Writing", href: "/writing" },
              { label: article.title },
            ]}
          />
        </motion.div>

        <motion.article
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3, ease: [0.22, 1, 0.36, 1] }}
          className="px-6 md:px-10"
        >
          <header className="flex flex-col items-start">
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.4, ease: [0.22, 1, 0.36, 1] }}
              className="text-4xl font-bold text-white mt-2 mb-4"
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
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.65, ease: [0.22, 1, 0.36, 1] }}
            >
              <ShareButtons articleId={article.id} />
            </motion.div>
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
                  transition={{
                    duration: 0.8,
                    delay: 0.8,
                    ease: [0.22, 1, 0.36, 1],
                  }}
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
                ref={contentRef}
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
            <Link
              href={`/writing/${prevArticle.id}`}
              className="text-base no-underline hover:underline text-white"
            >
              ← Previous
            </Link>
          )}
          {nextArticle && (
            <Link
              href={`/writing/${nextArticle.id}`}
              className="text-base no-underline hover:underline ml-auto text-white"
            >
              Next →
            </Link>
          )}
        </motion.div>
      </main>
    </motion.div>
  );
}
