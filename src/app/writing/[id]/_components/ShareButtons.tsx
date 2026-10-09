"use client";

import { useEffect, useState } from "react";
import {
  FaFacebookF,
  FaXTwitter,
  FaLinkedinIn,
  FaRedditAlien,
  FaRegCopy,
} from "react-icons/fa6";
import { IconButton } from "@/components/ui";
import TempMsg from "@/components/TempMsg";

export default function ShareButtons({ articleId }: { articleId: string }) {
  const [url, setUrl] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setUrl(`${window.location.origin}/writing/${articleId}`);
  }, [articleId]);

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
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
    <aside aria-label="Share article">
      <div className="flex flex-wrap items-center gap-1.5">
        {buttons.map(({ icon, label, href }) => (
          <IconButton
            key={label}
            variant="outline"
            size="sm"
            href={href}
            label={`Share on ${label}`}
            title={`Share on ${label}`}
            icon={icon}
          />
        ))}
        <IconButton
          variant="outline"
          size="sm"
          label="Copy link"
          title="Copy link"
          icon={<FaRegCopy />}
          onClick={copyToClipboard}
        />
        {copied && (
          <TempMsg
            message="Link copied!"
            clearMessage={() => setCopied(false)}
            duration={2000}
            className="ml-2"
          />
        )}
      </div>
    </aside>
  );
}
