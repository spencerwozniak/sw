"use client";

import { useState } from "react";
import {
  FaFacebookF,
  FaXTwitter,
  FaLinkedinIn,
  FaRedditAlien,
  FaRegCopy,
} from "react-icons/fa6";

export default function ShareButtons({ articleId }: { articleId: string }) {
  const url =
    typeof window !== "undefined"
      ? `${window.location.origin}/writing/${articleId}`
      : "";
  const [copied, setCopied] = useState(false);

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  const buttons = [
    {
      icon: <FaFacebookF />,
      label: "Facebook",
      href: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`,
    },
    {
      icon: <FaXTwitter />,
      label: "X",
      href: `https://twitter.com/intent/tweet?url=${encodeURIComponent(url)}`,
    },
    {
      icon: <FaLinkedinIn />,
      label: "LinkedIn",
      href: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`,
    },
    {
      icon: <FaRedditAlien />,
      label: "Reddit",
      href: `https://www.reddit.com/submit?url=${encodeURIComponent(url)}`,
    },
  ];

  return (
    <aside aria-label="Share article" className="mt-5">
      <div className="flex gap-3 flex-wrap items-center">
        {buttons.map(({ icon, label, href }) => (
          <a
            key={label}
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[#bbb] hover:text-white border border-[#333] hover:border-[#555] p-2 rounded-full transition-colors"
            title={`Share on ${label}`}
            aria-label={`Share on ${label}`}
          >
            {icon}
          </a>
        ))}
        <button
          onClick={copyToClipboard}
          className="cursor-pointer text-[#bbb] hover:text-white border border-[#333] hover:border-[#555] p-2 rounded-full transition-colors"
          title="Copy link"
          aria-label="Copy link"
        >
          <FaRegCopy />
        </button>
        {copied && (
          <span className="text-sm text-[#8d8d8d] ml-2">Link copied!</span>
        )}
      </div>
    </aside>
  );
}
