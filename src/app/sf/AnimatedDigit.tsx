'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useEffect, useRef } from 'react';

type AnimatedDigitProps = {
  value: number;
};

export default function AnimatedDigit({ value }: AnimatedDigitProps) {
  const prevValue = useRef(value);

  useEffect(() => {
    prevValue.current = value;
  }, [value]);

  const hasChanged = prevValue.current !== value;

  const paddedValue = String(value).padStart(2, '0');

  return (
    <div className="relative h-15 overflow-hidden w-18 text-6xl font-mono">
      <AnimatePresence initial={false}>
        {hasChanged ? (
          <motion.div
            key={value}
            initial={{ y: '-100%', opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: '100%', opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="absolute w-full text-center"
          >
            {paddedValue}
          </motion.div>
        ) : (
          <div className="absolute w-full text-center">{paddedValue}</div>
        )}
      </AnimatePresence>
    </div>
  );
}
