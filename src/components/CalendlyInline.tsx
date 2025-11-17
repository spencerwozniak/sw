"use client";

import { useEffect } from "react";

declare global {
  interface Window {
    Calendly?: {
      initInlineWidget: (options: {
        url: string;
        parentElement: HTMLElement | null;
      }) => void;
    };
  }
}

export default function CalendlyInline() {
  useEffect(() => {
    const script = document.createElement("script");
    script.src = "https://assets.calendly.com/assets/external/widget.js";
    script.async = true;
    document.body.appendChild(script);

    script.onload = () => {
      window.Calendly?.initInlineWidget({
        url: "https://calendly.com/hey-spencerwozniak/meeting?primary_color=ded4c1&text_color=ffffff&background_color=0a0a0a",
        parentElement: document.querySelector("#calendly-embed")!,
      });
    };

    return () => document.body.removeChild(script);
  }, []);

  return (
    <div
      id="calendly-embed"
      style={{
        minHeight: "1000px",
        width: "100%",
      }}
    />
  );
}
