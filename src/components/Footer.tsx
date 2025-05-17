'use client';

import Image from 'next/image';
import Link from 'next/link';
import styles from './Footer.module.css';

import LogoWhite from '../../public/wp-logo-white.png'; // Make sure this image is in /public
import navigationData from './navigationData.json';

const Footer: React.FC = () => {
  return (
    <div className={styles.footerWrapper}>
      <footer className={styles.footer}>
        <div className={styles.footerContent}>

          {/* Logo and Social Icons */}
          <div className={styles.footerWidget}>
            <div className={styles.footerLogo}>
              <Link href="/">
                <Image src={LogoWhite} alt="Zo Logo" className="img-fluid" width={250} height={100} />
              </Link>
            </div>

            <div className={styles.footerSocial}>
              <p>
              Personalized MCAT & STEM Tutoring in San Diego
              </p>
            </div>
          </div>

          {/* Navigation Links */}
          <div className={styles.footerMenu}>
            <ul>
              <li><Link href="/">HOME</Link></li>
              {navigationData.map((item, index) => (
                <li key={index}>
                  <Link href={item.link}>{item.label}</Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Copyright */}
          <div className={styles.copyright}>
            <p>&copy; 2025 WozSites</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Footer;
