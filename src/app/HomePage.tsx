import React from 'react';
import {
  Container,
  Portrait,
  GoldRule,
  Title,
  Scripture,
  Lede,
  Prose,
  TextLink,
  Button,
  Section,
  List,
  ListRow,
  MetaSep,
} from '@/components/ui';

export type HomeProject = {
  href: string;
  title: string;
  subline: string;
  meta: Array<string | undefined>;
};

export type HomeArticle = {
  href: string;
  title: string;
  subline: string;
  meta: string;
};

export type HomePageProps = {
  projects: HomeProject[];
  articles: HomeArticle[];
  projectCount: number;
  articleCount: number;
};

function ProjectMeta({ items }: { items: Array<string | undefined> }) {
  const parts = items.filter(Boolean) as string[];
  return (
    <>
      {parts.map((part, i) => (
        <React.Fragment key={i}>
          {i > 0 && <MetaSep />}
          {part}
        </React.Fragment>
      ))}
    </>
  );
}

export default function HomePage({ projects, articles, projectCount, articleCount }: HomePageProps) {
  return (
    <Container as="main" width="text" className="pt-10 sm:pt-20">
      <div className="mb-7 grid grid-cols-[auto_1px_minmax(0,1fr)] items-stretch gap-x-[1.1rem] sm:mb-9 sm:gap-x-7">
        <Portrait alt="Spencer Wozniak headshot" priority />
        <GoldRule />
        <div className="flex flex-col justify-center py-1">
          <Title as="h1" size="h1" className="mb-2.5 sm:mb-4">
            Spencer Wozniak
          </Title>
          <Scripture cite="— Luke 1:38">
            Behold the handmaid of the Lord;
            <br />
            be it unto me according to thy word.
          </Scripture>
        </div>
      </div>

      <Lede serif className="mb-[1.15em]">
        I&apos;m a Catholic Christian and healthtech entrepreneur focused on
        building reliable, explainable software for healthcare.
      </Lede>

      <Prose font="sans">
        <p>
          My background spans clinical care, academic research, and software engineering.
          Through direct exposure to patients and healthcare workflows, it became clear
          that much of the suffering in modern healthcare is not clinical, but infrastructural.
        </p>

        <p>
          That realization redirected my path from medical school, and I founded{" "}
          <TextLink href="https://www.serelora.com/">Serelora</TextLink>,
          a startup  building healthcare infrastructure that is trustworthy, explainable,
          and oriented toward human dignity.
        </p>
      </Prose>

      <div className="mt-7 flex gap-2 sm:gap-3">
        <Button grow href="/writing/behold-i-make-all-things-new">
          My Story
        </Button>
        <Button grow href="/work">
          My Work
        </Button>
        <Button grow href="/contact">
          Contact Me
        </Button>
      </div>

      <Section
        titleId="h-work"
        title="My Work"
        count={projectCount}
        more={{ href: '/work', label: 'My Work' }}
        className="mt-12 sm:pt-20"
      >
        <List>
          {projects.map((p) => (
            <ListRow
              key={p.href}
              href={p.href}
              title={p.title}
              subline={p.subline}
              meta={<ProjectMeta items={p.meta} />}
            />
          ))}
        </List>
      </Section>

      <Section
        titleId="h-writing"
        title="Writing"
        count={articleCount}
        more={{ href: '/writing', label: 'Writing' }}
      >
        <List>
          {articles.map((a) => (
            <ListRow key={a.href} href={a.href} title={a.title} subline={a.subline} meta={a.meta} />
          ))}
        </List>
      </Section>
    </Container>
  );
}
