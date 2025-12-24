// src/app/ClientLayoutWrapper.tsx
'use client';

import { usePathname } from 'next/navigation';
import ClientNavigationWrapper from '@/components/ClientNavigationWrapper';
import Footer from '@/components/Footer';

export default function ClientLayoutWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const invoiceLayout = ['/invoice']
  .some(path => pathname.startsWith(path));


  return (
    <>
      {!invoiceLayout && 
      <>
      <ClientNavigationWrapper />
      <div className="mt-15">
        {children}
      </div>
      <Footer />
      </>
      }

      {invoiceLayout && children}
    </>
  );
}