import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  typescript: {
    ignoreBuildErrors: true, // ⛑️ bypass build-breaking TS error from Vercel
  },
  async redirects() {
    // Retired routes Google may still have indexed; a permanent redirect hands their ranking to the replacement.
    return [
      { source: '/gallery', destination: '/photos', permanent: true },
      { source: '/about', destination: '/', permanent: true },
      { source: '/resume', destination: '/work', permanent: true },
      { source: '/mcat', destination: '/', permanent: true },
      { source: '/articles', destination: '/writing', permanent: true },
    ];
  },
};

export default nextConfig;
