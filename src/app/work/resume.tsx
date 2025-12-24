// app/work/resume.tsx
'use client';

import {
  FaServer,
  FaGraduationCap,
  FaHandsHelping,
  FaFileMedical,
  FaHandHoldingHeart,
  FaProjectDiagram,
  FaUsers,
  FaChalkboardTeacher,
  FaHeartbeat,
  FaAward,
  FaReact,
  FaDatabase,
  FaLock,
  FaRobot,
  FaStethoscope,
  FaCogs,
  FaChartBar,
} from 'react-icons/fa';
import Link from 'next/link';
import React from 'react';

const ACCENT = '#bfaa8d';

type StackSet = { title: string; items: string[] };

const STACK: StackSet[] = [
  {
    title: 'Frontend',
    items: [
      'Next.js',
      'React',
      'TypeScript',
      'Tailwind CSS',
    ],
  },
  {
    title: 'Backend & Data',
    items: [
      'Node.js', 
      'Python', 
      'Flask', 
      'Prisma', 
      'Postgres', 
      'REST APIs'],
  },
  {
    title: 'Auth & Payments',
    items: [
      'Clerk / Auth.js', 
      'OAuth2 / OIDC', 
      'Stripe (subs, invoicing)'
    ],
  },
  {
    title: 'AI / ML',
    items: [
      'PyTorch',
      'GNNs',
      'CNNs',
      'Transformers',
      'MoEs',
      'Transfer learning',
      'MLPs',
    ],
  },
  {
    title: 'Agentic AI',
    items: [
      'OpenAI API',
      'Multi-agent orchestration',
      'Tool / function calling',
      'Streaming UI',
      'Structured extraction',
    ],
  },
  {
    title: 'Healthcare',
    items: [
      'SMART on FHIR embed',
      'FHIR resources',
      'EHR-agnostic overlay',
      'PHI scoping & redaction',
      'Human-in-the-loop guardrails',
    ],
  },
  {
    title: 'Apps & Infra',
    items: [
      'Electron desktop wrapper',
      'Vercel deploys',
      'Cloudflare DNS',
      'Caching & code-splitting',
      'Sitemap / robots config',
    ],
  },
  {
    title: 'Content, SEO & Analytics',
    items: [
      'SEO (local + technical)',
      'OpenGraph / metadata',
      'Google Docs API ingestion',
      'Dashboards & admin tools',
      'Analytics & tracking',
    ],
  },
];

// Per-category icon + subtle color accents (mirrors your example style)
const STACK_ICONS: Record<string, React.ReactNode> = {
  'Frontend': <FaReact className="h-5 w-5" />,
  'Backend & Data': <FaDatabase className="h-5 w-5" />,
  'Auth & Payments': <FaLock className="h-5 w-5" />,
  'AI / ML': <FaChartBar className="h-5 w-5" />,
  'Agentic AI': <FaRobot className="h-5 w-5" />,
  'Healthcare': <FaStethoscope className="h-5 w-5" />,
  'Apps & Infra': <FaCogs className="h-5 w-5" />,
  'Content, SEO & Analytics': <FaServer className="h-5 w-5" />,
};

const STACK_STYLES: Record<
  string,
  { badgeBg: string; badgeText: string; ring: string }
> = {
  'Frontend': { badgeBg: 'bg-sky-900/30', badgeText: 'text-sky-300', ring: 'ring-sky-900/40' },
  'Backend & Data': { badgeBg: 'bg-emerald-900/30', badgeText: 'text-emerald-300', ring: 'ring-emerald-900/40' },
  'Auth & Payments': { badgeBg: 'bg-indigo-900/30', badgeText: 'text-indigo-300', ring: 'ring-indigo-900/40' },
  'AI / ML': { badgeBg: 'bg-fuchsia-900/30', badgeText: 'text-fuchsia-300', ring: 'ring-fuchsia-900/40' },
  'Agentic AI': { badgeBg: 'bg-amber-900/30', badgeText: 'text-amber-300', ring: 'ring-amber-900/40' },
  'Healthcare': { badgeBg: 'bg-rose-900/30', badgeText: 'text-rose-300', ring: 'ring-rose-900/40' },
  'Apps & Infra': { badgeBg: 'bg-purple-900/30', badgeText: 'text-purple-300', ring: 'ring-purple-900/40' },
  'Content, SEO & Analytics': { badgeBg: 'bg-cyan-900/30', badgeText: 'text-cyan-300', ring: 'ring-cyan-900/40' },
};

