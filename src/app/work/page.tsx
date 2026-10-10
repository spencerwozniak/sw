import { Container, FadeIn, Section } from '@/components/ui';
import WorkHero from '@/app/work/_components/WorkHero';
import Chatbot from '@/components/Chatbot';
import { ProjectCard, ProjectItem } from './_components/ProjectCard';
import projectsData from '@/data/projects.json';
import Resume from './resume';

export const metadata = {
  title: 'Work',
  description:
    'Projects, startups, research and resume of Spencer Wozniak, from agentic healthcare infrastructure at Serelora to FHIR tooling and freelance builds.',
  alternates: { canonical: '/work' },
};

export default function MyWorkPage() {
  const projects = projectsData as ProjectItem[];

  return (
    <>
      <FadeIn>
        <Container as="main" width="wide">
          <WorkHero />

          <Section
            size="lg"
            id="projects"
            titleId="h-projects"
            title="Projects"
            description="A collection of projects I&apos;ve built, from startups to freelance work to personal experiments."
          >
            <div className="grid grid-cols-1 gap-x-5 gap-y-9 sm:grid-cols-2 lg:gap-x-8 lg:gap-y-14">
              {projects.map((project) => (
                <ProjectCard key={project.slug} project={project} />
              ))}
            </div>
          </Section>

          <Resume />
        </Container>
      </FadeIn>

      <Chatbot />
    </>
  );
}
