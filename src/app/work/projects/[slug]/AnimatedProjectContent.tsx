'use client';

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import NavButton from '@/components/NavButton';
import Image from 'next/image';

type Project = {
  slug: string;
  title: string;
  subtitle?: string;
  description?: string;
  image: string;
  content?: string[];
  /** Number of first N content items to show in the top column (default 2). Rest go to Gallery. */
  displayContent?: number;
  externalUrl?: string | null;
  tags?: string[];
  category?: string;
  year?: string;
  role?: string;
};

// Helper function to check if a string is a YouTube URL
function isYouTubeUrl(url: string): boolean {
  return url.includes('youtube.com') || url.includes('youtu.be');
}

// Helper function to convert YouTube URL to embed URL
function getYouTubeEmbedUrl(url: string): string {
  if (url.includes('youtube.com/embed/')) {
    return url;
  }

  let videoId = '';

  if (url.includes('youtube.com/watch?v=')) {
    videoId = url.split('v=')[1]?.split('&')[0]?.split('#')[0] || '';
  } else if (url.includes('youtu.be/')) {
    videoId = url.split('youtu.be/')[1]?.split('?')[0]?.split('#')[0] || '';
  } else if (url.includes('youtube.com/v/')) {
    videoId = url.split('v/')[1]?.split('?')[0]?.split('#')[0] || '';
  }

  return videoId ? `https://www.youtube.com/embed/${videoId}` : url;
}

// Component to render a content item (image or YouTube video)
function ContentItem({
  src,
  className = '',
  onImageClick,
  imageRef,
}: {
  src: string;
  className?: string;
  onImageClick?: () => void;
  imageRef?: (el: HTMLDivElement | null) => void;
}) {
  const isYouTube = isYouTubeUrl(src);

  if (isYouTube) {
    const embedUrl = getYouTubeEmbedUrl(src);
    return (
      <div className={`relative w-full ${className}`}>
        <div className="relative aspect-video w-full overflow-hidden rounded-2xl bg-neutral-900">
          <iframe
            src={embedUrl}
            title="YouTube video player"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
            className="absolute inset-0 h-full w-full"
          />
        </div>
      </div>
    );
  }

  return (
    <div ref={imageRef} className={`relative w-full ${className}`}>
      <motion.div
        className="relative w-full overflow-hidden rounded-2xl bg-neutral-900 cursor-pointer"
        whileHover={{ scale: 1.01 }}
        transition={{ duration: 0.2 }}
        onClick={onImageClick}
      >
        <Image
          src={src}
          alt=""
          width={800}
          height={600}
          className="h-auto w-full object-cover"
          sizes="(max-width: 1024px) 100vw, 58vw"
        />
      </motion.div>
    </div>
  );
}

interface Props {
  project: Project;
}

