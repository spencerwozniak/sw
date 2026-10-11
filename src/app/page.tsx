import { FadeIn } from '@/components/ui';
import HomePage from './HomePage';
import Chatbot from '@/components/Chatbot';
import projects from '@/data/projects.json';
import { getPublishedArticles } from '@/lib/content/articles';

export const metadata = {
  alternates: { canonical: '/' },
};

const selectedProjects = projects.slice(0, 5).map((p) => ({
  href: `/work/projects/${p.slug}`,
  title: p.title,
  subline: p.subtitle,
  meta: [p.category, p.year],
}));

export default async function Home() {
  // Newest first, as the database returns them.
  const articles = await getPublishedArticles();
  const recentArticles = articles.slice(0, 6).map((a) => ({
    href: `/writing/${a.id}`,
    title: a.title,
    subline: a.topic,
    meta: a.date,
  }));

  return (
    <>
      <FadeIn>
        <HomePage
          projects={selectedProjects}
          articles={recentArticles}
          projectCount={projects.length}
          articleCount={articles.length}
        />
      </FadeIn>
      <Chatbot />
    </>
  );
}
