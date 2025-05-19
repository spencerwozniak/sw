// src/app/page.tsx
import ClientNavigationWrapper from '@/components/ClientNavigationWrapper';
import HomePage from './HomePage';
import Footer from '@/components/Footer';
import Chatbot from '@/components/Chatbot';
import styles from './page.module.css';

export default function Home() {
  return (
    <div className={styles.homePage}>
      <ClientNavigationWrapper />
      <HomePage />
      <Chatbot />
      <Footer />
    </div>
  );
}
