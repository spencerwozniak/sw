import { FadeIn } from '@/components/ui';
import HomePage from './HomePage';
import Chatbot from '@/components/Chatbot';
import projects from '@/data/projects.json';
import articles from '@/data/articles.json';

export const metadata = {
  alternates: { canonical: '/' },
};

const selectedProjects = projects.slice(0, 5).map((p) => ({
  href: `/work/projects/${p.slug}`,
  title: p.title,
  subline: p.subtitle,
  meta: [p.category, p.year],
}));

const recentArticles = [...articles]
  .sort((a, b) => Date.parse(b.date) - Date.parse(a.date))
  .slice(0, 6)
  .map((a) => ({
    href: `/writing/${a.id}`,
    title: a.title,
    subline: a.topic,
    meta: a.date,
  }));

export default function Home() {
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
