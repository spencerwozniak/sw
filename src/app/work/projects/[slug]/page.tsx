import type { Metadata } from 'next';
import projects from '@/data/projects.json';
import { notFound } from 'next/navigation';
import AnimatedProjectContent from './AnimatedProjectContent';

type Project = {
  slug: string;
  title: string;
  subtitle?: string;
  description?: string;
  image: string;
  content?: string[]; // Array of image paths or YouTube URLs
  externalUrl?: string | null;
  tags?: string[];
  category?: string;
  year?: string;
  role?: string;
};

export function generateStaticParams() {
  return (projects as Project[]).map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const project = (projects as Project[]).find((p) => p.slug === params.slug);
  if (!project) {
    return {
      title: 'Project Not Found',
      description: 'This project could not be found.',
      robots: { index: false },
    };
  }

  const title = `${project.title} | Projects`;
  const description = project.subtitle || project.description || `${project.title} — featured project`;

  return {
    title,
    description,
    openGraph: {
      type: 'website',
      title,
      description,
      images: project.image ? [{ url: project.image }] : [],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: project.image ? [project.image] : [],
    },
  };
}

export default function ProjectDetailPage({ params }: { params: { slug: string } }) {
  const project = (projects as Project[]).find((p) => p.slug === params.slug);
  if (!project) return notFound();

  return <AnimatedProjectContent project={project} />;
}
