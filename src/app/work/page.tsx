// app/work/page.tsx
import React from 'react';
import Image from 'next/image';
import WorkHero from '@/components/WorkHero';
import Chatbot from '@/components/Chatbot';
import NavButton from '@/components/NavButton';
import {
  FaBolt, FaServer, FaArrowRight,
} from 'react-icons/fa';
import { BiSolidQuoteLeft } from "react-icons/bi";

import Resume from './resume';

type CTA = { label: string; href: string; external?: boolean };
type Metric = { label: string; value: string };
type Tag = string;

type SelectedWork = {
  title: string;
  blurb: string;
  href?: string;
  tags?: Tag[];
};

type Testimonial = {
  quote: string;
  byline: string;
};

type Visual = {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  href?: string;        // ← optional link
  external?: boolean;   // ← open in new tab if true
  caption?: string;     // ← optional label under the image
};

type WorkBlock = {
  id: string;
  eyebrow: string;
  title: string;
  subtitle: string;
  bullets: string[];
  metrics?: Metric[];
  ctas?: CTA[];
  selected?: SelectedWork[];
  tags?: Tag[];
  visuals: Visual[];           // << visuals of sites / product
  testimonial?: Testimonial;   // << optional quote card
  theme?: 'primary' | 'emerald' | 'violet';
};

const ACCENT = '#bfaa8d';

/* ---------------------- DATA ---------------------- */

