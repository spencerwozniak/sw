// src/app/layout.tsx

import './globals.css';
import { Open_Sans } from 'next/font/google';
import { GoogleAnalytics } from '@next/third-parties/google'

const openSans = Open_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '700'],
  style: ['normal', 'italic'],
  variable: '--font-body',
});

export const metadata = {
  title: 'WozPrep – Expert MCAT and Science Tutoring',
  description: 'WozPrep offers expert, personalized MCAT and science tutoring to help you master complex topics, boost your score, and reach your goals.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={openSans.variable}>
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
      <GoogleAnalytics gaId="G-RHT79B9JCQ" />
    </html>
  );
}
