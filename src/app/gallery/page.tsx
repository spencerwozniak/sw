// src/app/mcat/page.tsx (Server Component)
import ClientNavigationWrapper from '@/components/ClientNavigationWrapper';
import Chatbot from '@/components/Chatbot';
import Footer from '@/components/Footer';
import Gallery from './Gallery';
import styles from './page.module.css';

export default function GalleryPage() {

  return (
    <div className={styles.galleryPage}>
      <ClientNavigationWrapper />
      <Gallery />
      <Chatbot />
      <Footer />
    </div>
  );
}

