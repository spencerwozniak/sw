// Full revised version of /mcat page with alternating image/text layout

import ClientNavigationWrapper from '@/components/ClientNavigationWrapper';
import Chatbot from '@/components/Chatbot';
import NavButton from '@/components/NavButton';
import ContactForm from '@/components/ContactForm';
import Footer from '@/components/Footer';
import Image from 'next/image';
import DocumentEmbed from '@/components/DocumentEmbed';
import LocationsSection from '@/components/LocationsSection';
import styles from './page.module.css';

export const metadata = {
  title: 'MCAT Tutoring San Diego | 100th Percentile Scorer | WozPrep',
  description:
    'San Diego’s top MCAT tutoring program led by a 100th percentile scorer. One-on-one sessions, expert CARS strategy, and a free question bank. Trusted by UCSD and SDSU students.',
  keywords: [
    'MCAT tutoring San Diego',
    'MCAT tutor UCSD',
    'MCAT tutoring SDSU',
    'MCAT prep La Jolla',
    'CARS practice passages',
    'Free MCAT question bank',
    'premed tutoring San Diego',
    'private MCAT tutoring',
    'STEM tutor San Diego',
    'San Diego MCAT strategy coach'
  ],
  robots: { index: true, follow: true, nocache: false },
  icons: {
    icon: '/wp-logo-circle.png',
    shortcut: '/wp-logo-circle.png',
    apple: '/wp-logo-circle.png'
  },
  alternates: { canonical: 'https://www.wozprep.org/mcat' },
  openGraph: {
    title: 'MCAT Tutoring San Diego | WozPrep',
    description: 'Master the MCAT with personalized tutoring and a free question bank. Trusted by San Diego premeds at UCSD, SDSU, and beyond.',
    url: 'https://www.wozprep.org/mcat',
    type: 'website',
    images: [{ url: 'https://www.wozprep.org/wp-logo-circle.png', width: 512, height: 512 }]
  },
  twitter: {
    card: 'summary_large_image',
    title: 'MCAT Tutoring in San Diego | WozPrep',
    description: 'One-on-one MCAT tutoring with free practice passages and CARS strategy. Trusted by premeds across San Diego.',
    images: ['https://www.wozprep.org/wp-logo-circle.png']
  }
};

export default function MCATPage() {
  return (
    <div className={styles.mcatPage}>
      <ClientNavigationWrapper />
      <main className={styles.mainContent}>
      <section className={styles.heroSection}>
        <div className={styles.heroContent}>
          <h1>MCAT Tutoring in San Diego</h1>
          <p>One-on-one tutoring from a 100th percentile scorer. No middleman. No fluff. Just affordable, effective prep that meets you where you are—led by someone who’s been through it too.</p>
          <NavButton to="#book" label="Book a Free Consultation" className={styles.ctaButton} />
        </div>
      </section>

      <section className={styles.section}>
        <div className={styles.splitContent}>
          <div className={styles.splitImage}>
            <Image src="/images/metabolism.jpg" alt="Tutoring UCSD students in San Diego" width={520} height={320} className={styles.roundedShadow} />
          </div>
          <div className={styles.splitText}>
            <h2>What Makes WozPrep Different?</h2>
            <ul className={styles.features}>
              <li><strong>100th Percentile Scorer:</strong> I scored in the top 1% on the MCAT just last year. I know what it takes to succeed—and I’ll help you get there, too.</li>
              <li><strong>One-Person Operation:</strong> This isn’t a corporate tutoring service. When you reach out, you’re working with me directly—no inflated rates, no generic plans.</li>
              <li><strong>Affordable & Transparent:</strong> My rates are lower than major prep companies, and you get personalized help that’s actually worth your time and money.</li>
              <li><strong>Personalized Support:</strong> I build your study plan, teach the content, track your progress, and adjust as you improve. You’re never just another client—I’m with you the whole way.</li>
            </ul>
          </div>
          
        </div>
      </section>

      <section className={styles.sectionAlt}>
        <div className={styles.splitContent}>
          <div className={styles.splitText}>
            <h2>Personalized Plans, Not Templates</h2>
            <p>
              Because I’m not part of a big tutoring company, I don’t follow rigid templates or one-size-fits-all advice. When you work with me, you’re not getting a cookie-cutter curriculum or recycled slide deck. You’re getting a partner who builds every lesson around your unique needs, strengths, and goals. I design a study plan for each student from scratch, and I evolve the plan as you go. 
            </p>
            <br />
            <strong>
              ↓ Scroll down to see an example of a real custom study plan I created for one specific student ↓
            </strong>
          </div>
          <div className={styles.splitImage}>
            <Image
              src="/images/tutoring.jpg"
              alt="Tutoring UCSD students in San Diego"
              width={520}
              height={320}
              className={styles.roundedShadow}
            />
          </div>
        </div>
      </section>
    
      <DocumentEmbed
        title="EXAMPLE STUDY PLAN"
        description="See an example of a personalized study plan made for a WozPrep student."
        link="https://docs.google.com/document/d/1zxpnDE5dCrrIGM63Gk_LwEGRxRN9F7Y4pH_LBqBIsQU/edit?usp=sharing"
        embedSrc="https://docs.google.com/document/d/1zxpnDE5dCrrIGM63Gk_LwEGRxRN9F7Y4pH_LBqBIsQU/preview"
      />

      <section className={styles.sectionAlt}>
        <div className={styles.splitContent}>
          <div className={styles.splitImage}>
            <Image src="/images/mcat520.jpg" alt="Student celebrating MCAT score increase" width={520} height={320} className={styles.roundedShadow} />
          </div>
          <div className={styles.splitText}>
            <h2>Serious Score Gains</h2>
            <p>Students I’ve worked with have improved by as much as 25 points. We don’t just review flashcards—we dig into real MCAT-style questions together, analyze your results, and modify your study plan as we go. I help you find your blind spots and build confidence in your strengths.</p>
          </div>
        </div>
      </section>

      <section className={styles.section}>
        <div className={styles.splitContent}>
          <div className={styles.splitText}>
            <h2>Free, Realistic MCAT Practice Tools</h2>
            <p>WozPrep includes free access to an AAMC-style interface with custom-written MCAT questions—designed to help you build testing endurance and learn the MCAT’s logic. My CARS passages are written to teach inference and tone—things most prep books barely touch.</p>
            <NavButton to="/mcat/practice" label="Try Free Questions" className={styles.ctaButton} />
          </div>
          <div className={styles.splitImage}>
            <Image src="/images/cog-dis.jpg" alt="Student practicing CARS passages on laptop" width={520} height={320} className={styles.roundedShadow} />
          </div>
        </div>
      </section>

      <section className={styles.sectionAlt}>
        <div className={styles.splitContent}>
          <div className={styles.splitImage}>
            <Image src="/images/cars.jpg" alt="Focused MCAT section study with notes" width={520} height={320} className={styles.roundedShadow} />
          </div>
          <div className={styles.splitText}>
            <h2>Section-by-Section Support</h2>
            <ul className={styles.features}>
              <li><strong>CARS:</strong> Learn to annotate like the AAMC wants—developing logic, tone recognition, and inference skills.</li>
              <li><strong>CP/BB:</strong> I simplify the toughest topics—biochem, orgo, physiology—using real diagrams and test-driven drills.</li>
              <li><strong>Psych/Soc:</strong> We’ll focus on what’s actually tested, using memory techniques that stick.</li>
            </ul>
          </div>
        </div>
      </section>

        <LocationsSection type="mcat" />

        <section id="book">
          <ContactForm />
        </section>
      </main>
      <Chatbot />
      <Footer />
    </div>
  );
}