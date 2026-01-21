'use client';

import Image from 'next/image';
import Link from 'next/link';

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

  return (
    <Link
      href={`/work/projects/${project.slug}`}
      className="group relative block aspect-video rounded-2xl"
      aria-label={`${project.title}: ${project.subtitle ?? 'View project'}`}
    >
      {/* Border gutter for text */}
      <div className="absolute inset-0 p-6">
        {/* Inner frame with image */}
        <div className="relative h-full w-full overflow-hidden">
          <div className="absolute inset-0 shadow-[0_0_0_8px_#0a0a0a]" />
          <Image
            src={displayImage}
            alt={project.title}
            fill
            className="object-cover transition-transform duration-500 group-hover:scale-[1.02]"
          />
        </div>
      </div>

      {/* Edge text overlay, sits in the gutter */}
      <div className="pointer-events-none absolute inset-0">
        {/* Top */}
        <div className="absolute top-1 left-3 right-3 flex justify-between text-[10px] tracking-[0.12em] text-white/80">
          <span>{project.category || 'Project'}</span>
          <span>{project.year || ''}</span>
        </div>
        {/* Bottom */}
        <div className="absolute bottom-1 left-3 right-3 flex justify-between text-[10px] tracking-[0.12em] text-white/80">
          <span>{project.role || ''}</span>
          <span></span>
        </div>

        {/* Title/subtitle hover panel */}
        {(project.title || project.subtitle) && (
          <div className="pointer-events-none absolute inset-x-5 bottom-5 translate-y-2 opacity-0 transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100">
            <div className="bg-black/70 p-3 text-white backdrop-blur-sm">
              {project.title && <p className="text-sm font-semibold">{project.title}</p>}
              {project.subtitle && <p className="text-xs opacity-90 mt-1">{project.subtitle}</p>}
            </div>
          </div>
        )}
      </div>
    </Link>
  );
}
