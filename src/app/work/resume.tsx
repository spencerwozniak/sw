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
  FaBriefcase,
} from 'react-icons/fa';
import Link from 'next/link';
import React from 'react';

const ACCENT = '#bfaa8d';

type StackSet = { title: string; items: string[] };

const STACK: StackSet[] = [
  {
    title: 'Frontend',
    items: [
      'TypeScript',
      'JavaScript',
      'React',
      'React Native + Expo (iOS, Android, Web)',
      'Next.js',
      'NativeWind (Tailwind CSS for React Native)',
      'React Native SVG',
      'React Native Reanimated',
      'Custom navigation systems',
      'Flow-based handlers',
      'Platform-specific optimizations',
      'Tailwind CSS',
      'HTML',
      'CSS',
    ],
  },
  {
    title: 'Backend & Data',
    items: [
      'Node.js',
      'Python 3.9+',
      'Django',
      'Flask',
      'FastAPI (async REST endpoints)',
      'Pydantic (schema validation)',
      'JSON file-based storage',
      'In-memory TTL cache',
      'Modular service architecture',
      'Uvicorn ASGI server',
      'Prisma',
      'PostgreSQL',
      'REST APIs',
    ],
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
      'OpenAI',
      'R',
      'Jupyter',
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
      'OpenAI API (real-time streaming, SSE)',
      'OpenAI Vision API',
      'Structured context aggregation',
      'Guardrails & hallucination prevention',
      'Explainable, guideline-based responses',
      'Async streaming (AWS load balancer optimized)',
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
      'Docker',
      'Linux',
      'Vercel',
      'AWS EC2',
      'Nginx (reverse proxy)',
      'Systemd services',
      'Horizontal scaling',
      'Load balancers',
      'CloudFlare',
      'Git',
      'GitHub',
      'pnpm',
      'Vim',
      'VSCode',
      'Electron desktop wrapper',
      'Caching & code-splitting',
      'Sitemap / robots config',
    ],
  },
  {
    title: 'Design & Content',
    items: [
      'Figma',
      'Photoshop',
      'Markdown',
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
  'Design & Content': <FaServer className="h-5 w-5" />,
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
  'Design & Content': { badgeBg: 'bg-cyan-900/30', badgeText: 'text-cyan-300', ring: 'ring-cyan-900/40' },
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
  icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
  header: string;
  org?: React.ReactNode;
  dates?: string;
  bullets?: React.ReactNode[];
  extras?: { heading: string; items: React.ReactNode[] }[];
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-5 hover:bg-white/[0.05] transition">
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

const EXPERIENCE = [
  {
    icon: FaBriefcase,
    header: 'Co-Founder & CTO',
    org: (
      <Link href="https://www.serelora.com" target="_blank" className="underline underline-offset-2 hover:text-gray-300">
        <strong>Serelora | San Diego, CA</strong>
      </Link>
    ),
    dates: 'Jun 2025 – Present',
    bullets: [
      <>Founded and led a healthcare SaaS company, initially delivering B2B CRM and workflow automation tools before pivoting to AI-powered EHR systems after identifying clinical documentation and interoperability gaps through customer outreach.</>,
      <>Designed an FHIR-native, AI-first EHR architecture emphasizing traceability and clinician trust.</>,
      <>Modeled longitudinal patient data in PostgreSQL using FHIR-aligned schemas, enabling structured relationships across clinical history, documentation, and operational workflows.</>,
      <>Architected a manager-orchestrated system of domain-specific clinical AI agents, dynamically routing requests to labs, medications, and documents agents with scoped retrieval and context awareness.</>,
      <>Designed agent workflows to balance explainability, performance, and clinical constraints.</>,
      <>Implemented HIPAA-aligned technical safeguards, including RBAC, audit logging, access boundaries.</>,
      <>Worked extensively with incomplete, inconsistent, and multi-source clinical data, designing ingestion and reconciliation logic resilient to real-world documentation variability.</>,
      <>Worked with healthcare organizations to translate workflows into concrete product requirements.</>,
      <>Led ongoing rollout and support with clients, coordinating calls and check-ins to ensure systems functioned reliably in live environments and adapted rapidly as needs evolved.</>,
      <>Led go-to-market efforts including outreach through cold email, LinkedIn, and in-person meetings; as well as discovery calls, on-site demos, and deal negotiations with healthcare organizations.</>,
    ],
  },
  {
    icon: FaChalkboardTeacher,
    header: 'Founder & Tutor',
    org: (
      <Link href="https://www.wozprep.org" target="_blank" className="underline underline-offset-2 hover:text-gray-300">
        <strong>WozPrep | San Diego, CA</strong>
      </Link>
    ),
    dates: 'Nov 2024 – Dec 2025',
    bullets: [
      <>Founded and operated a private tutoring service supported by a custom-built web application.</>,
      <>Improved student outcomes by up to 50 percentile points through individualized tutoring.</>,
      <>Applied Socratic method and positive psychology to help critical thinking, motivation, and confidence.</>,
      <>Conducted 1-on-1 tutoring sessions focused on test strategy, critical thinking, and content mastery.</>,
      <>Applied the Socratic method to foster deeper student engagement and independent problem-solving.</>,
      <>Integrated principles of positive psychology to build student confidence and promote motivation.</>,
      <>Created personalized study plans based on student strengths, weaknesses, and time constraints.</>,
      <>Utilized Next.js, TypeScript, and React to develop an interactive website with modern UI/UX design to manage client inquiries, promote services, and host content.</>,
      <>Built a web-based portal for MCAT practice tests and question banks, featuring original questions tailored to AAMC-style reasoning and pacing.</>,
      <>Leveraged search engine optimization to increase visibility through online outreach.</>,
    ],
  },
  {
    icon: FaBriefcase,
    header: 'Co-Founder & Lead Engineer',
    org: <strong>Clinical Training Platform for IMGs | Rochester, MI</strong>,
    dates: 'May 2023 – Aug 2023',
    bullets: [
      <>Co-founded and led engineering for a clinical training platform preparing international medical graduates (IMGs) for U.S. hospital rotations and residency.</>,
      <>Built a full-stack web application delivering case-based clinical education, SOAP note training, and AI-assisted feedback.</>,
      <>Built a React + TypeScript frontend (Vite) supporting authenticated users, course purchase flows, interactive case navigation, video-based learning, and real-time note-taking.</>,
      <>Developed a Python (Flask) backend handling user authentication, course progress tracking, session management, and secure data persistence.</>,
      <>Built an AI-powered tutor to provide context-aware feedback on HPI writing and clinical reasoning.</>,
      <>Designed prompt-engineering workflows and integrated text-to-speech pipelines for AI feedback delivery, enabling multimodal learning experiences.</>,
      <>Collaborated with physician educators to translate real hospital cases into interactive modules.</>,
      <>Supported early pilot deployments with medical students and IMG cohorts; platform used for demonstrations to hospital leadership and international partners.</>,
    ],
  },
];

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
    dates: 'Aug 2024 – Dec 2025',
    bullets: [
      <>Conducted individualized therapy sessions with children diagnosed with developmental disabilities.</>,
      <>Collected data in an EHR to track client progress, analyze behavioral trends, and refine interventions.</>,
      <>Trained and supervised new therapists, providing structured feedback and performance evaluation.</>,
    ],
  },
  {
    icon: FaFileMedical,
    header: 'Medical Scribe',
    org: <strong>Memorial Healthcare | Owosso, MI</strong>,
    dates: 'Jul 2023 – Aug 2024',
    bullets: [
      <>Documented ED and ICU encounters in MEDITECH for emergency and internal medicine physicians.</>,
      <>Synthesized patient histories, labs, and assessments for up to 20 patients per shift.</>,
      <>Interpreted laboratory values to streamline documentation and highlight critical findings.</>,
      <>Reviewed and abstracted data from medical charts to support clinical decision-making.</>,
      <>Coordinated with nursing staff to support unit operations.</>,
      <>Assisted several emergency and internal medicine physicians in the ED and ICU by documenting histories, exam findings, procedures, orders, and assessment & plans for up to 20 patients per shift.</>,
      <>Collected preliminary patient histories and medication lists to improve physician efficiency.</>,
      <>Collaborated with nursing staff to support unit operations, including restocking rooms and delivering comfort items and basic support to patients.</>,
    ],
  },
  {
    icon: FaHandHoldingHeart,
    header: 'Volunteer Staff',
    org: <strong>Sparrow Hospital | Lansing, MI</strong>,
    dates: 'Sep 2022 – Apr 2023',
    bullets: [
      <>Supported nursing staff in an inpatient unit by providing basic care to up to 40 patients per shift.</>,
      <>Measured vital signs, transported patients within the hospital, and observed diagnostic imaging exams.</>,
      <>Supported nursing staff in an inpatient unit by assisting with up to 40 patients per shift.</>,
      <>Answered patient call lights to provide timely assistance with comfort, mobility, and basic care needs.</>,
      <>Sat with patients who had no visitors, offering companionship, emotional support, and conversation during long or isolating hospital stays.</>,
    ],
  },
];