const WORK: WorkBlock[] = [
  {
    id: 'freelance',
    eyebrow: 'Freelance • Full-Stack Engineer',
    title: 'Design → Ship: Modern apps & sites',
    subtitle:
      'I help founders launch fast, clean, conversion-focused products. Next.js + TypeScript on the front, Python/Node on the back, with tasteful AI where it actually helps.',
    bullets: [
      'Next.js (React) and TypeScript development for high-performance',
      'Tailwind CSS for rapid, consistent, and responsive UI design',
      'Integrated payment processing and subscriptions via Stripe',
      'Built and optimized APIs with Prisma/Postgres',
      'Implemented user authentication and onboarding flows with Clerk/Auth, supporting multi-role applications',
      'Configured transactional and marketing email workflows, including custom templates and automation',
      'Designed and deployed AI-powered features such as document retrieval, structured tool execution, and streaming chat interfaces',
      'Optimized application performance with image optimization, caching strategies, and code-splitting',
      'Built admin dashboards with analytics, content management tools, and live data visualizations',
      'Developed scalable, serverless backends with environment-specific configurations',
    ],
    metrics: [
      { label: 'Web builds shipped', value: '25+' },
      { label: 'Avg. Lighthouse perf', value: '95+' },
      { label: 'Production uptime', value: '99.9%' },
    ],
    ctas: [
      { label: 'Book a consult', href: '/contact' },
    ],
    selected: [
      {
        title: 'Physician-Scientist Site',
        blurb: 'Next.js marketing site + newsletter + SEO + Google Docs ingestion.',
        href: 'https://drfombu.com',
        tags: ['Next.js', 'SEO / GEO', 'Google Docs API'],
      },
      {
        title: 'Restaurant Launch',
        blurb: 'Brand/site, online menu, local SEO, OpenGraph, analytics.',
        href: 'https://louiesmashngrill.com',
        tags: ['Next.js', 'Local SEO', 'Prisma', 'Postgres'],
      },
    ],
    tags: ['Next.js', 'TypeScript', 'Tailwind', 'Node', 'Python', 'Postgres', 'Stripe'],
    visuals: [
      {
        src: '/fombu.png',
        alt: 'Physician site screenshot',
        width: 1080,
        height: 720,
        href: 'https://drfombu.com', // <- clicking opens site
        external: true,
        caption: 'Physician-Scientist Website',
      },
      {
        src: '/louies.png',
        alt: 'Restaurant site screenshot',
        width: 1080,
        height: 720,
        href: 'https://louiesmashngrill.com',
        external: true,
        caption: 'Restaurant Launch: Louie’s Smash-N-Grill',
      },
      {
        src: '/lil-sams.png',
        alt: 'Beach Shop screenshot',
        width: 1080,
        height: 720,
        href: 'https://lil-sams.vercel.app/',
        external: true,
        caption: 'Beach Shop: Lil Sam’s',
      },
    ],

    testimonial: {
      quote:
        'Spencer rebuilt our site and growth stack in weeks. SEO jumped, performance is stellar, and shipping new pages is easy.',
      byline: '— Founder, HealthTech Client',
    },
    theme: 'primary',
  },
  {
    id: 'serelora',
    eyebrow: 'Founder • Serelora',
    title: 'Universal AI interface for doctors',
    subtitle:
      'EHR‑agnostic and clinician‑first. A team of specialized AI agents supports documentation, orders, and patient communication—without changing the EHR.',
    bullets: [
      'Multi‑agent orchestration for clinical tasks (note drafts, order suggestions, patient messages)',
      'SMART on FHIR embed: launch-in-context inside the EHR with OAuth2/OIDC',
      'FHIR‑aware context: ingests patient bundles and composes structured clinical prompts',
      'Session memory scoped to patient/encounter; ephemeral scratchpads per sub‑task',
      'Parallelizable sub‑agents for summaries, orders, and patient comms where safe',
      'Observability: trace of intents, prompts, tool invocations, and outputs for audit',
      'Manager classifies each request and routes to specialized experts (documents, medications, general)',
      'Streaming responses for low‑latency typing UX',
      'Available on web and desktop (Electron) with a shared agent gateway',
      'EHR‑agnostic overlay and adapters that sit alongside existing workflows',      
      'Secure context composer: packages scoped PHI + clinician intent into structured prompts',
      'Privacy‑first handling: PHI scoping, redaction, and least‑privilege data access',
      'Guardrails and review: tool permissions, structured extraction, human‑in‑the‑loop',
      'Observability: audit trail of prompts, decisions, and outputs',
      'Next.js + TypeScript app with Tailwind styling',
      'Electron desktop wrapper with secure preload/IPC',
      'Shared UI between web and desktop builds',
      'Sidebar patient selection, suggestion chips, and typing indicators for a smooth chat flow',
      'Markdown rendering with custom MDX components (tables, code, blockquotes)',
    ],
    metrics: [
    ],
    ctas: [
      { label: 'Learn More', href: 'https://www.serelora.com/'},
    ],
    selected: [
      {
        title: 'Clinical Agent System',
        blurb: 'Task‑routed agents with shared context and scoped tools.',
        tags: ['Agents', 'Tools', 'Safety'],
        href: 'https://www.serelora.com/',
      },
      {
        title: 'EHR Overlay Prototype',
        blurb: 'Non‑invasive UI that sits on top of existing workflows.',
        tags: ['EHR‑agnostic', 'UX'],
        href: 'https://www.serelora.com/',
      },
    ],
    tags: ['Healthcare', 'AI', 'Multi‑agent', 'EHR‑agnostic', 'Next.js', 'TypeScript', 'Node'],
    visuals: [
      {
        src: '/serelora-web-app.png',
        alt: 'Serelora Web App — Universal AI Interface for Doctors',
        width: 1080,
        height: 720,
        href: 'https://www.serelora.com/',
        external: true,
        caption: 'Serelora Web App',
      },
      {
        src: '/serelora-desktop-app.png',
        alt: 'Serelora Desktop App — Universal AI Interface for Doctors',
        width: 1080,
        height: 720,
        href: 'https://www.serelora.com/',
        external: true,
        caption: 'Serelora Desktop App',
      }
    ],
    theme: 'violet',
  },
  {
    id: 'wozprep',
    eyebrow: 'Founder • WozPrep',
    title: 'MCAT & STEM tutoring with tools',
    subtitle:
      'I run WozPrep, a tutoring service for pre-health students. I also build custom tools for passage practice, highlighting, timing, and analytics.',
    bullets: [
      '1:1 tutoring focused on strategy, pacing, and confidence',
      'Content library + breakdowns + Khan-tagged references',
      'Custom Next.js practice app: highlights, strikethrough, saves',
      'Published in-depth articles on MCAT strategy, test psychology, and section-specific tactics',
      'Optimized WozPrep’s website SEO to attract more students through local and national search rankings',
      'Created tailored lesson plans for each student based on diagnostic results and progress tracking',
      'Developed targeted drills for high-yield topics and common weak areas',
      'Integrated real exam pacing simulations to improve timing and endurance',
      'Built a resource hub with curated videos, practice questions, and review sheets',
      'Analyzed student performance data to refine study plans and maximize score gains',
    ],
    metrics: [
      { label: 'Score lifts (best)', value: '+20 pts' },
      { label: 'Students taught', value: '10+' },
      { label: 'Avg. response time', value: '<24h' },
    ],
    ctas: [
      { label: 'Visit WozPrep', href: 'https://www.wozprep.org'}
    ],
    selected: [
      {
        title: 'Passage App',
        blurb: 'Highlight, strikethrough, keyboard shortcuts, saved per-question state.',
        tags: ['Next.js', 'TypeScript', 'State mgmt'],
        href: 'https://www.wozprep.org/mcat/practice',
      },
      {
        title: 'Question Breakdowns',
        blurb: 'JSON-based explanations with links to targeted review.',
        tags: ['Content', 'Pedagogy'],
        href: 'https://www.wozprep.org/mcat/practice/cp-passage-1',
      },
    ],
    tags: ['Next.js', 'TypeScript', 'Tailwind', 'Education', 'Content'],
    visuals: [
      {
        src: '/wozprep-library.png',
        alt: 'WozPrep Practice Library Page',
        width: 1080,
        height: 720,
        href: 'https://www.wozprep.org/mcat/practice',
        external: true,
        caption: 'WozPrep Practice Library',
      },
      {
        src: '/wozprep-exam.png',
        alt: 'WozPrep Exam Screenshot',
        width: 1080,
        height: 720,
        href: 'https://www.wozprep.org/mcat/practice/cp-passage-1',
        external: true,
        caption: 'WozPrep Practice Exam with Breakdown',
      },
    ],
    theme: 'emerald',
  },
];

