// src/app/contact/_components/CalendlyButton.tsx
"use client";

import { FiArrowUpRight } from "react-icons/fi";
import { Button } from "@/components/ui";

const BOOKING_URL = "https://calendar.app.google/GryyGFAKgqj92r566";

interface CalendlyButtonProps {
  variant?: "floating" | "inline";
}

export default function CalendlyButton({ variant = "floating" }: CalendlyButtonProps) {
  const button = (
    <Button variant="primary" href={BOOKING_URL} iconRight={<FiArrowUpRight />}>
      Schedule a Meeting
    </Button>
  );

  if (variant === "floating") {
    return <div className="fixed bottom-[30px] right-[30px] z-50">{button}</div>;
  }

  return button;
}
