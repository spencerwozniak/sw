'use client';

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { AnimatePresence, motion } from 'framer-motion';
import { FiArrowLeft, FiArrowUpRight, FiX } from 'react-icons/fi';
import {
  Button,
  Container,
  FadeIn,
  Frame,
  IconButton,
  PageHeader,
  Prose,
  Section,
  SpecTable,
  TagList,
  type SpecItem,
} from '@/components/ui';
import VideoPlayer from '@/components/VideoPlayer';
import { fade } from '@/lib/motion';

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
  projectTitle,
  onImageClick,
  priority,
}: {
  src: string;
  projectTitle: string;
  onImageClick: (src: string) => void;
  priority?: boolean;
}) {
  const isYouTube = isYouTubeUrl(src);
  const [naturalWidth, setNaturalWidth] = useState<number>();

  if (isYouTube) {
    return <VideoPlayer src={getYouTubeEmbedUrl(src)} />;
  }

  return (
    <Frame as="button" interactive onClick={() => onImageClick(src)} ariaLabel={`${projectTitle} image`}>
      <Image
        src={src}
        alt=""
        width={800}
        height={600}
        sizes="(max-width: 1240px) 100vw, 1200px"
        className="mx-auto h-auto w-full"
        style={naturalWidth ? { maxWidth: `${naturalWidth}px` } : undefined}
        onLoad={(e) => setNaturalWidth(e.currentTarget.naturalWidth)}
        priority={priority}
      />
    </Frame>
  );
}

interface Props {
  project: Project;
}

export default function AnimatedProjectContent({ project }: Props) {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [modalRatio, setModalRatio] = useState<number>();
  const triggerRef = useRef<HTMLElement | null>(null);
  const dialogRef = useRef<HTMLDivElement | null>(null);

  const content = project.content || [project.image];
  const displayCount = project.displayContent ?? 2;
  const columnContent = content.slice(0, displayCount);
  const remainingContent = content.slice(displayCount);
  const firstContent = columnContent[0] || project.image;

  const handleImageClick = (src: string) => {
    if (!isYouTubeUrl(src)) {
      triggerRef.current = document.activeElement as HTMLElement;
      setModalRatio(undefined);
      setSelectedImage(src);
      document.body.style.overflow = 'hidden';
    }
  };

  const handleCloseModal = () => {
    setSelectedImage(null);
    document.body.style.overflow = 'unset';
    triggerRef.current?.focus();
  };

  // Handle ESC key to close modal
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && selectedImage) {
        setSelectedImage(null);
        document.body.style.overflow = 'unset';
        triggerRef.current?.focus();
      }
      if (e.key === 'Tab' && selectedImage) {
        e.preventDefault();
        dialogRef.current?.querySelector('button')?.focus();
      }
    };

    if (selectedImage) {
      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }
  }, [selectedImage]);

  // Move focus into the dialog when it opens.
  useEffect(() => {
    if (selectedImage) {
      dialogRef.current?.querySelector('button')?.focus();
    }
  }, [selectedImage]);

  // Safety net: if this component unmounts while the modal is open, restore scrolling.
  useEffect(() => {
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, []);

  const specItems = (
    [
      project.category ? { label: 'Category', value: project.category } : null,
      project.year ? { label: 'Year', value: project.year } : null,
      project.role ? { label: 'Role', value: project.role } : null,
      project.tags && project.tags.length > 0
        ? { label: 'Tags', value: <TagList items={project.tags} />, wide: true }
        : null,
    ] as (SpecItem | null)[]
  ).filter((item): item is SpecItem => item !== null);

  return (
    <FadeIn>
      <Container as="main" width="wide">
        <div className="flex items-center justify-between gap-4 pt-7 sm:pt-11">
          <Button size="sm" href="/work#projects" icon={<FiArrowLeft />}>
            Back to Projects
          </Button>
          {project.externalUrl && (
            <Button size="sm" href={project.externalUrl} iconRight={<FiArrowUpRight />}>
              See Project
            </Button>
          )}
        </div>

        <PageHeader
          flush
          className="pt-10 sm:pt-16"
          title={project.title}
          subtitle={project.subtitle}
          subtitleStyle="italic"
        >
          {project.description && (
            <Prose font="sans">
              {project.description.split('\n').map((paragraph, index) => (
                <p key={index}>{paragraph}</p>
              ))}
            </Prose>
          )}
        </PageHeader>

        <SpecTable variant="grid" items={specItems} />

        <div className="mt-8 grid gap-5 sm:mt-12 sm:gap-8">
          <ContentItem src={firstContent} projectTitle={project.title} onImageClick={handleImageClick} priority />
          {columnContent.slice(1).map((src) => (
            <div key={src} className="hidden lg:block">
              <ContentItem src={src} projectTitle={project.title} onImageClick={handleImageClick} />
            </div>
          ))}
        </div>

        {remainingContent.length > 0 && (
          <Section titleId="h-gallery" title="Gallery" count={remainingContent.length} className="sm:pt-20">
            <div className="mt-6 columns-1 gap-5 sm:mt-8 sm:columns-2 sm:gap-8">
              {remainingContent.map((src) => (
                <div key={src} className="mb-5 break-inside-avoid sm:mb-8">
                  <ContentItem src={src} projectTitle={project.title} onImageClick={handleImageClick} />
                </div>
              ))}
            </div>
          </Section>
        )}
      </Container>

      {/* Image Modal */}
      <AnimatePresence>
        {selectedImage && (
          <motion.div
            key="project-image-modal"
            ref={dialogRef}
            variants={fade}
            initial="hidden"
            animate="show"
            exit="exit"
            className="fixed inset-0 z-[1001] flex items-center justify-center bg-bg/90 p-4"
            role="dialog"
            aria-modal="true"
            aria-label={`${project.title} image`}
            onClick={handleCloseModal}
          >
            <div className="max-h-[90vh] max-w-[90vw]">
              <Frame>
                <Image
                  src={selectedImage}
                  alt=""
                  width={1200}
                  height={800}
                  sizes="90vw"
                  className="h-auto max-h-[90vh] max-w-[90vw] object-contain"
                  style={modalRatio ? { width: `min(90vw, calc(90vh * ${modalRatio}))` } : undefined}
                  onLoad={(e) => setModalRatio(e.currentTarget.naturalWidth / e.currentTarget.naturalHeight)}
                />
              </Frame>
            </div>
            <IconButton
              variant="surface"
              label="Close"
              icon={<FiX />}
              className="absolute right-4 top-4"
              onClick={handleCloseModal}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </FadeIn>
  );
}
