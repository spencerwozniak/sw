import { Suspense } from 'react';
import InvoiceClient from './InvoiceClient';
import { metadata as rootMetadata } from '@/app/layout';
import { Container } from '@/components/ui';

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
    <Suspense
      fallback={
        <Container width="text" className="py-24">
          <p className="text-center">Loading...</p>
        </Container>
      }
    >
      <Container as="main" width="text" className="py-10 sm:py-16">
        <InvoiceClient />
      </Container>
    </Suspense>
  );
}
