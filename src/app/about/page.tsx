import Image from 'next/image';
import ClientNavigationWrapper from '@/components/ClientNavigationWrapper';
import Chatbot from '@/components/Chatbot';
import NavButton from '@/components/NavButton';
import Footer from '@/components/Footer';

import styles from './page.module.css';

export default function AboutPage() {
  return (
    <div className={styles.aboutPage}>
      <ClientNavigationWrapper />
      <main className={styles.contentWrapper}>
        <article className={styles.aboutIntro}>
          <h1 className={styles.introTitle}>About WozPrep</h1>
        </article>

        <section className={styles.missionStatement}>
          <h2>Our Mission</h2>
          <p>
          At WozPrep, we believe test prep should be as unique as the student. Our mission is to replace cookie-cutter strategies with personalized guidance that meets you where you are. Through 1-on-1 mentorship, flexible plans, and a deep commitment to your individual growth, we’re redefining what MCAT tutoring can be—intelligent, compassionate, and tailored entirely to you.
          </p>
        </section>

        <section className={styles.founderSection}>
          <div className={styles.founderImageContainer}>
            <Image
              src="/headshot.jpg"
              alt="Spencer Wozniak, Founder of WozPrep"
              fill
              loading="lazy"
              className={styles.aboutImage}
            />
          </div>
          <div className={styles.founderText}>
            <h2>Meet the Founder</h2>
            <p>
            I’m Spencer Wozniak, the founder of WozPrep and lead MCAT tutor based in San Diego, California. After scoring a 524 on the MCAT, placing me in the 100th percentile nationwide, I created WozPrep to help students not just study harder, but smarter. My academic background in biomedical sciences, psychology, and research gives me a deep understanding of both the test content and the mental performance challenges that come with it.
            </p>
            <p>
            At WozPrep, I personally design every tutoring plan and guide each student through custom strategies for mastering CARS, improving timing, and optimizing section scores. I’ve helped pre-med students across the country, some starting with below-average scores, achieve 90th and 95th percentile results through a data-driven, strategy-focused approach tailored to each individual’s strengths, weaknesses, and schedule. Whether you’re in San Diego or working with me remotely, I’m here to help you reach your full MCAT potential.
            </p>
            <NavButton
              to="https://www.linkedin.com/in/spencerwozniak/"
              label="LinkedIn"
              className={styles.aboutNavButton}
            />
          </div>
        </section>
      </main>
      <Chatbot />
      <Footer />
    </div>
  );
}