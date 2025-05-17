'use client';

import { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import MenuButton from './MenuButton';
import NavButton from './NavButton';
import styles from './Navigation.module.css';
import navigationData from './navigationData.json';
import { FaLinkedin } from 'react-icons/fa';

const mobileThreshold = 960;

const Navigation: React.FC = () => {
  const router = useRouter();
  const pathname = usePathname();
  const [isSubMenuOpen, setIsSubMenuOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [isHydrated, setIsHydrated] = useState(false);

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
              src="/wp-logo.png"
              alt="WozPrep Logo"
              width={100}
              height={40}
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

        {isMobile && isSubMenuOpen && (
          <div className={`${styles.dropdownMenu} ${styles.open}`}>
            {navigationData.map((item, index) => (
              <section key={index} className={styles.navColumn}>
                <Link href={item.link} className={styles.navColumnHeading}>
                  {item.label}
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
            ))}
          </div>
        )}

        <div className={styles.headerRight}>
          <a
            className={styles.headerContactLink}
            target="_blank"
            href="https://www.linkedin.com/company/wozprep"
            rel="noopener noreferrer"
          >
            <FaLinkedin />
          </a>
          <NavButton
            to="/contact"
            label="CONTACT"
            className={styles.headerNavButton}
          />
        </div>
      </div>
    </header>
  );
};

export default Navigation;
