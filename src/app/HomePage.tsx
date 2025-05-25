// app/about/page.tsx
'use client';

import Image from 'next/image';
import styles from './HomePage.module.css';
import NavButton from '@/components/NavButton';

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
            I’ve driven across the country to chase my dreams, built a tutoring business to help students pursue theirs, and now spend my days working one-on-one with kids, helping them grow in confidence, communication, and independence.
            I have spent years exploring the intersection of AI and healthcare, and I hope to apply it to transform patient care as a future physician.
            My journey is rooted in curiosity, guided by faith, and driven by a deep desire to serve.
          </p>
          <div className={styles.heroButtons}>
            <NavButton className={styles.heroButton} label='Read my Story' to='/writing/behold-i-make-all-things-new' />
            <NavButton className={styles.heroButton} label='See my Resume' to='/resume' />
          </div>
        </div>
      </section>
    </main>
  );
}
