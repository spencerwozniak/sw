// src/app/page.tsx
'use client';

import { motion } from 'framer-motion';
import HomePage from './HomePage';
import Chatbot from '@/components/Chatbot';
import styles from './page.module.css';

export default function Home() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      className={styles.homePage}
    >
      <HomePage />
      <Chatbot />
    </motion.div>
  );
}
