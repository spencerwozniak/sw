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
            I’ve driven across the country to chase my dreams, built a tutoring business to help others chase theirs, and spent years exploring the intersection of AI and healthcare. My journey is rooted in curiosity, guided by faith, and driven by a deep desire to serve.
          </p>
        </div>
      </section>

      <section className={styles.introSection}>
        <h2>Who I Am</h2>
        <p>
          Originally from Michigan, I packed up my car and drove cross-country to San Diego after college—a lifelong dream fulfilled at 22. I’ve worked as an MCAT tutor, ABA therapist, and AI researcher. These aren’t just roles—they’re reflections of what drives me: mentoring others, building things that matter, and exploring how science, philosophy, and theology shape our world.
        </p>
      </section>

      <section className={styles.introSection}>
        <h2>What I Do</h2>
        <p>
          By day, I help pre-med students crush the MCAT and teach autistic children as an ABA therapist. By night, I’m building modern websites, developing educational tools, and writing about life’s big questions—from neuroscience to God. I believe deeply in intellectual curiosity and emotional presence—being someone others can count on.
        </p>
      </section>

      <section className={styles.introSection}>
        <h2>Let’s Connect</h2>
        <p>
          Whether you want to collaborate, get tutoring help, or just chat about AI, philosophy, or how it feels to stand at the edge of the Pacific, I’d love to hear from you.
        </p>
        <a href="/contact" className={styles.contactButton}>Reach Out</a>
      </section>
    </main>
  );
}
