// app/meetings/page.tsx
// "Whatever you do, do all to the glory of God." — 1 Cor 10:31
import Link from "next/link";

// Adjust this path to where your JSON lives (e.g., "@/data/meetings.json")
import meetingsData from "@/data/meetings.json";

type Meeting = {
  id: string;
  name: string;
  date: string; // "YYYY-MM-DD"
  time: string; // e.g. "10:00 AM PDT"
  description: string;
};

function toTimestamp(m: Meeting): number {
  // Handle common TZ abbreviations (extend as needed)
  const tzFixed = m.time
    .replace(/\bPDT\b/, "-07:00")
    .replace(/\bPST\b/, "-08:00");

  // Try parse with time + offset first
  const candidate = `${m.date} ${tzFixed}`;
  const t1 = Date.parse(candidate);

  if (!Number.isNaN(t1)) return t1;

  // Fallback: date-only
  const t2 = Date.parse(m.date);
  return Number.isNaN(t2) ? 0 : t2;
}

function formatDate(isoDate: string): string {
  const d = new Date(isoDate);
  // If parsing fails (NaN), gracefully return the original string
  if (Number.isNaN(d.getTime())) return isoDate;
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(d);
}

export const metadata = {
  title: "Meetings",
  description: "Browse all meetings, newest first.",
};

export default function MeetingsPage() {
  const meetings = (meetingsData as Meeting[])
    .slice()
    .sort((a, b) => toTimestamp(b) - toTimestamp(a));

  return (
    <main className="mx-auto max-w-6xl px-4 py-20">
      <div className="text-center">
        <h1 className="text-3xl font-semibold tracking-tight">Meetings</h1>
        <p className="mt-2">
          &quot;Teach us to number our days that we may get a heart of
          wisdom.&quot; — Psalm 90:12
        </p>
      </div>
      <ul className="mt-8 space-y-6">
        {meetings.map((meeting) => (
          <li key={meeting.id}>
            <Link
              href={`/meetings/${meeting.id}`}
              prefetch={false}
              aria-label={`Open meeting ${meeting.name}`}
              className="block transition-transform hover:-translate-y-0.5 !text-neutral-200"
            >
              <header className="border border-gray-200 p-6 shadow-sm">
                <h2 className="text-2xl font-semibold tracking-tight text-white">
                  {meeting.name}
                </h2>

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
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
