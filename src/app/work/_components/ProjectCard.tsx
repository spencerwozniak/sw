import Image from 'next/image';
import { MediaCard } from '@/components/ui';

export type ProjectItem = {
  slug: string;
  title: string;
  subtitle?: string;
  description?: string;
  image: string;
  content?: string[];
  externalUrl?: string | null;
  tags?: string[];
  category?: string;
  year?: string;
  role?: string;
};

export function ProjectCard({ project }: { project: ProjectItem }) {
  // Use first content item if available, unless it's a YouTube video, then use second item
  const isYouTubeVideo = (url: string) => url.includes('youtu.be') || url.includes('youtube.com');
  const displayImage = project.content && project.content.length > 0
    ? (isYouTubeVideo(project.content[0]) && project.content.length > 1
      ? project.content[1]
      : project.content[0])
    : project.image;

  const { title, subtitle, category, year, role, slug } = project;

  return (
    <MediaCard
      href={`/work/projects/${slug}`}
      ariaLabel={`${title}: ${subtitle ?? 'View project'}`}
      topLeft={category || 'Project'}
      topRight={year || ''}
      bottomLeft={role || ''}
      peek={title || subtitle ? { title, subtitle } : undefined}
      image={
        <Image
          src={displayImage}
          alt={title}
          fill
          sizes="(max-width: 640px) 100vw, (max-width: 1240px) 50vw, 600px"
          className="object-cover object-top"
        />
      }
    />
  );
}