const RESEARCH = [
  {
    icon: FaProjectDiagram,
    header: 'Research Assistant',
    org: <strong>Biochemistry Department, Michigan State University | East Lansing, MI</strong>,
    dates: 'Sep 2020 – Apr 2025',
    bullets: [
      <>Conducted multi-year research applying graph-based representations to model molecular systems.</>,
      <>Developed and evaluated transformer-based graph neural networks (GNNs) to predict molecular properties, leveraging message passing over local and global structural neighborhoods.</>,
      <>Built data pipelines in Python and C++ to transform raw molecular dynamics outputs into graph-structured datasets suitable for analysis and training models.</>,
      <>Curated, validated, and maintained large datasets for training and benchmarking AI models.</>,
      <>Collaborated with interdisciplinary teams to interpret results and refine modeling assumptions.</>,
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
              Wozniak S, Janson G, Feig M. Accurate Predictions of Molecular Properties of Proteins via Graph Neural Networks and Transfer Learning. <em>Journal of Chemical Theory and Computation</em>. 2025.
            </a>
          </>,
          <>
            <a
              href="https://doi.org/10.1021/acs.jpcb.4c06877"
              target="_blank"
              className="underline underline-offset-2 hover:text-gray-300"
            >
              Wozniak S, Feig M. Diffusion and Viscosity in Mixed Protein Solutions. <em>The Journal of Physical Chemistry B</em>. 2024.
            </a>
          </>,
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
    org: <strong>Michigan State University Honors College</strong>,
    dates: 'Issued Sep 2020',
    bullets: [
      <>Full-tuition academic scholarship awarded for outstanding academic achievement.</>,
    ],
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

      {/* Experience */}
      <SectionFrame title="Experience">
        <div className="grid gap-4">
          {EXPERIENCE.map((b, i) => (
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

      {/* Clinical Experience */}
      <SectionFrame title="Clinical Experience">
        <div className="grid gap-4">
          {CLINICAL.map((b, i) => (
            <Block key={i} {...b} />
          ))}
        </div>
      </SectionFrame>

      {/* Education */}
      <SectionFrame title="Education">
        <div className="grid gap-4">
          {EDUCATION.map((b, i) => (
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
