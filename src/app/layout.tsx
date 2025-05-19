// src/app/layout.tsx

import './globals.css';
import { Lato, Lora } from 'next/font/google';
import { GoogleAnalytics } from '@next/third-parties/google'

const lato = Lato({
  subsets: ['latin'],
  weight: ['400', '700'],
  style: ['normal', 'italic'],
  variable: '--font-body',
});

const lora = Lora({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  style: ['normal', 'italic'],
  variable: '--font-heading',
});


export const metadata = {
  title: 'Spencer Wozniak | Thinker, Builder, Mentor.',
  description:
    'Welcome to the personal website of Spencer Wozniak',
  icons: {
    icon: '/sw-initials-white.png',
    shortcut: '/sw-initials-white.png',
    apple: '/sw-initials-white.png'
  },
  keywords: [
    'Spencer Wozniak',
    'MCAT tutor San Diego',
    'STEM tutor',
    'AI in healthcare',
    'ABA therapy',
    'Catholic thinker',
    'San Diego tutoring',
    'philosophy and science',
    'web developer San Diego'
  ],
  authors: [{ name: 'Spencer Wozniak', url: 'https://spencerwozniak.com' }],
  creator: 'Spencer Wozniak',
  metadataBase: new URL('https://spencerwozniak.com'),
  openGraph: {
    title: 'Spencer Wozniak',
    description:
      'Explore the work, writing, and worldview of Spencer Wozniak.',
    url: 'https://spencerwozniak.com',
    siteName: 'Spencer Wozniak',
    images: [
      {
        url: 'https://spencerwozniak.com',
        width: 1200,
        height: 630,
        alt: 'Spencer Wozniak',
      },
    ],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Spencer Wozniak',
    description:
      'Explore the work, writing, and worldview of Spencer Wozniak.',
    site: '@spencerwozniak',
    creator: '@spencerwozniak',
    images: ['https://spencerwozniak.com'],
  },
};


export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${lato.variable} ${lora.variable}`}>
      <head>
        {/* ✅ JSON-LD Structured Data for Google Logo */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "Organization",
              "name": "WozPrep",
              "url": "https://www.wozprep.org",
              "logo": "https://www.wozprep.org/wp-logo-circle.png",
              "sameAs": [
                "https://www.linkedin.com/in/spencerwozniak",
                "https://x.com/WozniakSpencer",
                "https://scholar.google.com/citations?user=vBp7kzAAAAAJ&hl=en"
              ]
            })
          }}
        />
      </head>
      <body>{children}</body>
      <GoogleAnalytics gaId="G-5YDYQ636NM" />
    </html>
  );
}
