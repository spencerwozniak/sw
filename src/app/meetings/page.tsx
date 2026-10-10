// app/meetings/page.tsx
// "Whatever you do, do all to the glory of God." — 1 Cor 10:31
import { Container, FadeIn, List, ListRow, PageHeader, Scripture, SpecTable } from "@/components/ui";

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
  // "YYYY-MM-DD" parses as UTC midnight; format in UTC so the day doesn't shift.
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(d);
}

export const metadata = {
  title: "Meetings",
  description: "Browse all meetings, newest first.",
  robots: { index: false, follow: false },
};

export default function MeetingsPage() {
  const meetings = (meetingsData as Meeting[])
    .slice()
    .sort((a, b) => toTimestamp(b) - toTimestamp(a));

  return (
    <FadeIn>
      <Container as="main" width="text">
        <PageHeader title="Meetings">
          <Scripture cite="— Psalm 90:12">
            &quot;Teach us to number our days that we may get a heart of wisdom.&quot;
          </Scripture>
        </PageHeader>
        <List>
          {meetings.map((meeting) => (
            <ListRow
              key={meeting.id}
              href={`/meetings/${meeting.id}`}
              prefetch={false}
              ariaLabel={`Open meeting ${meeting.name}`}
              title={meeting.name}
              subline={
                <SpecTable
                  as="span"
                  variant="inline"
                  items={[
                    { label: "Date", value: formatDate(meeting.date) },
                    { label: "Time", value: meeting.time },
                    { label: "ID", value: meeting.id },
                  ]}
                />
              }
              preview={meeting.description}
            />
          ))}
        </List>
      </Container>
    </FadeIn>
  );
}
