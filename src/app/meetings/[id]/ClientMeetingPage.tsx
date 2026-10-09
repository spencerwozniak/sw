"use client";

import React from "react";
import ReactMarkdown from "react-markdown";
import { FiCheck, FiCopy } from "react-icons/fi";
import { mdxComponents } from "@/utils/mdxComponents";
import {
  Button,
  Container,
  FadeIn,
  PageHeader,
  Panel,
  Prose,
  SpecTable,
  Tab,
  TabList,
  TabPanel,
} from "@/components/ui";

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

type TabValue = "summary" | "transcript";

export default function ClientMeetingPage({ meeting }: { meeting: Meeting }) {
  const [tab, setTab] = React.useState<TabValue>("summary");

  return (
    <FadeIn>
      <Container as="main" width="text">
        <PageHeader title={meeting.name} />

        <SpecTable
          variant="grid"
          items={[
            { label: "Date", value: formatDate(meeting.date) },
            { label: "Time", value: meeting.time },
            { label: "ID", value: meeting.id },
          ]}
        />
        <Prose font="sans" className="mt-5">
          <p>{meeting.description}</p>
        </Prose>

        <div className="mt-10">
          <TabList label="Meeting">
            <Tab
              selected={tab === "summary"}
              onClick={() => setTab("summary")}
              id="meeting-tab-summary"
              controls={tab === "summary" ? "meeting-panel-summary" : undefined}
            >
              Summary
            </Tab>
            <Tab
              selected={tab === "transcript"}
              onClick={() => setTab("transcript")}
              id="meeting-tab-transcript"
              controls={tab === "transcript" ? "meeting-panel-transcript" : undefined}
            >
              Transcript
            </Tab>
          </TabList>
        </div>

        <TabPanel
          id={tab === "summary" ? "meeting-panel-summary" : "meeting-panel-transcript"}
          labelledBy={tab === "summary" ? "meeting-tab-summary" : "meeting-tab-transcript"}
          className="mt-6"
        >
          {tab === "summary" ? (
            <CopyBox label="Copy summary" text={meeting.summary}>
              <Prose>
                <ReactMarkdown components={mdxComponents}>{meeting.summary}</ReactMarkdown>
              </Prose>
            </CopyBox>
          ) : (
            <CopyBox label="Copy transcript" text={meeting.transcript}>
              <Prose font="sans">
                <pre className="prose-pre-plain">{meeting.transcript}</pre>
              </Prose>
            </CopyBox>
          )}
        </TabPanel>
      </Container>
    </FadeIn>
  );
}

/* ---------------- Copyable Box ---------------- */

function CopyBox({
  children,
  text,
  label,
}: {
  children: React.ReactNode;
  text: string;
  label: string;
}) {
  const [copied, setCopied] = React.useState(false);

  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1400);
    } catch (e) {
      console.error("Copy failed:", e);
    }
  };

  return (
    <Panel>
      <div className="mb-4 flex justify-end">
        <Button
          size="sm"
          className="max-sm:gap-0"
          onClick={onCopy}
          aria-label={label}
          title={label}
          icon={copied ? <FiCheck /> : <FiCopy />}
        >
          <span className="hidden sm:inline">{copied ? "Copied" : "Copy"}</span>
        </Button>
      </div>
      {children}
    </Panel>
  );
}

/* ---------------- Helpers ---------------- */

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
