// src/app/page.tsx
import {
  FaChalkboardTeacher,
  FaBookOpen,
  FaBrain,
  FaUserGraduate,
  FaMicroscope,
  FaRegSmile
} from 'react-icons/fa';

import Image from 'next/image';

// src/app/page.tsx
import ClientNavigationWrapper from '@/components/ClientNavigationWrapper';
import Footer from '@/components/Footer';
import Chatbot from '@/components/Chatbot';
import ContactForm from '@/components/ContactForm';
import NavButton from '@/components/NavButton';
import LocationsSection from '@/components/LocationsSection';

import styles from './page.module.css';
import ArticleBrowser from './articles/ArticleBrowser';

export const metadata = {
  title: 'WozPrep – Expert MCAT and Science Tutoring',
  description:
    'WozPrep offers expert, personalized MCAT and science tutoring to help you master complex topics, boost your score, and reach your goals.',
  keywords:
    'MCAT tutoring, organic chemistry tutor, premed tutoring, science tutoring, personalized MCAT prep, private MCAT tutor, San Diego tutoring, STEM tutoring, one-on-one MCAT help, MCAT strategy coaching, biochemistry tutor, test prep expert',
  robots: {
    index: true,
    follow: true,
    nocache: false
  },
  icons: {
    icon: '/wp-logo-circle.png',
    shortcut: '/wp-logo-circle.png',
    apple: '/wp-logo-circle.png'
  },
  alternates: {
    canonical: 'https://www.wozprep.org'
  },
  authors: [
    {
      name: 'Spencer Wozniak',
      url: 'https://www.wozprep.org'
    }
  ],
  openGraph: {
    title: 'WozPrep – Expert MCAT and Science Tutoring',
    description:
      'WozPrep offers expert, personalized MCAT and science tutoring to help you master complex topics, boost your score, and reach your goals.',
    url: 'https://www.wozprep.org',
    type: 'website',
    images: [
      {
        url: 'https://www.wozprep.org/wp-logo-circle.png',
        width: 512,
        height: 512,
        alt: 'WozPrep Logo'
      }
    ]
  },
  twitter: {
    card: 'summary_large_image',
    title: 'WozPrep – Expert MCAT and Science Tutoring',
    description:
      'Personalized MCAT prep and science tutoring for premed success.',
    images: ['https://www.wozprep.org/wp-logo-circle.png']
  }
};

export default function HomePage() {
  return (
    <div className={styles.homePage}>
      <ClientNavigationWrapper />
      <main className={styles.homeMain}>
        <section className={styles.heroSection}>
          <div className={styles.heroImageWrapper}>
            <Image
              src="/purple-clouds-2.jpg"
              alt="Purple clouds background"
              fill
              priority
              className={styles.heroImage}
              style={{ objectFit: 'cover' }}
            />
          </div>
          <div className={styles.heroContent}>
            <h1 className={styles.heroHeading}>
              <span className={styles.welcomeTo}>WELCOME TO</span>
              <span className={styles.wozprep}>WOZPREP</span>
            </h1>
            <h2 className={styles.heroSubheading}>
              Personalized MCAT & STEM Tutoring in San Diego
            </h2>
            <div className={styles.heroButtons}>
              <NavButton label="Practice" to="/mcat/practice" className={styles.resourcesButton} />
              <NavButton label="Free Consultation" to="#book" className={styles.bookButton} />
            </div>
          </div>
        </section>

        <section className={styles.infoSection}>
          <div className={styles.infoColumns}>
            {[{
              icon: <FaChalkboardTeacher />,
              title: 'WHO',
              text: `I’m Spencer—a one-person tutoring service offering one-on-one MCAT and STEM tutoring without the inflated rates or generic lesson plans of larger companies. Just high-impact, personalized prep from a recent 100th percentile MCAT scorer who’s walked the same path you’re on.`
            }, {
              icon: <FaBookOpen />,
              title: 'WHAT',
              text: `I offer private, in-person MCAT tutoring, support for tough science classes, and full-length study plans tailored to your timeline and goals. I also teach you how to use study tools like Anki, AI tutors, and practice diagnostics effectively—no two students get the same plan.`
            }, {
              icon: <FaBrain />,
              title: 'WHY',
              text: `Because effective studying isn't about brute force. I teach you how to break down passages, close knowledge gaps, and build mental stamina with focused strategies and consistent feedback. I want you to walk into test day feeling sharp, calm, and confident.`
            }].map(({ icon, title, text }) => (
              <div key={title} className={styles.infoColumn}>
                <div className={styles.iconHeading}>
                  <div className={styles.iconContainer}>
                    <span className={styles.infoIcon}>{icon}</span>
                  </div>
                  <h3 className={styles.headingText}>{title}</h3>
                </div>
                <p>{text}</p>
              </div>
            ))}
          </div>
        </section>

        <section className={styles.servicesSection}>
          <div className={styles.wpbWrapper}>
            <span className={styles.textSeparator}>
              <span className={styles.separatorWrapper}>
                <span className={styles.mkdLineBefore}></span>
                <span className={styles.servicesHeading}>What I Offer</span>
                <span className={styles.mkdLineAfter}></span>
              </span>
            </span>
            <div className={styles.wpbTextColumn}>
              <div className={styles.wpbWrapper}>
                <h4>Expert Support Tailored to You</h4>
              </div>
            </div>
          </div>

          <div className={styles.servicesColumns}>
  {[
    {
      icon: <FaUserGraduate />,
      title: 'MCAT PREP',
      text: `I offer one-on-one tutoring for all MCAT sections: CARS, Chem/Phys, Bio/Biochem, and Psych/Soc. We’ll build a tailored study plan, focus on high-yield concepts, analyze practice tests, and develop test-taking endurance with smart strategies that actually stick.`,
      link: '/mcat',
      label: 'Explore MCAT Prep'
    },
    {
      icon: <FaMicroscope />,
      title: 'STEM TUTORING',
      text: `I tutor challenging science subjects like anatomy, biology, biochemistry, chemistry, physics, and psychology—especially for pre-health students. I break down complex topics into understandable chunks using visuals, analogies, and active recall techniques.`,
      link: '/stem',
      label: 'Explore STEM Tutoring'
    },
    {
      icon: <FaRegSmile />,
      title: 'MENTORSHIP',
      text: `Whether you're battling burnout, test anxiety, or imposter syndrome, I support you holistically. I’ll help you set goals, stay motivated, and overcome roadblocks—offering help beyond just academics so you can stay mentally strong throughout the process.`,
      link: '/about',
      label: 'More About Me'
    }
  ].map(({ icon, title, text, link, label }) => (
    <div key={title} className={styles.servicesColumn}>
      <div className={styles.servicesIconHeading}>
        <div className={styles.servicesIconContainer}>
          <span className={styles.servicesIcon}>{icon}</span>
        </div>
        <h3 className={styles.servicesHeadingText}>{title}</h3>
      </div>
      <p>{text}</p>
      <NavButton to={link} label={label} className={styles.homeButton}/>
    </div>
  ))}
</div>

        </section>

        <div style={{ paddingTop: 40, padding: '2rem' }}>
          <ArticleBrowser />
        </div>

        <div style={{ backgroundColor: '#f9f9f9' }}>
          <LocationsSection />
        </div>

        <section id="book">
          <ContactForm />
        </section>
      </main>
      <Chatbot />
      <Footer />
    </div>
  );
}
