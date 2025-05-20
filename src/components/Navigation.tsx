'use client';

import { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import MenuButton from './MenuButton';
import NavButton from './NavButton';
import styles from './Navigation.module.css';
import navigationData from '@/data/navigationData.json';
import articles from '@/data/articles.json';
import SocialIcons from './SocialIcons';

import { FaLinkedin } from 'react-icons/fa';

const mobileThreshold = 960;

const Navigation: React.FC = () => {
  const router = useRouter();
  const pathname = usePathname();
  const [isSubMenuOpen, setIsSubMenuOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [isHydrated, setIsHydrated] = useState(false);

  const handleRandomEssay = () => {
    const randomIndex = Math.floor(Math.random() * articles.length);
    const randomArticle = articles[randomIndex];
    if (randomArticle?.id) {
      router.push(`/writing/${randomArticle.id}`);
    }
  };

  useEffect(() => {
    setIsHydrated(true); // This ensures the first render matches SSR HTML

    const handleResize = () => {
      const isNowMobile = window.innerWidth < mobileThreshold;
      setIsMobile(isNowMobile);
      if (!isNowMobile) setIsSubMenuOpen(false);
    };

    handleResize(); // Set initial value after hydration
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const toggleSubMenu = () => {
    setIsSubMenuOpen((prev) => !prev);
  };

  if (!isHydrated) {
    // Return nothing or minimal skeleton until hydration is complete to avoid mismatch
    return null;
  }

  return (
    <header className={styles.navigationHeader}>
      <div className={styles.navContainer}>
        <div className={styles.headerLeft}>
          {isMobile && (
            <div className={styles.navMenuButton}>
              <MenuButton onClick={toggleSubMenu} />
            </div>
          )}
          <div
            onClick={() => {
              if (pathname === '/') {
                window.location.reload();
              } else {
                router.push('/');
              }
            }}
            className={styles.headerLogo}
            style={{ cursor: 'pointer' }}
          >
            <Image
              src="/sw-full-signature-white.png"
              alt="Spencer Wozniak Signature"
              width={120}
              height={50}
              className={styles.logo}
              priority
            />
          </div>
        </div>

        <nav className={styles.headerNav}>
          <ul className={styles.navMainLinks}>
            {navigationData.map((item, index) => (
              <li key={index} className={styles.navItem}>
                <div className={styles.navItemWrapper}>
                  <Link href={item.link} className={styles.navLink}>
                    {item.label}
                  </Link>
                  {index < navigationData.length - 1 && <span className={styles.navSeparator}></span>}
                  {item.submenu && (
                    <ul className={styles.submenu}>
                      {item.submenu.map((subItem, subIndex) => (
                        <li key={subIndex} className={styles.submenuItem}>
                          <Link href={subItem.link} className={styles.submenuLink}>
                            {subItem.label}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </nav>

        {isMobile && (
          <div className={`${styles.dropdownMenu} ${isSubMenuOpen ? styles.open : styles.closed}`}>
            <div className={styles.dropdownInner}>
            {navigationData.map((item, index) => (
              <div key={index} className={styles.dropdownSectionWrapper}>
              <section className={styles.navColumn}>
                <Link href={item.link} className={styles.navColumnHeading}>
                  <h2>{item.label}</h2>
                </Link>
                {item.submenu && (
                  <div className={styles.mobileSubmenu}>
                    {item.submenu.map((subItem, subIndex) => (
                      <Link key={subIndex} href={subItem.link} className={styles.mobileSubmenuLink}>
                        {subItem.label}
                      </Link>
                    ))}
                  </div>
                )}
              </section>
              {index < navigationData.length - 1 && <hr className={styles.navDivider} />}
            </div>
            ))}
            </div>
            <SocialIcons />
          </div>
        )}

        <div className={styles.headerRight}>
          <a
            className={styles.headerContactLink}
            target="_blank"
            href="https://www.linkedin.com/in/spencerwozniak/"
            rel="noopener noreferrer"
          >
            <FaLinkedin />
          </a>
          <NavButton
            onClick={handleRandomEssay}
            label="CLICK ME!"
            className={styles.headerNavButton}
          />

        </div>
      </div>
    </header>
  );
};

export default Navigation;
