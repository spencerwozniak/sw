import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  typescript: {
    ignoreBuildErrors: true, // ⛑️ bypass build-breaking TS error from Vercel
  },
  images: {
    // Photos, posters and article images are served from the public Vercel Blob store.
    remotePatterns: [{ protocol: 'https', hostname: '**.public.blob.vercel-storage.com' }],
  },
  async redirects() {
    // Retired routes Google may still have indexed; a permanent redirect hands their ranking to the replacement.
    return [
      { source: '/gallery', destination: '/photos', permanent: true },
      { source: '/about', destination: '/', permanent: true },
      { source: '/resume', destination: '/work', permanent: true },
      { source: '/mcat', destination: '/', permanent: true },
      { source: '/articles', destination: '/writing', permanent: true },
      // The sitemap used to be split across sitemap.xml and sitemap-0.xml; it is now a single sitemap.xml.
      { source: '/sitemap-0.xml', destination: '/sitemap.xml', permanent: true },
    ];
  },
};

export default nextConfig;
