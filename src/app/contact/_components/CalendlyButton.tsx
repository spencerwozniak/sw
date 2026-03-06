// src/app/contact/_components/CalendlyButton.tsx
"use client";

import styles from "./CalendlyButton.module.css";

const BOOKING_URL = "https://calendar.app.google/GryyGFAKgqj92r566";

interface CalendlyButtonProps {
  variant?: "floating" | "inline";
}

export default function CalendlyButton({ variant = "floating" }: CalendlyButtonProps) {
  const buttonClass =
    variant === "inline"
      ? `${styles.navButton} ${styles.inline}`
      : styles.navButton;

  return (
    <a
      href={BOOKING_URL}
      target="_blank"
      rel="noopener noreferrer"
      className={buttonClass}
    >
      Schedule a Meeting
    </a>
  );
}
