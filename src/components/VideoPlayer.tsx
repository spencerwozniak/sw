'use client';

import React from 'react';
import { Frame } from '@/components/ui';

interface VideoPlayerProps {
  src: string;
}

const VideoPlayer: React.FC<VideoPlayerProps> = ({ src }) => {
  const isYouTubeSrc = typeof src === 'string' && src.includes('youtube.com');

  return (
    <Frame aspect="16/9">
      {isYouTubeSrc ? (
        <iframe
          src={src}
          title="YouTube video player"
          frameBorder="0"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
          className="absolute inset-0 size-full"
        />
      ) : (
        <video controls className="absolute inset-0 size-full">
          <source src={src} type="video/mp4" />
          Your browser does not support the video tag.
        </video>
      )}
    </Frame>
  );
};

export default VideoPlayer;
