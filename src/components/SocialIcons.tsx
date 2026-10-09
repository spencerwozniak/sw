import {
  FaLinkedin,
  FaGithub,
  FaTwitter,
  FaInstagram,
  FaGraduationCap,
  FaBook,
  FaYoutube,
  FaFacebook,
} from 'react-icons/fa';
import { cx } from '@/lib/cx';
import { IconButton } from '@/components/ui';

const SOCIAL_LINKS = [
  { href: 'https://www.linkedin.com/in/spencerwozniak/', label: 'LinkedIn', icon: <FaLinkedin /> },
  { href: 'https://github.com/spencerwozniak', label: 'GitHub', icon: <FaGithub /> },
  { href: 'https://www.researchgate.net/profile/Spencer-Wozniak', label: 'ResearchGate', icon: <FaGraduationCap /> },
  { href: 'https://www.youtube.com/@spencerwozniak', label: 'YouTube', icon: <FaYoutube /> },
  { href: 'https://www.goodreads.com/user/show/180143299-spencer-wozniak', label: 'Goodreads', icon: <FaBook /> },
  { href: 'https://www.facebook.com/profile.php?id=100009558799665', label: 'Facebook', icon: <FaFacebook /> },
  { href: 'https://x.com/WozniakSpencer', label: 'Twitter', icon: <FaTwitter /> },
  { href: 'https://instagram.com/spencer.wozniak', label: 'Instagram', icon: <FaInstagram /> },
];

const SocialIcons: React.FC<{ className?: string }> = ({ className }) => {
  return (
    <ul className={cx('m-0 flex list-none flex-wrap gap-1 p-0', className)}>
      {SOCIAL_LINKS.map(({ href, label, icon }) => (
        <li key={href}>
          <IconButton href={href} label={label} icon={icon} />
        </li>
      ))}
    </ul>
  );
};

export default SocialIcons;
