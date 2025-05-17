import ClientNavigationWrapper from '@/components/ClientNavigationWrapper';
import Chatbot from '@/components/Chatbot';
import ContactForm from '@/components/ContactForm';
import Footer from '@/components/Footer';
import MapSection from '@/components/MapSection';
import styles from './page.module.css';

export const metadata = {
  title: 'Contact Us | WozPrep MCAT Tutoring',
  description: 'Get in touch with WozPrep for expert MCAT tutoring in San Diego. Reach out for free consultations, personalized study plans, and score improvement strategies.',
  keywords: [
    'contact WozPrep',
    'MCAT tutor San Diego',
    'MCAT prep consultation',
    'WozPrep tutoring',
    'free MCAT consultation',
    'personalized MCAT help',
    'MCAT test prep San Diego'
  ],
  alternates: {
    canonical: 'https://www.wozprep.org/contact',
  },
  icons: {
    icon: '/wp-logo-circle.png'
  },
  openGraph: {
    title: 'Contact | WozPrep MCAT Tutoring',
    description: 'Reach out to WozPrep for personalized MCAT tutoring plans, free consultations, and test prep support in San Diego or online.',
    url: 'https://www.wozprep.org/contact',
    type: 'website',
    images: [
      {
        url: '/wp-logo-circle.png',
        alt: 'WozPrep Contact Page',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
  },
};

export default function ContactPage() {
  return (
    <div className={styles.contactUsPage}>
      <ClientNavigationWrapper />

      <div className={styles.contentWrapper}>
        <MapSection />
      </div>

      <div className={styles.contactFormSection}>
        <ContactForm />
      </div>
      <Chatbot />
      <Footer />
    </div>
  );
}