/* ---------------------- SHARED UI ---------------------- */

const THEME_STYLES = {
  primary: {
    pillBg: 'bg-white/10',
    pillText: 'text-white',
    pillRing: 'ring-white/20',
    dot: 'bg-white/80',
  },
  emerald: {
    pillBg: 'bg-emerald-500/15',
    pillText: 'text-emerald-300',
    pillRing: 'ring-emerald-500/25',
    dot: 'bg-emerald-400',
  },
  violet: {
    pillBg: 'bg-violet-500/15',
    pillText: 'text-violet-300',
    pillRing: 'ring-violet-500/25',
    dot: 'bg-violet-400',
  },
} as const;

type ThemeKey = keyof typeof THEME_STYLES;

function getThemeStyles(theme?: ThemeKey) {
  return THEME_STYLES[theme ?? 'primary'];
}


function SectionFrame({
  id, eyebrow, title, subtitle, children, theme = 'primary',
}: {
  id?: string;
  eyebrow?: string;
  title?: string;
  subtitle?: string;
  children?: React.ReactNode;
  theme?: WorkBlock['theme'];
}) {
  const t = getThemeStyles(theme);

  return (
    <section id={id} className="relative overflow-hidden">
      <div className="relative mx-auto max-w-7xl px-5 py-14 md:py-20">
        {/* Eyebrow as themed pill */}
        {eyebrow && (
          <span className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-medium ring-1 ${t.pillBg} ${t.pillText} ${t.pillRing}`}>
            {eyebrow}
          </span>
        )}

        {title && <h2 className="mt-3 text-3xl md:text-4xl font-semibold text-white">{title}</h2>}
        {subtitle && <p className="mt-3 max-w-3xl text-gray-300">{subtitle}</p>}
        {children}
      </div>
    </section>
  );
}


function BulletList({ items }: { items: string[] }) {
  if (!items?.length) return null;
  return (
    <ul className="mt-6 grid gap-3 md:grid-cols-2">
      {items.map((t, i) => (
        <li key={i} className="flex items-start gap-3">
          <span className="mt-1 h-2 w-2 rounded-full" style={{ backgroundColor: ACCENT }} />
          <span className="text-gray-200">{t}</span>
        </li>
      ))}
    </ul>
  );
}

function MetricBar({ metrics }: { metrics?: Metric[] }) {
  if (!metrics?.length) return null;
  return (
    <div className="mt-8 grid grid-cols-2 sm:grid-cols-3 gap-4">
      {metrics.map((m, i) => (
        <div key={i} className="rounded-xl border border-white/10 bg-black/20 p-4 text-center">
          <div className="text-xl font-semibold text-white">{m.value}</div>
          <div className="text-xs text-gray-400">{m.label}</div>
        </div>
      ))}
    </div>
  );
}

function TagRow({ tags }: { tags?: Tag[] }) {
  if (!tags?.length) return null;
  return (
    <div className="mt-6 flex flex-wrap gap-2">
      {tags.map((t, i) => (
        <span key={i} className="rounded-full border border-white/15 px-3 py-1 text-xs text-gray-200 bg-white/5">
          {t}
        </span>
      ))}
    </div>
  );
}

function CTAs({ ctas }: { ctas?: CTA[] }) {
  if (!ctas?.length) return null;
  return (
    <div className="mt-8 flex flex-wrap gap-3">
      {ctas.map((c, i) =>
        c.external ? (
          <a key={i} href={c.href} target="_blank" rel="noreferrer"
             className="inline-flex items-center gap-2 rounded-full px-6 py-2 font-semibold transition bg-teal-300 text-black hover:bg-teal-400">
            {c.label} <FaArrowRight className="h-3.5 w-3.5" />
          </a>
        ) : (
          <NavButton key={i} to={c.href} label={c.label} className="text-[14px] !w-50 px-4 py-2" />
        )
      )}
    </div>
  );
}

function SelectedWorkGrid({ items, anchor }: { items?: SelectedWork[]; anchor?: string }) {
  if (!items?.length) return null;
  return (
    <div id={anchor} className="mt-10 grid grid-cols-1 md:grid-cols-2 gap-4">
      {items.map((w, i) => (
        <a
          key={i}
          href={w.href || '#'}
          className="group block rounded-2xl border border-white/10 bg-neutral-900 p-5 hover:bg-white/[0.08] transition"
        >
          <div className="flex items-center gap-2 text-sm text-gray-300">
            <FaBolt className="h-3.5 w-3.5 text-[#bfaa8d]" />
            Selected Work
          </div>
          <h3 className="mt-2 text-lg font-semibold text-white">{w.title}</h3>
          <p className="mt-1 text-gray-300">{w.blurb}</p>
          {w.tags?.length ? (
            <div className="mt-3 flex flex-wrap gap-2">
              {w.tags.map((t, j) => (
                <span key={j} className="rounded-full border border-white/15 px-2 py-0.5 text-[11px] text-gray-200 bg-white/5">
                  {t}
                </span>
              ))}
            </div>
          ) : null}
        </a>
      ))}
    </div>
  );
}

function TestimonialCard({ t }: { t?: Testimonial }) {
  if (!t) return null;
  return (
    <div className="relative bg-neutral-900 rounded-lg p-6 shadow-lg ring-1 ring-white/10">
      <BiSolidQuoteLeft className="w-8 h-8 text-[#bfaa8d]" />
      <p className="text-gray-300 mb-2 mt-3">{t.quote}</p>
      <p className="text-sm text-[#bfaa8d] font-medium">{t.byline}</p>
    </div>
  );
}

/* ---------------------- PAGE ---------------------- */

export default function MyWorkPage() {
  return (
    <div className="flex flex-col bg-neutral-900 text-gray-100">
      <main>
        {/* Hero */}
        <WorkHero bgSrc='/gold-bg.jpg'/>

        {/* Three big work sections with visuals (alternating layout) */}
        <div className="max-w-7xl mx-auto px-5">
          {WORK.map((block, idx) => {
            const reverse = idx % 2 === 1; // alternate like your example
            return (
              <SectionFrame
                key={block.id}
                id={block.id}
                eyebrow={block.eyebrow}
                title={block.title}
                subtitle={block.subtitle}
                theme={block.theme}
              >
                <div className={`mt-8 flex flex-col ${reverse ? 'md:flex-row-reverse' : 'md:flex-row'} items-center gap-12`}>
                  {/* Visuals (stacked, optionally clickable) */}
                  <div className="flex-1 flex flex-col justify-center items-center w-full max-w-2xl gap-6">
                    {block.visuals.map((v, i) => {
                      const img = (
                        <Image
                          key={i}
                          alt={v.alt}
                          src={v.src}
                          width={v.width || 1080}
                          height={v.height || 720}
                          className="block rounded-xl shadow-2xl ring-1 ring-white/10 transition hover:opacity-95"
                          priority={idx === 0 && i === 0}
                        />
                      );

                      return (
                        <div key={`${block.id}-visual-${i}`} className="w-full">
                          {v.href ? (
                            <a
                              href={v.href}
                              target={v.external ? '_blank' : undefined}
                              rel={v.external ? 'noreferrer' : undefined}
                              aria-label={v.alt}
                              className="group block"
                            >
                              {img}
                            </a>
                          ) : (
                            img
                          )}

                          {v.caption && (
                            <p className="mt-2 text-sm text-gray-400 text-center md:text-left">
                              {v.caption}
                            </p>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* Copy side */}
                  <div className="flex-1 flex flex-col gap-6 text-center md:text-left md:items-start items-center">
                    <BulletList items={block.bullets} />
                    <TagRow tags={block.tags} />
                    <div className="w-full">
                      <MetricBar metrics={block.metrics} />
                    </div>
                    <CTAs ctas={block.ctas} />
                    {/* Testimonial card (like your example) */}
                    <div className="w-full">
                      <TestimonialCard t={block.testimonial} />
                    </div>
                  </div>
                </div>

                {/* Selected work tiles */}
                <SelectedWorkGrid items={block.selected} anchor={`${block.id}-work`} />
              </SectionFrame>
            );
          })}
        </div>

        <Resume />
      </main>

      <Chatbot />
    </div>
  );
}
