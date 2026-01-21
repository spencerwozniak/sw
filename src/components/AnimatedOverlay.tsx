'use client';

import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';

export default function AnimatedOverlay() {
  const pathname = usePathname();
  const previousPathname = useRef<string | null>(null);
  const isInitialMount = useRef(true);

  useEffect(() => {
    // Function to start animation
    const startAnimation = () => {
      // Get or create style element
      let style = document.getElementById('animated-overlay-style') as HTMLStyleElement;

      if (!style) {
        style = document.createElement('style');
        style.id = 'animated-overlay-style';
        document.head.appendChild(style);
      }

      // Ensure overlay is at opacity 0 first
      style.textContent = `
        body::after {
          animation: none !important;
          opacity: 0 !important;
        }
      `;

      // Force reflow to ensure the change is applied
      void document.body.offsetHeight;

      // Start animation after a tiny delay
      requestAnimationFrame(() => {
        if (style) {
          style.textContent = `
            body::after {
              animation: fadeInOverlay 1.5s cubic-bezier(0.22, 1, 0.36, 1) forwards !important;
            }
          `;
        }
      });
    };

    // On initial mount, always start animation
    if (isInitialMount.current) {
      isInitialMount.current = false;
      previousPathname.current = pathname;
      startAnimation();
      return;
    }

    // On navigation (pathname changed), restart animation
    if (previousPathname.current !== pathname) {
      previousPathname.current = pathname;
      startAnimation();
    }
  }, [pathname]);

  return null;
}
