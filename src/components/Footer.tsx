import Link from 'next/link';
import navigationData from '@/data/navigationData.json';
import SocialIcons from './SocialIcons';
import { Signature, Scripture } from '@/components/ui';

type NavItem = { label: string; link: string };
const NAV_ITEMS: NavItem[] = (navigationData as Array<{ label: string; link: string }>).map(({ label, link }) => ({
  label,
  link,
}));

const footerLink = 'eyebrow text-[0.6875rem] text-muted transition-colors hover:text-accent';

const Footer: React.FC = () => {
  return (
    <footer className="mt-16 px-[var(--gutter)] pb-10 pt-14 text-center sm:mt-28">
      <Link href="/" className="inline-block leading-none">
        <Signature
          tone="muted"
          className="mx-auto w-[180px] text-muted transition-colors duration-150 ease-ui hover:text-accent sm:w-[220px]"
        />
      </Link>
      <SocialIcons className="mb-5 mt-7 justify-center" />
      <nav aria-label="Footer">
        <ul className="m-0 mb-6 flex list-none flex-wrap justify-center gap-x-6 gap-y-1.5 p-0">
          <li>
            <Link href="/" className={footerLink}>
              Home
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
      <Scripture cite="— Luke 1:38" size="sm" align="center" tone="muted" className="mx-auto mt-7 max-w-[26rem]">
        Behold the handmaid of the Lord;
        <br />
        be it unto me according to thy word.
      </Scripture>
    </footer>
  );
};

export default Footer;
