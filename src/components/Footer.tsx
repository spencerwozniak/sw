'use client';

import Image from 'next/image';
import Link from 'next/link';
import styles from './Footer.module.css';
import { useTheme } from '@/contexts/ThemeContext';

import SocialIcons from './SocialIcons';

import LogoWhite from '../../public/sw-full-signature-white.png';
import LogoBlack from '../../public/sw-full-signature-black.png';
import navigationData from '@/data/navigationData.json';

const Footer: React.FC = () => {
  const { theme } = useTheme();
  return (
    <div className={styles.footerWrapper}>
      <footer className={styles.footer}>
        <div className={styles.footerContent}>

          {/* Logo and Social Icons */}
          <div className={styles.footerWidget}>
            <div className={styles.footerLogo}>
              <Link className={styles.footerLogoLink} href="/">
                <Image 
                  src={theme === 'dark' ? LogoWhite : LogoBlack} 
                  alt="Spencer Wozniak Signature" 
                  className="img-fluid" 
                  width={400} 
                  height={100} 
                />
              </Link>
            </div>

            <div className={styles.footerSocial}>
              <SocialIcons />
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
            <p>&copy; 2025 <strong>Spencer Wozniak</strong></p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Footer;
