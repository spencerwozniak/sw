import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Chatbot from "@/components/Chatbot";
import articles from "@/data/articles.json";
import AnimatedArticleContent from "./AnimatedArticleContent";

interface Article {
  id: string;
  title: string;
  topic: string;
  date: string;
  name: string;
  contents: string;
  image: [string, string];
  keywords?: string[];
}

interface Props {
  params: { id: string };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const article = articles.find((p) => p.id === params.id);

  if (!article) return {};

  const fullTitle = `${article.title} | Spencer Wozniak`;
  const description = `Read "${article.title}", an article published on ${article.date} by Spencer Wozniak.`;

  return {
    title: fullTitle,
    description,
    keywords: article.keywords || ["Spencer Wozniak", article.title],
    robots: { index: true, follow: true },
    alternates: {
      canonical: `https://www.spencerwozniak.com/writing/${params.id}`,
    },
    openGraph: {
      title: fullTitle,
      description,
      url: `https://www.spencerwozniak.com/writing/${params.id}`,
      type: "article",
      publishedTime: new Date(article.date).toISOString(),
      images: [
        {
          url: `https://www.spencerwozniak.com/sw-full-signature-white.png`,
          width: 800,
          height: 400,
          alt: "Spencer Wozniak Signature",
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: fullTitle,
      description,
      images: [`https://www.spencerwozniak.com/sw-full-signature-white.png`],
    },
    other: {
      "article:published_time": new Date(article.date).toISOString(),
      "article:author": "Spencer Wozniak",
      "article:section": "Article",
      "article:tag": "Spencer Wozniak",
    },
  };
}

export function generateStaticParams() {
  return articles.map((article) => ({ id: article.id }));
}

export default function ArticlePage({ params }: Props) {
  const article: Article | undefined = articles.find((p) => p.id === params.id);
  const currentIndex = articles.findIndex((p) => p.id === params.id);
  const nextArticle = currentIndex > 0 ? articles[currentIndex - 1] : null;
  const prevArticle =
    currentIndex < articles.length - 1 ? articles[currentIndex + 1] : null;

  if (!article) return notFound();

  return (
    <>
      <AnimatedArticleContent
        article={article}
        prevArticle={prevArticle}
        nextArticle={nextArticle}
      />
      <Chatbot />
    </>
  );
}
