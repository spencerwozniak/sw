import React from 'react';
import {
  Container,
  Portrait,
  Title,
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

const HERO_BUTTONS: Array<{ label: string; href: string }> = [
  { label: 'Get in touch', href: '/contact' },
  { label: 'My Work', href: '/work' },
  { label: 'My Story', href: '/writing/behold-i-make-all-things-new' },
];

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
      <div className="mb-10 flex items-center justify-between gap-6 border-b border-border pb-8">
        <Title as="h1" size="display" className="max-w-md text-[clamp(2.75rem,2rem+3vw,4rem)]!">
          Spencer Wozniak
        </Title>
        <div>
          <Portrait alt="Spencer Wozniak headshot" priority />
        </div>
      </div>

      <Lede serif className="mb-[1.15em]">
        I&apos;m a Catholic Christian and healthtech entrepreneur focused on
        building reliable, explainable software for healthcare.
      </Lede>

      <Prose tone="muted">
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

      <div className="mt-10 flex flex-wrap gap-2 sm:gap-3">
        {HERO_BUTTONS.map((b, i) => (
          <Button key={b.href} variant={i === 0 ? 'primary' : 'outline'} href={b.href}>
            {b.label}
          </Button>
        ))}
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
