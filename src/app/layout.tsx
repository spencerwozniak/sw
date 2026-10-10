// src/app/layout.tsx

import "./globals.css";
import type { Metadata } from "next";
import { Lato, Lora } from "next/font/google";
import { GoogleAnalytics } from "@next/third-parties/google";
import { ThemeProvider } from "@/contexts/ThemeContext";

import ClientLayoutWrapper from "./ClientLayoutWrapper";

const lato = Lato({
  subsets: ["latin"],
  weight: ["400", "700"],
  style: ["normal", "italic"],
  variable: "--font-body",
});

const lora = Lora({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  style: ["normal", "italic"],
  variable: "--font-heading",
});

const SITE_URL = "https://www.spencerwozniak.com";
const DESCRIPTION =
  "Spencer Wozniak is a Catholic Christian and healthtech entrepreneur, co-founder and CTO of Serelora, building reliable, explainable software for healthcare.";
const SAME_AS = [
  "https://www.linkedin.com/in/spencerwozniak",
  "https://github.com/spencerwozniak",
  "https://x.com/WozniakSpencer",
  "https://instagram.com/spencer.wozniak",
  "https://scholar.google.com/citations?user=vBp7kzAAAAAJ&hl=en",
];

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "Spencer Wozniak",
    template: "%s | Spencer Wozniak",
  },
  description: DESCRIPTION,
  applicationName: "Spencer Wozniak",
  icons: {
    icon: "/sw-brand-logo.png",
    shortcut: "/sw-brand-logo.png",
    apple: "/sw-brand-logo.png",
  },
  authors: [{ name: "Spencer Wozniak", url: SITE_URL }],
  creator: "Spencer Wozniak",
  openGraph: {
    title: "Spencer Wozniak",
    description: DESCRIPTION,
    url: SITE_URL,
    siteName: "Spencer Wozniak",
    images: [
      {
        url: "/headshot-square.jpg",
        width: 1700,
        height: 1700,
        alt: "Spencer Wozniak",
      },
    ],
    locale: "en_US",
    type: "profile",
  },
  twitter: {
    card: "summary",
    title: "Spencer Wozniak",
    description: DESCRIPTION,
    site: "@WozniakSpencer",
    creator: "@WozniakSpencer",
    images: ["/headshot-square.jpg"],
  },
};

// Person + WebSite: the WebSite name is what Google shows as the site name above the result.
const SITE_JSON_LD = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Person",
      "@id": `${SITE_URL}/#person`,
      name: "Spencer Wozniak",
      url: SITE_URL,
      image: `${SITE_URL}/headshot-square.jpg`,
      description: DESCRIPTION,
      jobTitle: "Co-Founder & CTO",
      worksFor: { "@type": "Organization", name: "Serelora", url: "https://www.serelora.com" },
      alumniOf: { "@type": "CollegeOrUniversity", name: "Michigan State University" },
      sameAs: SAME_AS,
    },
    {
      "@type": "WebSite",
      "@id": `${SITE_URL}/#website`,
      url: SITE_URL,
      name: "Spencer Wozniak",
      alternateName: "spencerwozniak.com",
      publisher: { "@id": `${SITE_URL}/#person` },
      inLanguage: "en-US",
    },
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${lato.variable} ${lora.variable}`} suppressHydrationWarning>
      <head>
        {/* No-flash theme script: saved choice wins, otherwise OS preference */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){var r=document.documentElement,t=null;try{t=localStorage.getItem('theme')}catch(e){}if(t!=='light'&&t!=='dark'){t=window.matchMedia&&window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light'}r.setAttribute('data-theme',t);r.style.colorScheme=t})();`,
          }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(SITE_JSON_LD).replace(/</g, "\\u003c") }}
        />
        <link
          href="https://assets.calendly.com/assets/external/widget.css"
          rel="stylesheet"
        />
      </head>
      <body>
        <ThemeProvider>
          <ClientLayoutWrapper>{children}</ClientLayoutWrapper>
        </ThemeProvider>
      </body>

      <GoogleAnalytics gaId="G-5YDYQ636NM" />
    </html>
  );
}
