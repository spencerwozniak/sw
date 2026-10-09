'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { fade } from '@/lib/motion';

type AnimatedDigitProps = {
  value: number;
};

export default function AnimatedDigit({ value }: AnimatedDigitProps) {
  const paddedValue = String(value).padStart(2, '0');

  return (
    <span className="relative inline-grid tabular-nums">
      <AnimatePresence initial={false} mode="popLayout">
        <motion.span
          key={value}
          initial="hidden"
          animate="show"
          exit="exit"
          variants={fade}
          className="[grid-area:1/1]"
        >
          {paddedValue}
        </motion.span>
      </AnimatePresence>
    </span>
  );
}
