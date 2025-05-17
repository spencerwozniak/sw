// src/app/mcat/page.tsx (Server Component)

import ArticleBrowser from './ArticleBrowser';
import ClientNavigationWrapper from '@/components/ClientNavigationWrapper';
import Chatbot from '@/components/Chatbot';
import Footer from '@/components/Footer';
import styles from './page.module.css';

export const metadata = {
  title: 'WozPrep Articles – MCAT Prep Information',
  description:
    'Read the latest WozPrep articles about MCAT strategy!',
  keywords:
    'WozPrep press releases, MCAT news, tutoring announcements, MCAT strategy updates, science tutoring news, personalized MCAT prep, San Diego education news, test prep innovations, Spencer Wozniak',
  robots: {
    index: true,
    follow: true,
    nocache: false
  },
  icons: {
    icon: '/wp-logo-circle.png',
    shortcut: '/wp-logo-circle.png',
    apple: '/wp-logo-circle.png'
  },
  alternates: {
    canonical: 'https://www.wozprep.org/articles'
  },
  authors: [
    {
      name: 'Spencer Wozniak',
      url: 'https://www.wozprep.org'
    }
  ],
  openGraph: {
    title: 'WozPrep Articles – MCAT Prep Information',
    description:
      'Stay informed with WozPrep’s latest articles.',
    url: 'https://www.wozprep.org/articles',
    type: 'website',
    images: [
      {
        url: 'https://www.wozprep.org/wp-logo-circle.png', // You can replace with a press-specific banner image
        width: 512,
        height: 512,
        alt: 'WozPrep Logo'
      }
    ]
  },
  twitter: {
    card: 'summary_large_image',
    title: 'WozPrep Articles – MCAT Prep Information',
    description:
      'Explore WozPrep’s latest articles in the world of MCAT tutoring and science education.',
    images: ['https://www.wozprep.org/wp-logo-circle.png'] // Replace if a press-specific OG image is available
  }
};


export default function ArticlePage() {
  return (
    <>
      <ClientNavigationWrapper />
      <div className={styles.articleContainer}>
        <ArticleBrowser itemsPerPage={6}/>
      </div>
      <Chatbot />
      <Footer />
    </>
  );
}
