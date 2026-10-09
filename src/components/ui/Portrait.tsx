import React from 'react';
import Image from 'next/image';

export function Portrait({ alt, priority }: { alt: string; priority?: boolean }) {
  return (
    <div className="portrait">
      <Image
        src="/headshot-transparent.png"
        alt={alt}
        width={1984}
        height={2976}
        sizes="160px"
        priority={priority}
        className="portrait-img"
      />
    </div>
  );
}
