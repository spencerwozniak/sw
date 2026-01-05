// src/app/meetings/[id]/page.tsx
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import path from "path";
import fs from "fs/promises";
import ClientMeetingPage from "./ClientMeetingPage";
import meetings from "@/data/meetings.json";

type MeetingMeta = {
  id: string;
  name: string;
  date: string;       // ISO YYYY-MM-DD
  time: string;       // "10:00 AM PT"
  description: string;
};

// NOTE: params is now a Promise in Next 15
type Params = { params: Promise<{ id: string }> };

export const dynamicParams = false;

export async function generateStaticParams() {
  return (meetings as MeetingMeta[]).map((m) => ({ id: m.id }));
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { id } = await params;                // ✅ await params
  const m = (meetings as MeetingMeta[]).find((x) => x.id === id);
  if (!m) return {};
  const title = `${m.name}`;
  return {
    title,
    description: m.description,
    openGraph: { title, description: m.description, type: "article" },
    twitter: { card: "summary", title, description: m.description },
  };
}

export default async function Page({ params }: Params) {
  const { id } = await params;                // ✅ await params

  const meta = (meetings as MeetingMeta[]).find((m) => m.id === id);
  if (!meta) notFound();

  const baseDir = path.join(process.cwd(), "src", "data", "meetings", id);

  try {
    const [summaryBuf, transcriptBuf] = await Promise.all([
      fs.readFile(path.join(baseDir, "summary.md")),
      fs.readFile(path.join(baseDir, "transcript.txt")),
    ]);

    const summary = summaryBuf.toString("utf-8");
    const transcript = transcriptBuf.toString("utf-8");

    return (
      <ClientMeetingPage
        meeting={{
          ...meta,
          summary,
          transcript,
        }}
      />
    );
  } catch (err) {
    console.error(`Failed to load meeting files for ${id}:`, err); // use id you already awaited
    notFound();
  }
}

