'use client';

import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import styles from './NavButton.module.css';

interface NavButtonProps {
  to?: string;
  label: string | React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  className?: string;
}

const NavButton: React.FC<NavButtonProps> = ({
  to,
  label,
  onClick,
  disabled = false,
  className = '',
}) => {
  const router = useRouter();

  const handleClick = () => {
    if (onClick && !disabled) onClick();
    if (to && !disabled) router.push(to);
  };

  // If we only have a route but no custom behavior, use Link
  if (to && !onClick) {
    return (
      <Link
        href={to}
        className={`${styles.navButton} ${disabled ? styles.navButtonDisabled : ''} ${className}`}
        aria-disabled={disabled}
      >
        {label}
      </Link>
    );
  }

  return (
    <button
      onClick={handleClick}
      className={`${styles.navButton} ${disabled ? styles.navButtonDisabled : ''} ${className}`}
      disabled={disabled}
    >
      <span>{label}</span>
    </button>
  );
};

export default NavButton;
