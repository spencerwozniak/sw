'use client';

import { GoogleAnalytics } from '@next/third-parties/google';
import { usePathname } from 'next/navigation';

/** Google Analytics for the public site only: admin pages are never reported. */
export function AnalyticsGate({ gaId }: { gaId: string }) {
  const pathname = usePathname();
  if (pathname.startsWith('/admin')) return null;
  return <GoogleAnalytics gaId={gaId} />;
}
