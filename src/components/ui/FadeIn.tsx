'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { fade } from '@/lib/motion';

export function FadeIn({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <motion.div initial="hidden" animate="show" variants={fade} className={className}>
      {children}
    </motion.div>
  );
}
