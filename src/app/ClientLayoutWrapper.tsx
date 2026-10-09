'use client';

import { usePathname } from 'next/navigation';
import { MotionConfig } from 'framer-motion';
import ClientNavigationWrapper from '@/components/ClientNavigationWrapper';
import Footer from '@/components/Footer';

export default function ClientLayoutWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const invoiceLayout = ['/invoice'].some((path) => pathname.startsWith(path));
  return (
    <MotionConfig reducedMotion="user">
      {!invoiceLayout && (
        <>
          <ClientNavigationWrapper />
          <div className="page-content flex-1 pt-[var(--nav-h)]">{children}</div>
          <div className="page-content">
            <Footer />
          </div>
        </>
      )}
      {invoiceLayout && children}
    </MotionConfig>
  );
}