export default function AnimatedProjectContent({ project }: Props) {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const imageRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});

  const content = project.content || [project.image];
  const displayCount = project.displayContent ?? 2;
  const columnContent = content.slice(0, displayCount);
  const remainingContent = content.slice(displayCount);
  const firstContent = columnContent[0] || project.image;

  const handleImageClick = (src: string) => {
    if (!isYouTubeUrl(src)) {
      setSelectedImage(src);
      document.body.style.overflow = 'hidden';
    }
  };

  const handleCloseModal = () => {
    setSelectedImage(null);
    document.body.style.overflow = 'unset';
  };

  // Handle ESC key to close modal
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && selectedImage) {
        setSelectedImage(null);
        document.body.style.overflow = 'unset';
      }
    };

    if (selectedImage) {
      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }
  }, [selectedImage]);

  return (
    <motion.main
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
      className="min-h-screen text-gray-100"
    >
      {/* Header row with Back */}
      <div className="mx-auto max-w-6xl px-4 pt-16">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
          className="mb-6 flex items-center justify-between"
        >
          <NavButton
            to="/work#projects"
            label="Back to Projects"
            className="!text-[14px] !mt-5 md:!w-40"
          />

          {/* Optional external CTA */}
          {project.externalUrl && (
            <NavButton
              to={project.externalUrl}
              label="See Project"
              className="!text-[14px] !mt-5 md:!w-40"
            />
          )}
        </motion.div>
      </div>

      <div className="mx-auto max-w-6xl px-4 pb-16">
        {/* Split layout: Content (left) and Details (right) on desktop */}
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-12 lg:gap-6">
          {/* LEFT: First 2 content items on desktop, first 1 on mobile */}
          <div className="lg:col-span-7">
            <div className="lg:sticky lg:top-8 space-y-6">
              {/* First content - always shown */}
              <motion.div
                initial={{ opacity: 0, x: -30 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.8, delay: 0.3, ease: [0.22, 1, 0.36, 1] }}
              >
                <ContentItem
                  src={firstContent}
                  onImageClick={() => handleImageClick(firstContent)}
                  imageRef={(el) => {
                    if (el) imageRefs.current[firstContent] = el;
                  }}
                />
              </motion.div>
              {/* Additional column content - only on desktop (2nd through displayCount) */}
              {columnContent.slice(1).map((src, index) => (
                <motion.div
                  key={src}
                  initial={{ opacity: 0, x: -30 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.8, delay: 0.4 + index * 0.1, ease: [0.22, 1, 0.36, 1] }}
                  className="hidden lg:block"
                >
                  <ContentItem
                    src={src}
                    onImageClick={() => handleImageClick(src)}
                    imageRef={(el) => {
                      if (el) imageRefs.current[src] = el;
                    }}
                  />
                </motion.div>
              ))}
            </div>
          </div>

          {/* RIGHT: Project Details */}
          <div className="lg:col-span-5">
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3, ease: [0.22, 1, 0.36, 1] }}
              className="text-3xl font-semibold tracking-tight text-white"
            >
              {project.title}
            </motion.h1>
            {project.subtitle && (
              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.4, ease: [0.22, 1, 0.36, 1] }}
                className="mt-1 text-gray-300"
              >
                {project.subtitle}
              </motion.p>
            )}

            {project.description && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.5, ease: [0.22, 1, 0.36, 1] }}
                className="mt-6 text-sm leading-relaxed text-gray-300 space-y-4"
              >
                {project.description.split('\n').map((paragraph, index) => (
                  <p key={index}>{paragraph}</p>
                ))}
              </motion.div>
            )}

            {/* Meta */}
            <motion.dl
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.6, ease: [0.22, 1, 0.36, 1] }}
              className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-1"
            >
              {project.category && (
                <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-5 hover:bg-white/[0.05] transition">
                  <dt className="text-xs uppercase tracking-wider text-white/50">Category</dt>
                  <dd className="mt-1 text-sm text-white">{project.category}</dd>
                </div>
              )}
              {project.year && (
                <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-5 hover:bg-white/[0.05] transition">
                  <dt className="text-xs uppercase tracking-wider text-white/50">Year</dt>
                  <dd className="mt-1 text-sm text-white">{project.year}</dd>
                </div>
              )}
              {project.role && (
                <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-5 hover:bg-white/[0.05] transition sm:col-span-2 lg:col-span-1">
                  <dt className="text-xs uppercase tracking-wider text-white/50">Role</dt>
                  <dd className="mt-1 text-sm text-white">{project.role}</dd>
                </div>
              )}
              {project.tags && project.tags.length > 0 && (
                <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-5 hover:bg-white/[0.05] transition sm:col-span-2 lg:col-span-1">
                  <dt className="text-xs uppercase tracking-wider text-white/50">Tags</dt>
                  <dd className="mt-2 flex flex-wrap gap-2">
                    {project.tags.map((t) => (
                      <span
                        key={t}
                        className="rounded-md border border-white/15 bg-white/5 px-2 py-1 text-xs text-white/80"
                      >
                        {t}
                      </span>
                    ))}
                  </dd>
                </div>
              )}
            </motion.dl>
          </div>
        </div>

        {/* Remaining Content - Masonry Layout */}
        {remainingContent.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.7, ease: [0.22, 1, 0.36, 1] }}
            className="mt-12"
          >
            <motion.h2
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.8, ease: [0.22, 1, 0.36, 1] }}
              className="mb-12 text-2xl font-semibold text-white text-center"
            >
              Gallery
            </motion.h2>
            <div className="[column-gap:1.5rem] columns-1 sm:columns-2">
              {remainingContent.map((content, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{
                    duration: 0.6,
                    delay: 0.9 + index * 0.1,
                    ease: [0.22, 1, 0.36, 1],
                  }}
                  className="mb-6 break-inside-avoid"
                >
                  <ContentItem
                    src={content}
                    onImageClick={() => handleImageClick(content)}
                    imageRef={(el) => {
                      if (el) imageRefs.current[content] = el;
                    }}
                  />
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}
      </div>

      {/* Image Modal */}
      <AnimatePresence>
        {selectedImage && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="fixed inset-0 z-[1001] bg-black/90 backdrop-blur-md"
              onClick={handleCloseModal}
            />
            {/* Modal Content */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
              className="fixed inset-0 z-[1001] flex items-center justify-center p-4 cursor-pointer"
              onClick={handleCloseModal}
            >
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 20 }}
                transition={{ duration: 0.3, delay: 0.1 }}
                className="relative max-h-[90vh] max-w-[90vw]"
              >
                <div className="relative max-h-[90vh] max-w-[90vw] overflow-hidden rounded-2xl bg-neutral-900">
                  <Image
                    src={selectedImage}
                    alt=""
                    width={1200}
                    height={800}
                    className="h-auto max-h-[90vh] w-auto max-w-[90vw] object-contain"
                    sizes="175vw"
                  />
                </div>
              </motion.div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </motion.main>
  );
}
