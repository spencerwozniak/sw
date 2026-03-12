'use client';

import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { FaChevronDown } from 'react-icons/fa';
import ArticleBrowser from './ArticleBrowser';

interface Article {
  id: string;
  title: string;
  date: string;
  name: string;
  contents: string;
  topic?: string;
}

interface Props {
  articles: Article[];
  publications: Article[];
}

export default function AnimatedWritingContent({ articles, publications }: Props) {
  const router = useRouter();

  const handleRandomArticle = () => {
    if (articles.length === 0) return;
    const randomIndex = Math.floor(Math.random() * articles.length);
    const randomArticle = articles[randomIndex];
    if (randomArticle?.id) {
      router.push(`/writing/${randomArticle.id}`);
    }
  };

  const scrollToSection = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
      className=""
    >
      {/* Hero section */}
      <section className="relative flex flex-col min-h-screen overflow-hidden w-full">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
          className="flex-1 flex flex-col items-center justify-center text-center p-16 px-8 max-w-[800px] mx-auto w-full md:p-12 md:px-6"
        >
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3, ease: [0.22, 1, 0.36, 1] }}
            className="text-[3.5rem] md:text-[4.5rem] mb-6 text-center font-semibold tracking-tight leading-tight text-white"
          >
            Writing
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4, ease: [0.22, 1, 0.36, 1] }}
            className="text-xl md:text-2xl mb-12 opacity-80 font-light leading-relaxed max-w-[600px] text-white"
          >
            Essays and publications
          </motion.p>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.5, ease: [0.22, 1, 0.36, 1] }}
            className="flex flex-col sm:flex-row gap-6 items-center justify-center w-full max-w-[400px] sm:max-w-none"
          >
            <button
              type="button"
              onClick={handleRandomArticle}
              className="inline-flex items-center justify-center py-3.5 px-6 bg-white/5 text-white font-bold rounded-2xl text-[0.95rem] font-medium cursor-pointer transition-all duration-300 w-full sm:w-auto hover:bg-white/90 hover:-translate-y-0.5 active:translate-y-0 focus:outline-none"
            >
              Random article
            </button>
            <button
              type="button"
              onClick={() => scrollToSection('essays')}
              className="inline-flex items-center justify-center gap-3 py-3.5 px-6 bg-transparent border border-white/20 rounded-2xl text-white text-[0.95rem] font-medium cursor-pointer transition-all duration-300 w-full sm:w-auto hover:bg-white/5 hover:border-white/30 hover:-translate-y-0.5 active:translate-y-0 focus:outline-none group"
            >
              <span>Essays</span>
              <FaChevronDown className="text-sm transition-transform duration-300 group-hover:translate-y-1" />
            </button>
            <button
              type="button"
              onClick={() => scrollToSection('publications')}
              className="inline-flex items-center justify-center gap-3 py-3.5 px-6 bg-transparent border border-white/20 rounded-2xl text-white text-[0.95rem] font-medium cursor-pointer transition-all duration-300 w-full sm:w-auto hover:bg-white/5 hover:border-white/30 hover:-translate-y-0.5 active:translate-y-0 focus:outline-none group"
            >
              <span>Publications</span>
              <FaChevronDown className="text-sm transition-transform duration-300 group-hover:translate-y-1" />
            </button>
          </motion.div>
        </motion.div>
        {/* Scroll indicator */}
        <div className="absolute bottom-20 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2">
          <span className="text-sm text-white/50 font-medium mb-2">See more</span>
          <button
            type="button"
            onClick={() => scrollToSection('essays')}
            className="bg-transparent border-none cursor-pointer p-0 flex items-center justify-center transition-opacity duration-300 hover:opacity-80 focus:outline-none"
            aria-label="Scroll to essays"
          >
            <div className="animate-bounce">
              <FaChevronDown className="h-5 w-5 text-white/50" aria-hidden="true" />
            </div>
          </button>
        </div>
      </section>

      <motion.h1
        id="essays"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
        className="text-center mx-auto mt-20 mb-5 text-4xl font-semibold text-white scroll-mt-24"
      >
        Essays
      </motion.h1>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.3, ease: [0.22, 1, 0.36, 1] }}
      >
        <ArticleBrowser itemsPerPage={6} data={articles} />
      </motion.div>
      <motion.h1
        id="publications"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.4, ease: [0.22, 1, 0.36, 1] }}
        className="text-center mx-auto mb-10 text-4xl font-semibold text-white scroll-mt-24"
      >
        Publications
      </motion.h1>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.5, ease: [0.22, 1, 0.36, 1] }}
      >
        <ArticleBrowser itemsPerPage={6} data={publications} showSearchBar={false} />
      </motion.div>
    </motion.div>
  );
}