function StackCard({ title, items }: { title: string; items: string[] }) {
  const style = STACK_STYLES[title] ?? {
    badgeBg: 'bg-white/10',
    badgeText: 'text-gray-200',
    ring: 'ring-white/10',
  };

  return (
    <div className="mb-6 break-inside-avoid rounded-2xl border border-white/10 bg-white/[0.035] p-5 hover:bg-white/[0.05] transition">
      <div className="flex items-center gap-3">
        <span className={`inline-flex items-center justify-center rounded-xl p-2 ${style.badgeBg}`}>
          <span className={`${style.badgeText}`} aria-hidden>
            {STACK_ICONS[title] ?? <FaCogs className="h-5 w-5" />}
          </span>
        </span>
        <p className="text-sm font-semibold text-white">{title}</p>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        {items.map((it) => (
          <span
            key={it}
            className="rounded-full border border-white/15 px-3 py-1 text-xs text-gray-200 bg-white/5"
          >
            {it}
          </span>
        ))}
      </div>
    </div>
  );
}


function SectionFrame({
  children,
  title,
  subtitle,
}: {
  children?: React.ReactNode;
  title?: string;
  subtitle?: string;
}) {
  return (
    <section className="relative overflow-hidden">
      <div className="relative mx-auto max-w-7xl px-5 py-10">
        {title && (
          <h2 className="text-3xl md:text-4xl font-semibold text-white mb-6 text-center">{title}</h2>
        )}
        {subtitle && <p className="mt-3 text-gray-300 text-center">{subtitle}</p>}
        {children}
      </div>
    </section>
  );
}

function SectionCard({ children }: { children: React.ReactNode }) {
  return (
    <div className="p-6 md:p-8">
      {children}
    </div>
  );
}

/* ---------- Resume blocks (same content as your resume page, restyled) ---------- */

function KVP({ children }: { children: React.ReactNode }) {
  return <p className="text-base text-gray-300">{children}</p>;
}
function Bullets({ items }: { items?: React.ReactNode[] }) {
  if (!items?.length) return null;
  return (
    <ul className="mt-3 list-disc pl-5 text-slate-200">
      {items.map((n, i) => (
        <li key={i} className="mb-2 leading-relaxed">
          {n}
        </li>
      ))}
    </ul>
  );
}
function Block({
  icon: Icon,
  header,
  org,
  dates,
  bullets,
  extras,
}: {
  icon: React.ComponentType;
  header: string;
  org?: React.ReactNode;
  dates?: string;
  bullets?: React.ReactNode[];
  extras?: { heading: string; items: React.ReactNode[] }[];
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-neutral-900/40 p-5">
      <h3 className="text-lg font-semibold text-gray-100 mb-2 flex items-center">
        <Icon className="mr-3 text-2xl" style={{ color: ACCENT }} />
        {header}
      </h3>
      {org && <KVP>{org}</KVP>}
      {dates && <KVP>{dates}</KVP>}
      <Bullets items={bullets} />
      {extras?.map((ex, i) => (
        <div key={i} className="mt-4">
          <p className="font-semibold text-gray-100">{ex.heading}</p>
          <Bullets items={ex.items} />
        </div>
      ))}
    </div>
  );
}

/* ---------- Static content (copied & condensed from your resume page) ---------- */

const EDUCATION = [
  {
    icon: FaGraduationCap,
    header: 'Michigan State University',
    org: <strong>B.S. in Human Biology, Minor in Bioethics</strong>,
    dates: 'Sep 2020 – May 2024',
    bullets: [<>GPA: 3.91 (Honors) &nbsp; | &nbsp; MCAT: 524</>],
  },
];

