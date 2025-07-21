// src/app/page.tsx
import HomePage from './HomePage';
import Chatbot from '@/components/Chatbot';
import styles from './page.module.css';

export default function Home() {
  return (
    <div className={styles.homePage}>
      <HomePage />
      <Chatbot />
    </div>
  );
}
