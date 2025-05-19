'use client';

import ClientNavigationWrapper from '@/components/ClientNavigationWrapper';
import Chatbot from '@/components/Chatbot';
import Footer from '@/components/Footer';
import styles from './page.module.css';

import Image from 'next/image';

import {
  FaLinkedin,
  FaGithub,
  FaGraduationCap,
  FaYoutube,
  FaBook,
  FaEnvelope,
  FaTwitter,
  FaInstagram
} from 'react-icons/fa';

export default function ContactPage() {
  return (
    <div className={styles.contactUsPage}>
      <ClientNavigationWrapper />

      <main className={styles.main}>
        <h1 className={styles.title}>Let's Connect</h1>
        <div className={styles.cardContainer}>
          <a href="https://www.linkedin.com/in/spencerwozniak/" target="_blank" rel="noopener noreferrer" className={styles.card}>
            <FaLinkedin size={24} />
            <div className={styles.cardContent}>
              <h2>LinkedIn</h2>
              <p>Connect professionally</p>
            </div>
          </a>
          <a href="mailto:spencerwozniak1@gmail.com" className={styles.card}>
            <FaEnvelope size={24} />
            <div className={styles.cardContent}>
              <h2>Email</h2>
              <p>Shoot me an email</p>
            </div>
          </a>
          <a href="https://wozprep.org/contact" target="_blank" rel="noopener noreferrer" className={styles.card}>
          <Image
            src="/wp-logo-white.png"
            alt="WozPrep Logo"
            width={30}
            height={25}
            className={styles.iconImage}
          />
            <div className={styles.cardContent}>
              <h2>WozPrep</h2>
              <p>Reach out for tutoring</p>
            </div>
          </a>
        </div>

        <h1 className={styles.title}>Socials</h1>
        <div className={styles.cardContainer}>
          
          <a href="https://github.com/spencerwozniak" target="_blank" rel="noopener noreferrer" className={styles.card}>
            <FaGithub size={24} />
            <div className={styles.cardContent}>
              <h2>GitHub</h2>
              <p>See my code</p>
            </div>
          </a>
          <a href="https://www.researchgate.net/profile/Spencer-Wozniak" target="_blank" rel="noopener noreferrer" className={styles.card}>
            <FaGraduationCap size={24} />
            <div className={styles.cardContent}>
              <h2>ResearchGate</h2>
              <p>View my publications</p>
            </div>
          </a>
          <a href="https://www.youtube.com/@spencerwozniak" target="_blank" rel="noopener noreferrer" className={styles.card}>
            <FaYoutube size={24} />
            <div className={styles.cardContent}>
              <h2>YouTube</h2>
              <p>Watch my videos</p>
            </div>
          </a>
          <a href="https://www.goodreads.com/user/show/180143299-spencer-wozniak" target="_blank" rel="noopener noreferrer" className={styles.card}>
            <FaBook size={24} />
            <div className={styles.cardContent}>
              <h2>Goodreads</h2>
              <p>Track my reads</p>
            </div>
          </a>

          <a href="https://x.com/WozniakSpencer" target="_blank" rel="noopener noreferrer" className={styles.card}>
            <FaTwitter size={24} />
            <div className={styles.cardContent}>
              <h2>Twitter (X)</h2>
              <p>Read my thoughts</p>
            </div>
          </a>
          <a href="https://instagram.com/spencer.wozniak" target="_blank" rel="noopener noreferrer" className={styles.card}>
            <FaInstagram size={24} />
            <div className={styles.cardContent}>
              <h2>Instagram</h2>
              <p>See my life in photos</p>
            </div>
          </a>
        </div>
      </main>

      <Chatbot />
      <Footer />
    </div>
  );
}