const CLINICAL = [
  {
    icon: FaHandsHelping,
    header: 'Applied Behavior Analysis Therapist',
    org: <strong>Coyne and Associates | San Diego, CA</strong>,
    dates: 'Aug 2024 – Present',
    bullets: [
      <>Conducted individualized therapy sessions to help children diagnosed with autism spectrum disorder and other developmental disabilities using evidence-based ABA techniques.</>,
      <>Implemented targeted interventions to develop functional communication for nonverbal children.</>,
      <>Taught emotional regulation techniques to reduce negative emotions and challenging behaviors.</>,
      <>Supported development of gross motor skills through structured play and movement-based activities.</>,
      <>Collected and analyzed detailed session data in an electronic health record to track client progress, analyze behavioral trends, and refine interventions.</>,
      <>Collaborated with caregivers to promote consistency across environments, ensure treatment compliance, and maintain behavioral improvements.</>,
      <>Conducted hands-on training for new ABA therapists using a structured four-phase model.</>,
      <>Delivered constructive feedback to trainees on clinical performance, professionalism, and data accuracy.</>,
      <>Collaborated with Regional Directors to monitor trainee progress and ensure adherence to protocols.</>,
      <>Participated in trainer meetings and contributed to updates in training procedures and clinical standards.</>,
    ],
  },
  {
    icon: FaFileMedical,
    header: 'Medical Scribe',
    org: <strong>Memorial Healthcare | Owosso, MI</strong>,
    dates: 'Jul 2023 – Aug 2024',
    bullets: [
      <>Assisted several emergency and internal medicine physicians in the ED and ICU by documenting histories, exam findings, procedures, orders, and assessment & plans for up to 20 patients per shift.</>,
      <>Collected preliminary patient histories and medication lists to improve physician efficiency.</>,
      <>Interpreted laboratory values to streamline documentation and highlight critical findings.</>,
      <>Reviewed and abstracted data from medical charts to support clinical decision-making.</>,
      <>Collaborated with nursing staff to support unit operations, including restocking rooms and delivering comfort items and basic support to patients.</>,
    ],
  },
  {
    icon: FaHandHoldingHeart,
    header: 'Hospital Volunteer',
    org: <strong>Sparrow Hospital | Lansing, MI</strong>,
    dates: 'Sep 2022 – Apr 2023',
    bullets: [
      <>Supported nursing staff in an inpatient unit by assisting with up to 40 patients per shift.</>,
      <>Answered patient call lights to provide timely assistance with comfort, mobility, and basic care needs.</>,
      <>Sat with patients who had no visitors, offering companionship, emotional support, and conversation during long or isolating hospital stays.</>,
      <>Measured vital signs, transported patients within the hospital, and observed diagnostic imaging exams.</>,
    ],
  },
];

const RESEARCH = [
  {
    icon: FaProjectDiagram,
    header: 'Biochemistry Research Assistant',
    org: <strong>Michigan State University | East Lansing, MI</strong>,
    dates: 'Sep 2020 – Apr 2025',
    bullets: [
      <>Assisted in study startup activities and research protocol design under Dr. Michael Feig.</>,
      <>Utilized Python, C++, Bash, and Excel to conduct statistical analyses, verify simulation accuracy, and refine artificial intelligence (AI) models to optimize performance.</>,
      <>Developed AI models including convolutional and graph neural networks, and transformers.</>,
      <>Curated and maintained large datasets to train AI algorithms for applications in biochemistry.</>,
      <>Collaborated with interdisciplinary teams to present research findings and refine methodologies.</>,
    ],
    extras: [
      {
        heading: 'Publications',
        items: [
          <>
            <a
              href="https://doi.org/10.1021/acs.jctc.4c01682"
              target="_blank"
              className="underline underline-offset-2 hover:text-gray-300"
            >
              Wozniak S, Janson G, Feig M. (2025). Accurate Predictions of Molecular Properties of Proteins via GNNs
              and Transfer Learning. <em>JCTC</em>.
            </a>
          </>,
          <>
            <a
              href="https://doi.org/10.1021/acs.jpcb.4c06877"
              target="_blank"
              className="underline underline-offset-2 hover:text-gray-300"
            >
              Wozniak S, Feig M. (2024). Diffusion and Viscosity in Mixed Protein Solutions. <em>JPCB</em>.
            </a>
          </>,
        ],
      },
      {
        heading: 'Other Projects',
        items: [
          <>
            <span className="font-medium">
              Molecular Dynamics Simulations of Monoclonal Antibodies (Sep 2020 – Jan 2021)
            </span>
            <ul className="list-disc pl-5 mt-2">
              <li>Evaluated the stability and solubility of various monoclonal antibody candidates for treating cancer in physiological conditions.</li>
              <li>Found the candidates to be structurally unstable and unsuitable for therapeutic use.</li>
              <li>Presented findings to FAU collaborator.</li>
            </ul>
          </>,
        ],
      },
    ],
  },
  {
    icon: FaUsers,
    header: 'Sociology Research Assistant',
    org: <strong>Michigan State University | East Lansing, MI</strong>,
    dates: 'Jan 2024 – Apr 2024',
    bullets: [
      <>
        Designed and launched a research project investigating the social determinants of electronic health record quality, including conducting literature reviews, and compiling and analyzing complex datasets with Dr. Stephen Gasteyer.
      </>,
    ],
    extras: [
      {
        heading: 'Projects',
        items: [
          <>
            <span className="font-medium">
              The Social Determinants of EHR Quality in US Hospitals (Jan 2024 – Apr 2024)
            </span>
            <ul className="list-disc pl-5 mt-2">
              <li>Compiled data from American Community Survey and American Hospital Association.</li>
              <li>Explored how social factors relate to electronic health record quality across US hospitals.</li>
              <li>Calculated odds ratios from a logistic regression to assess statistical significance.</li>
              <li>
                Presented{' '}
                <a href="/sdoehrq.pdf" target="_blank" className="underline underline-offset-2 hover:text-gray-300">
                  <strong>poster</strong>
                </a>{' '}
                at the 2024 University Undergraduate Research and Arts Forum at MSU.
              </li>
            </ul>
          </>,
        ],
      },
    ],
  },
];

