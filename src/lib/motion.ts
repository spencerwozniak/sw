import type { Transition, Variants } from 'framer-motion';

export const EASE: [number, number, number, number] = [0.2, 0.7, 0.2, 1];
export const FADE_DURATION = 0.3;
export const fadeTransition: Transition = { duration: FADE_DURATION, ease: EASE };
export const fade: Variants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: fadeTransition },
  exit: { opacity: 0, transition: fadeTransition },
};
