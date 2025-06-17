import ClientNavigationWrapper from '@/components/ClientNavigationWrapper';
import TimerPage from './TimerPage';
import Footer from '@/components/Footer';
import Chatbot from '@/components/Chatbot';

export const metadata = {
    title: 'Countdown to the Bay',
    description: 'Join me as I count down the days to the Bay Area.',
    openGraph: {
      title: 'Countdown to the Bay',
      description: 'Join me as I count down the days to the Bay Area.',
      url: 'https://spencerwozniak.com/sf',
      siteName: 'Countdown to the Bay',
      images: [
        {
          url: 'https://spencerwozniak.com/images/sf-background.jpg',
          width: 1200,
          height: 630,
          alt: 'San Francisco background',
        },
      ],
      locale: 'en_US',
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title: 'Countdown to the Bay',
      description: 'Join me as I count down the days to the Bay Area.',
      images: ['https://spencerwozniak.com/images/sf-background.jpg'],
    },
  };
  

export default function Page() {
  return (
    <>
      <ClientNavigationWrapper />

      {/* Fullscreen background with overlay and timer */}
      <TimerPage />

      <Chatbot />
      <Footer />
    </>
  );
}
