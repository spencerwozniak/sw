import { Suspense } from 'react';
import InvoiceClient from './InvoiceClient';

export default function InvoicePage() {
  return (
  <Suspense fallback={<div className="flex flex-col justify-center items-center text-center min-h-[90vh] py-10 px-4 sm:px-6 lg:px-8 mt-10">Loading...</div>}>
    <section className='mt-20'>
      <InvoiceClient />
    </section>
  </Suspense>
  );
}