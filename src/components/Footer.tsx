import Link from 'next/link';
import navigationData from '@/data/navigationData.json';
import SocialIcons from './SocialIcons';
import { Signature } from '@/components/ui';

type NavItem = { label: string; link: string };
const NAV_ITEMS: NavItem[] = (navigationData as Array<{ label: string; link: string }>).map(({ label, link }) => ({
  label,
  link,
}));

const footerLink = 'eyebrow text-[0.6875rem] text-muted transition-colors hover:text-accent';

const Footer: React.FC = () => {
  return (
    <footer className="mt-16 border-t border-border px-[var(--gutter)] pb-10 pt-14 text-center sm:mt-28">
      <Link href="/" className="inline-block leading-none">
        <Signature className="mx-auto h-auto w-[180px] sm:w-[220px]" />
      </Link>
      <SocialIcons className="mb-5 mt-7 justify-center" />
      <nav aria-label="Footer">
        <ul className="m-0 mb-6 flex list-none flex-wrap justify-center gap-x-6 gap-y-1.5 p-0">
          <li>
            <Link href="/" className={footerLink}>
              HOME
            </Link>
          </li>
          {NAV_ITEMS.map((item) => (
            <li key={item.link}>
              <Link href={item.link} className={footerLink}>
                {item.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
      <p className="m-0 font-sans text-[0.8125rem] text-muted">
        &copy; 2026 <strong className="font-bold text-fg">Spencer Wozniak</strong>
      </p>
    </footer>
  );
};

export default Footer;
