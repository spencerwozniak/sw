"use client";

import Image from "next/image";
// Equations are rendered to HTML when an article is saved, so only the stylesheet is needed here.
import "katex/dist/katex.min.css";
import { Breadcrumb, Container, FadeIn, Frame, PageHeader, PrevNext, Prose } from "@/components/ui";
import ShareButtons from "./_components/ShareButtons";

interface Article {
  id: string;
  title: string;
  topic: string;
  date: string;
  name: string;
  contents: string;
  image: string[];
  keywords?: string[];
}

interface Props {
  article: Article;
  prevArticle: Article | null;
  nextArticle: Article | null;
}

export default function ArticlePage({
  article,
  prevArticle,
  nextArticle,
}: Props) {
  return (
    <FadeIn>
      <Container as="main" width="text">
        <div className="pt-8 sm:pt-12">
          <Breadcrumb
            items={[
              { label: "Writing", href: "/writing" },
              { label: article.title },
            ]}
          />
        </div>

        <article>
          <PageHeader
            flush
            divider
            className="mt-7 sm:mt-10"
            title={article.title}
            byline={article.name}
            meta={
              <>
                {article.topic} | {article.date}
              </>
            }
          >
            <ShareButtons articleId={article.id} />
          </PageHeader>

          {article.image.length > 0 && (
            <Frame
              caption={article.image[1]}
              className="my-6 sm:float-left sm:mr-6 sm:w-[300px]"
            >
              <Image
                src={`/articles/${article.image[0]}`}
                alt={article.image[1]}
                width={300}
                height={200}
                className="h-auto w-full"
              />
            </Frame>
          )}

          <Prose size="lg">
            <div dangerouslySetInnerHTML={{ __html: article.contents }} />
          </Prose>
          <div className="clear-both" />
        </article>

        <PrevNext
          ariaLabel="More writing"
          prev={
            prevArticle && {
              href: `/writing/${prevArticle.id}`,
              title: prevArticle.title,
              label: "← Previous",
            }
          }
          next={
            nextArticle && {
              href: `/writing/${nextArticle.id}`,
              title: nextArticle.title,
              label: "Next →",
            }
          }
        />
      </Container>
    </FadeIn>
  );
}