const TEACHING = [
  {
    icon: FaChalkboardTeacher,
    header: 'Founder & Tutor',
    org: (
      <Link href="https://www.wozprep.org" target="_blank" className="underline underline-offset-2 hover:text-gray-300">
        <strong>WozPrep | San Diego, CA</strong>
      </Link>
    ),
    dates: 'Nov 2024 – Present',
    bullets: [
      <>Founded a private tutoring service with a custom-built website and student-facing tools.</>,
      <>Conducted 1-on-1 tutoring sessions focused on test strategy, critical thinking, and content mastery.</>,
      <>Applied the Socratic method to foster deeper student engagement and independent problem-solving.</>,
      <>Integrated principles of positive psychology to build student confidence and promote motivation.</>,
      <>Created personalized study plans based on student strengths, weaknesses, and time constraints.</>,
      <>Helped students improve scores by up to 50 percentile points.</>,
      <>Utilized Next.js, TypeScript, and React to develop an interactive website with modern UI/UX design to manage client inquiries, promote services, and host content.</>,
      <>Built a web-based portal for MCAT practice tests and question banks, featuring original questions tailored to AAMC-style reasoning and pacing.</>,
      <>Leveraged search engine optimization to increase visibility through online outreach.</>,
    ],
  },
];

const CERTS = [
  {
    icon: FaHeartbeat,
    header: 'Basic Life Support (BLS)',
    org: <strong>American Heart Association</strong>,
    dates: 'Issued Feb 2025 • Expires Feb 2027',
  },
];

const AWARDS = [
  {
    icon: FaAward,
    header: 'Distinguished Freshman Scholarship',
    org: <strong>MSU Honors College</strong>,
    dates: 'Issued Sep 2020',
    bullets: [<>Full-tuition academic scholarship for outstanding achievement.</>],
  },
];

export default function Resume() {
  return (
    <div>
      {/* What I Build With (replaces old band) */}
      <SectionFrame
        title="What I Build With"
        subtitle="The stack, patterns, and platforms used across my projects."
      >
        <SectionCard>
          {/* Masonry-style multi-column layout so cards can be different heights */}
          <div className="mt-6 [column-gap:1.5rem] columns-1 sm:columns-2 lg:columns-3">
            {STACK.map((set) => (
              <StackCard key={set.title} title={set.title} items={set.items} />
            ))}
          </div>
        </SectionCard>
      </SectionFrame>

      {/* Education */}
      <SectionFrame title="Education">
        <div className="grid gap-4">
          {EDUCATION.map((b, i) => (
            <Block key={i} {...b} />
          ))}
        </div>
      </SectionFrame>

      {/* Clinical Experience */}
      <SectionFrame title="Clinical Experience">
        <div className="grid gap-4">
          {CLINICAL.map((b, i) => (
            <Block key={i} {...b} />
          ))}
        </div>
      </SectionFrame>

      {/* Research Experience */}
      <SectionFrame title="Research Experience">
        <div className="grid gap-4">
          {RESEARCH.map((b, i) => (
            <Block key={i} {...b} />
          ))}
        </div>
      </SectionFrame>

      {/* Teaching */}
      <SectionFrame title="Teaching Experience">
        <div className="grid gap-4">
          {TEACHING.map((b, i) => (
            <Block key={i} {...b} />
          ))}
        </div>
      </SectionFrame>

      {/* Certifications & Awards */}
      <SectionFrame title="Certifications">
        <div className="grid gap-4">
          {CERTS.map((b, i) => (
            <Block key={i} {...b} />
          ))}
        </div>
      </SectionFrame>

      <SectionFrame title="Awards & Honors">
        <div className="grid gap-4">
          {AWARDS.map((b, i) => (
            <Block key={i} {...b} />
          ))}
        </div>
      </SectionFrame>
    </div>
  );
}
