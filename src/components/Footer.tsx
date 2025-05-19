'use client';

import Image from 'next/image';
import Link from 'next/link';
import styles from './Footer.module.css';

import SocialIcons from './SocialIcons';

import LogoWhite from '../../public/sw-full-signature-white.png'; // Make sure this image is in /public
import navigationData from './navigationData.json';

const Footer: React.FC = () => {
  return (
    <div className={styles.footerWrapper}>
      <footer className={styles.footer}>
        <div className={styles.footerContent}>

          {/* Logo and Social Icons */}
          <div className={styles.footerWidget}>
            <div className={styles.footerLogo}>
              <Link className={styles.footerLogoLink} href="/">
                <Image src={LogoWhite} alt="Spencer Wozniak Signature" className="img-fluid" width={400} height={100} />
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
            <p>&copy; 2025 WozSites</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Footer;
