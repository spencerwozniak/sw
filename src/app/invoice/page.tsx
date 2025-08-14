import { Suspense } from 'react';
import InvoiceClient from './InvoiceClient';
import { metadata as rootMetadata } from '@/app/layout';

export const metadata = {
  ...rootMetadata,
  title: 'Invoice',
  openGraph: {
    ...rootMetadata.openGraph,
    title: 'Invoice',
  },
  twitter: {
    ...rootMetadata.twitter,
    title: 'Invoice',
  },
};

export default function InvoicePage() {
  return (
  <Suspense fallback={<div className="flex flex-col justify-center items-center text-center min-h-[90vh] py-10 px-4 sm:px-6 lg:px-8 mt-10">Loading...</div>}>
    <section className='mt-10'>
      <InvoiceClient />
    </section>
  </Suspense>
  );
}