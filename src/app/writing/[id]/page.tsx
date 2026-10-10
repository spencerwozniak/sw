import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Chatbot from "@/components/Chatbot";
import { getPublishedArticles } from "@/lib/content/articles";
import { htmlToText, toDescription } from "@/lib/articles/text";
import { jsonLd } from "@/lib/json-ld";
import ArticlePage from "./ArticlePage";

const SITE_URL = "https://www.spencerwozniak.com";
const fullSiteUrl = SITE_URL.replace(/\/$/, "");

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const article = (await getPublishedArticles()).find((p) => p.id === id);

  if (!article) return {};

  const articleUrl = `${fullSiteUrl}/writing/${id}`;
  const fullTitle = `${article.title} | Spencer Wozniak`;
  const description = toDescription(article.contents);

  return {
    title: article.title,
    description,
    keywords: article.keywords || ["Spencer Wozniak", article.title],
    authors: [{ name: article.name, url: fullSiteUrl }],
    creator: "Spencer Wozniak",
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        "max-image-preview": "large",
        "max-snippet": -1,
        "max-video-preview": -1,
      },
    },
    alternates: {
      canonical: articleUrl,
    },
    openGraph: {
      title: fullTitle,
      description,
      url: articleUrl,
      siteName: "Spencer Wozniak",
      type: "article",
      publishedTime: article.isoDate,
      modifiedTime: article.isoDate,
      authors: [article.name],
      tags: article.keywords || ["Spencer Wozniak"],
      images: [
        {
          url: `https://www.spencerwozniak.com/sw-full-signature-white.png`,
          width: 800,
          height: 400,
          alt: "Spencer Wozniak Signature",
        },
      ],
      locale: "en_US",
    },
    twitter: {
      card: "summary_large_image",
      title: fullTitle,
      description,
      images: [`https://www.spencerwozniak.com/sw-full-signature-white.png`],
    },
    other: {
      "article:published_time": article.isoDate,
      "article:modified_time": article.isoDate,
      "article:author": "Spencer Wozniak",
      "article:section": "Article",
      "article:tag": "Spencer Wozniak",
      "article:publisher": "Spencer Wozniak",
    },
  };
}

export async function generateStaticParams() {
  return (await getPublishedArticles()).map((article) => ({ id: article.id }));
}

export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const articlesList = await getPublishedArticles();
  const article = articlesList.find((p) => p.id === id);

  if (!article) return notFound();

  const currentIndex = articlesList.findIndex((p) => p.id === id);
  const nextArticle = currentIndex > 0 ? articlesList[currentIndex - 1] : null;
  const prevArticle =
    currentIndex < articlesList.length - 1
      ? articlesList[currentIndex + 1]
      : null;

  const articleUrl = `${fullSiteUrl}/writing/${id}`;
  const contentText = htmlToText(article.contents).slice(0, 5000);

  const articleSchema = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: article.title,
    description: contentText.slice(0, 160),
    image: `${fullSiteUrl}/sw-full-signature-white.png`,
    datePublished: article.isoDate,
    dateModified: article.isoDate,
    author: {
      "@type": "Person",
      name: article.name,
      url: fullSiteUrl,
    },
    publisher: {
      "@type": "Person",
      name: "Spencer Wozniak",
      url: fullSiteUrl,
    },
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": articleUrl,
    },
    articleSection: "Article",
    keywords: article.keywords?.join(", ") || "Spencer Wozniak",
    url: articleUrl,
  };

  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: fullSiteUrl },
      {
        "@type": "ListItem",
        position: 2,
        name: "Writing",
        item: `${fullSiteUrl}/writing`,
      },
      {
        "@type": "ListItem",
        position: 3,
        name: article.title,
        item: articleUrl,
      },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLd(articleSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLd(breadcrumbSchema) }}
      />
      <ArticlePage
        article={article}
        prevArticle={prevArticle}
        nextArticle={nextArticle}
      />
      <Chatbot />
    </>
  );
}
