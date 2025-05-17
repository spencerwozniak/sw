// src/components/ClientNavigationWrapper.tsx
'use client';

import dynamic from 'next/dynamic';

const Navigation = dynamic(() => import('./Navigation'), { ssr: false });

export default function ClientNavigationWrapper() {
  return <Navigation />;
}