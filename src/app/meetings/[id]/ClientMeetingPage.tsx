"use client";

import React from "react";
import ReactMarkdown from "react-markdown";
import { Copy, Check } from "lucide-react";
import { mdxComponents } from "@/utils/mdxComponents";

/* ---------------- Types ---------------- */
type Meeting = {
  id: string;
  name: string;
  date: string;
  time: string;
  description: string;
  summary: string; // markdown
  transcript: string; // plain text (or markdown if you prefer)
};

export default function ClientMeetingPage({ meeting }: { meeting: Meeting }) {
  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      {/* Header */}
      <header className="border border-gray-200 p-6 shadow-sm">
        <h1 className="text-2xl font-semibold tracking-tight">
          {meeting.name}
        </h1>
        <div className="mt-3 grid gap-2 text-sm sm:grid-cols-3">
          <div className="flex items-center gap-2">
            <span className="inline-block border border-gray-200 px-2 py-1 text-xs font-medium">
              Date
            </span>
            <span>{formatDate(meeting.date)}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-block border border-gray-200 px-2 py-1 text-xs font-medium">
              Time
            </span>
            <span>{meeting.time}</span>
          </div>
          <div className="flex items-center gap-2 sm:col-span-1 sm:justify-end">
            <span className="inline-block border border-gray-200 px-2 py-1 text-xs font-medium">
              ID
            </span>
            <code className="px-1 py-0.5">{meeting.id}</code>
          </div>
        </div>
        <p className="mt-4">{meeting.description}</p>
      </header>

      {/* Body */}
      <main className="mt-8">
        <Tabs>
          <TabsList>
            <TabsTrigger value="summary">Summary</TabsTrigger>
            <TabsTrigger value="transcript">Transcript</TabsTrigger>
          </TabsList>

          <TabsContent value="summary" className="mt-4">
            <CopyBox getText={() => meeting.summary} label="Copy summary">
              <article className="prose prose-neutral dark:prose-invert max-w-none px-2">
                <ReactMarkdown components={mdxComponents}>
                  {meeting.summary}
                </ReactMarkdown>
              </article>
            </CopyBox>
          </TabsContent>

          <TabsContent value="transcript" className="mt-4">
            <CopyBox getText={() => meeting.transcript} label="Copy transcript">
              <article className="prose prose-neutral max-w-none">
                {/* If you want markdown here too, swap ReactMarkdown in */}
                <pre className="whitespace-pre-wrap break-words text-sm leading-relaxed">
                  {meeting.transcript}
                </pre>
              </article>
            </CopyBox>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}

/* ---------------- Copyable Box ---------------- */

function CopyBox({
  children,
  getText,
  label = "Copy",
}: {
  children: React.ReactNode;
  getText: () => string;
  label?: string;
}) {
  const [copied, setCopied] = React.useState(false);

  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(getText());
      setCopied(true);
      const t = setTimeout(() => setCopied(false), 1400);
      return () => clearTimeout(t);
    } catch (e) {
      console.error("Copy failed:", e);
    }
  };

  return (
    <section className="relative border border-gray-200 p-4 shadow-sm">
      <button
        type="button"
        onClick={onCopy}
        className="cursor-pointer absolute right-3 top-3 inline-flex items-center gap-1 border border-gray-200 px-2 py-1 text-xs font-medium hover:bg-neutral-100 active:scale-[0.98]"
        aria-label={label}
        title={label}
      >
        {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
        <span className="hidden sm:inline">{copied ? "Copied" : "Copy"}</span>
      </button>
      {children}
    </section>
  );
}

/* ---------------- Helpers & Tiny Tabs UI ---------------- */

export function formatDate(iso: string) {
  try {
    const d = new Date(iso + "T00:00:00");
    return d.toLocaleDateString(undefined, {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  } catch {
    return iso;
  }
}

type TabsCtx = { value: string; setValue: (v: string) => void };
const TabsContext = React.createContext<TabsCtx | null>(null);

function Tabs({
  children,
  defaultValue = "summary",
}: {
  children: React.ReactNode;
  defaultValue?: string;
}) {
  const [value, setValue] = React.useState(defaultValue);
  return (
    <TabsContext.Provider value={{ value, setValue }}>
      {children}
    </TabsContext.Provider>
  );
}

function TabsList({ children }: { children: React.ReactNode }) {
  return (
    <div className="inline-flex border border-neutral-700 p-1 shadow-sm">
      {children}
    </div>
  );
}

function TabsTrigger({
  value,
  children,
}: {
  value: string;
  children: React.ReactNode;
}) {
  const ctx = React.useContext(TabsContext);
  if (!ctx) return null;
  const active = ctx.value === value;
  return (
    <button
      onClick={() => ctx.setValue(value)}
      className={[
        "min-w-[120px] px-4 py-2 text-sm font-medium transition",
        active
          ? "!bg-neutral-800 text-white shadow"
          : "text-neutral-300 hover:bg-neutral-100",
      ].join(" ")}
      type="button"
      aria-pressed={active}
    >
      {children}
    </button>
  );
}

function TabsContent({
  value,
  children,
  className = "",
}: {
  value: string;
  children: React.ReactNode;
  className?: string;
}) {
  const ctx = React.useContext(TabsContext);
  if (!ctx) return null;
  if (ctx.value !== value) return null;
  return <div className={className}>{children}</div>;
}
