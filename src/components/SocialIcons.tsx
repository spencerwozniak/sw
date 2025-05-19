'use client';

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
import styles from './SocialIcons.module.css'; // optional: split CSS if needed

const SocialIcons: React.FC = () => {
  return (
    <div className={styles.socialIcons}>
      <a
        href="https://www.linkedin.com/in/spencerwozniak/"
        target="_blank"
        rel="noopener noreferrer"
        aria-label="LinkedIn"
      >
        <FaLinkedin size={24} />
      </a>
      <a
        href="https://github.com/spencerwozniak"
        target="_blank"
        rel="noopener noreferrer"
        aria-label="GitHub"
      >
        <FaGithub size={24} />
      </a>
      <a
        href="https://www.researchgate.net/profile/Spencer-Wozniak"
        target="_blank"
        rel="noopener noreferrer"
        aria-label="ResearchGate"
      >
        <FaGraduationCap size={24} />
      </a>
      <a
        href="https://www.youtube.com/@spencerwozniak"
        target="_blank"
        rel="noopener noreferrer"
        aria-label="YouTube"
      >
        <FaYoutube size={24} />
      </a>
      <a
        href="https://www.goodreads.com/user/show/180143299-spencer-wozniak"
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Goodreads"
      >
        <FaBook size={24} />
      </a>
      <a
        href="https://www.facebook.com/profile.php?id=100009558799665"
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Facebook"
      >
        <FaFacebook size={24} />
      </a>
      <a
        href="https://x.com/WozniakSpencer"
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Twitter"
      >
        <FaTwitter size={24} />
      </a>
      <a
        href="https://instagram.com/spencer.wozniak"
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Instagram"
      >
        <FaInstagram size={24} />
      </a>
    </div>
  );
};

export default SocialIcons;