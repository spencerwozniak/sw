import ClientNavigationWrapper from '@/components/ClientNavigationWrapper';
import TimerPage from './TimerPage';
import Footer from '@/components/Footer';
import Chatbot from '@/components/Chatbot';

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
