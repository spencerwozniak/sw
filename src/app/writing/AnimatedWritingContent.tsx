'use client';

import { useRouter } from 'next/navigation';
import { FiChevronDown } from 'react-icons/fi';
import { scrollToId } from '@/lib/scroll';
import { Container, FadeIn, PageHeader, Button, ScrollCue, Section } from '@/components/ui';
import ArticleBrowser from './ArticleBrowser';

interface Article {
  id: string;
  title: string;
  date: string;
  name: string;
  contents: string;
  topic?: string;
}

interface Props {
  articles: Article[];
  publications: Article[];
}

export default function AnimatedWritingContent({ articles, publications }: Props) {
  const router = useRouter();

  const handleRandomArticle = () => {
    if (articles.length === 0) return;
    const randomIndex = Math.floor(Math.random() * articles.length);
    const randomArticle = articles[randomIndex];
    if (randomArticle?.id) {
      router.push(`/writing/${randomArticle.id}`);
    }
  };

  return (
    <FadeIn>
      <Container as="main" width="text">
        <PageHeader
          title="Writing"
          subtitle="Essays and publications"
          actions={
            <>
              <Button onClick={handleRandomArticle}>Random article</Button>
              <Button onClick={() => scrollToId('essays')} iconRight={<FiChevronDown />}>
                Essays
              </Button>
              <Button onClick={() => scrollToId('publications')} iconRight={<FiChevronDown />}>
                Publications
              </Button>
            </>
          }
        />
        <ScrollCue flush label="See more" targetId="essays" buttonLabel="Scroll to essays" />
        <Section titleId="essays" title="Essays" count={articles.length}>
          <ArticleBrowser itemsPerPage={6} data={articles} />
        </Section>
        <Section titleId="publications" title="Publications" count={publications.length}>
          <ArticleBrowser itemsPerPage={6} data={publications} showSearchBar={false} />
        </Section>
      </Container>
    </FadeIn>
  );
}
