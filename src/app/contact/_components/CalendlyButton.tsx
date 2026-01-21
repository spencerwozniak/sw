// src/components/CalendlyButton.tsx
"use client";

import { useEffect } from "react";
import styles from "./CalendlyButton.module.css";

declare global {
  interface Window {
    Calendly?: {
      initPopupWidget: (options: { url: string }) => void;
    };
  }
}

interface CalendlyButtonProps {
  variant?: "floating" | "inline";
}

export default function CalendlyButton({ variant = "floating" }: CalendlyButtonProps) {
  useEffect(() => {
    const script = document.createElement("script");
    script.src = "https://assets.calendly.com/assets/external/widget.js";
    script.async = true;
    document.body.appendChild(script);

    return () => document.body.removeChild(script);
  }, []);

  const openCalendly = () =>
    window.Calendly?.initPopupWidget({
      url: "https://calendly.com/hey-spencerwozniak/meeting?background_color=000000&text_color=ffffff&primary_color=ded4c1",
    });

  const buttonClass = variant === "inline" 
    ? `${styles.navButton} ${styles.inline}` 
    : styles.navButton;

  return (
    <button onClick={openCalendly} className={buttonClass}>
      Schedule a Meeting
    </button>
  );
}
