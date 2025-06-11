// app/about/page.tsx
'use client';

import Image from 'next/image';
import styles from './HomePage.module.css';

export default function HomePage() {
  return (
    <main className={styles.aboutContainer}>
      <section className={styles.heroSection}>
        <div className={styles.headshotWrapper}>
          <Image
            src="/headshot.jpg"
            alt="Spencer Wozniak headshot"
            fill
            className={styles.headshotImage}
          />
        </div>

        <div className={styles.verticalDivider} />

        <div className={styles.heroText}>
          <h1>Spencer Wozniak</h1>
          <h2>Thinker, Builder, Mentor.</h2>
          <p>
            I’m a Catholic Christian, a relentless explorer of ideas and places, and someone who finds deep purpose in guiding others.
            I’ve driven across the country to chase my dreams, built a tutoring business to help students pursue theirs, and I now work one-on-one with kids as a behavioral therapist.
            I spent years exploring the intersection of AI and healthcare through years of hands-on research and work with patients across a wide range of settings.
            The more I’ve studied and served, the more convinced I’ve become that mental health care is in urgent need of a paradigm shift.
            I’m now building <a href='https://www.serelora.com' target='_blank'><strong>a startup to revolutionize how we understand, diagnose, and care for mental health through the power of AI</strong></a>.
          </p>
        </div>
      </section>
    </main>
  );
}
