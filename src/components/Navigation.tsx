'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { FaLinkedin } from 'react-icons/fa';
import MenuButton from './MenuButton';
import SocialIcons from './SocialIcons';
import navigationData from '@/data/navigationData.json';
import articles from '@/data/articles.json';
import { cx } from '@/lib/cx';
import { Signature, Button, IconButton, ThemeToggle, Title } from '@/components/ui';

const mobileThreshold = 960;

type NavItem = { label: string; link: string };
const NAV_ITEMS: NavItem[] = (navigationData as Array<{ label: string; link: string }>).map(({ label, link }) => ({
  label,
  link,
}));

const Navigation: React.FC = () => {
  const router = useRouter();
  const pathname = usePathname();
  const [isSubMenuOpen, setIsSubMenuOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [isHydrated, setIsHydrated] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const menuButtonRef = useRef<HTMLButtonElement>(null);

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

    const handleScroll = () => {
      const scrollY = window.scrollY;
      setIsScrolled(scrollY > 10);
    };

    handleResize(); // Set initial value after hydration
    handleScroll(); // Set initial scroll state
    window.addEventListener('resize', handleResize);
    window.addEventListener('scroll', handleScroll);
    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  const toggleSubMenu = () => {
    setIsSubMenuOpen((prev) => !prev);
  };

  // Fade the page content out while the mobile menu is open, and keep it out of the
  // tab order / screen-reader tree so focus can't land on invisible links behind the menu.
  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle('menu-open', isSubMenuOpen);
    const pageContentEls = document.querySelectorAll<HTMLElement>('.page-content');
    pageContentEls.forEach((el) => el.toggleAttribute('inert', isSubMenuOpen));
    return () => {
      root.classList.remove('menu-open');
      pageContentEls.forEach((el) => el.removeAttribute('inert'));
    };
  }, [isSubMenuOpen]);

  // Close the mobile menu on Escape and return focus to the toggle button
  useEffect(() => {
    if (!isSubMenuOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsSubMenuOpen(false);
        menuButtonRef.current?.focus();
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [isSubMenuOpen]);

  if (!isHydrated) {
    // Return nothing or minimal skeleton until hydration is complete to avoid mismatch
    return null;
  }

  const isActive = (link: string) => pathname === link || pathname.startsWith(`${link}/`);
  const onLogoClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    if (pathname === '/') window.location.reload();
    else router.push('/');
  };

  return (
    <>
      <header
        className={cx(
          'fixed inset-x-0 top-0 z-[1000] h-[var(--nav-h)] border-b bg-bg transition-colors duration-300',
          isScrolled ? 'border-border' : 'border-transparent'
        )}
      >
        <div
          className={cx(
            'mx-auto grid h-full w-full max-w-[var(--col-wide)] items-center gap-4 px-[var(--gutter)]',
            isMobile ? 'grid-cols-[1fr_auto]' : 'grid-cols-[1fr_auto_1fr]'
          )}
        >
          <Link
            href="/"
            onClick={onLogoClick}
            aria-current={pathname === '/' ? 'page' : undefined}
            className="justify-self-start leading-none"
          >
            <Signature
              tone="muted"
              className={cx(
                'transition-colors duration-150 ease-ui hover:text-fg',
                pathname === '/' ? 'text-fg' : 'text-muted',
                isMobile ? 'h-[30px] w-auto' : 'h-[34px] w-auto'
              )}
            />
          </Link>

          {!isMobile && (
            <nav aria-label="Primary">
              <ul className="m-0 flex list-none items-center p-0">
                {NAV_ITEMS.map((item, i) => (
                  <li key={item.link} className="flex items-center">
                    {i > 0 && <span aria-hidden="true" className="mx-[1.1rem] size-1 bg-accent opacity-85" />}
                    <Link
                      href={item.link}
                      aria-current={isActive(item.link) ? 'page' : undefined}
                      className="py-1.5 font-sans text-[0.9375rem] font-bold text-muted transition-colors duration-300 hover:text-fg aria-[current=page]:text-fg"
                    >
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          )}

          <div className="flex items-center gap-2 justify-self-end">
            {!isMobile && (
              <IconButton variant="plain" size="lg" href="https://www.linkedin.com/in/spencerwozniak/" label="LinkedIn" icon={<FaLinkedin />} />
            )}
            {pathname.startsWith('/writing/') && (
              <span className="contents max-[359px]:hidden">
                <Button size="sm" onClick={handleRandomEssay}>
                  CLICK ME!
                </Button>
              </span>
            )}
            <ThemeToggle />
            {isMobile && <MenuButton ref={menuButtonRef} onClick={toggleSubMenu} isOpen={isSubMenuOpen} />}
          </div>
        </div>
      </header>

      {isMobile && (
        <div
          id="mobile-menu"
          inert={!isSubMenuOpen}
          aria-hidden={!isSubMenuOpen}
          className={cx(
            'fixed inset-0 z-[999] overflow-y-auto bg-bg transition-opacity duration-300',
            isSubMenuOpen ? 'opacity-100' : 'pointer-events-none opacity-0'
          )}
        >
          {/* Symmetric nav-h padding keeps the content centered on the full screen while clearing the header;
              m-auto (rather than justify-center) lets it scroll from the top if the viewport is too short. */}
          <div className="flex min-h-full flex-col items-center px-[var(--gutter)] py-[var(--nav-h)]">
            <div className="m-auto flex w-full max-w-[var(--col-text)] flex-col items-center text-center">
              <ul className="m-0 w-full list-none p-0">
                {NAV_ITEMS.map((item) => (
                  <li key={item.link} className="after:mx-auto after:block after:h-px after:w-24 after:bg-border">
                    <Link
                      href={item.link}
                      onClick={() => setIsSubMenuOpen(false)}
                      aria-current={isActive(item.link) ? 'page' : undefined}
                      className="block py-5 text-muted transition-colors hover:text-fg aria-[current=page]:text-fg"
                    >
                      <Title as="h2" size="h1" tone="inherit">
                        {item.label}
                      </Title>
                    </Link>
                  </li>
                ))}
              </ul>
              <SocialIcons className="mt-10 justify-center" />
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Navigation;
