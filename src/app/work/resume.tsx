import type { ReactNode } from 'react';
import { Entry, EntryList, Section, SpecTable, TagList, TextLink } from '@/components/ui';

type StackSet = { title: string; items: string[] };

type ResumeBlock = {
  header: string;
  org?: ReactNode;
  dates?: string;
  bullets?: ReactNode[];
  extras?: { heading: string; items: ReactNode[] }[];
};

const STACK: StackSet[] = [
  {
    title: 'Frontend & Mobile',
    items: [
      'TypeScript',
      'JavaScript',
      'React',
      'Next.js',
      'React Native + Expo (iOS, Android, Web)',
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
      'Microservices',
      'FastAPI (async REST endpoints)',
      'Flask',
      'Express',
      'REST APIs',
      'PostgreSQL',
      'Prisma',
      'Pydantic / Zod (schema validation)',
      'Message queues (SQS)',
      'Stripe (subs, invoicing)',
      'Uvicorn ASGI server',
    ],
  },
  {
    title: 'Cloud & DevOps',
    items: [
      'Kubernetes',
      'AWS EKS (Fargate)',
      'Helm',
      'Terraform',
      'Docker',
      'AWS RDS',
      'AWS S3',
      'AWS EC2',
      'CI/CD (GitHub Actions, CodeBuild)',
      'Horizontal scaling',
      'Load balancers',
      'Nginx (reverse proxy)',
      'Linux',
      'Systemd services',
      'Cloudflare',
      'Vercel',
      'GitHub',
    ],
  },
  {
    title: 'Security & Compliance',
    items: [
      'HIPAA-aligned safeguards',
      'Role-based access control (RBAC)',
      'Tamper-evident audit logging',
      'AWS KMS encryption',
      'Secrets management',
      'OAuth2 / OIDC',
      'Clerk / Auth.js',
    ],
  },
  {
    title: 'AI / ML',
    items: [
      'PyTorch',
      'Jupyter',
      'GNNs',
      'CNNs',
      'Transformers',
      'MoEs',
      'Transfer learning',
      'MLPs',
      'Clinical NLP (MedCAT, spaCy, medSpaCy)',
    ],
  },
  {
    title: 'Agentic AI',
    items: [
      'Anthropic Claude',
      'AWS Bedrock',
      'OpenAI API (real-time streaming, SSE)',
      'OpenAI Vision API',
      'Gemini',
      'Model Context Protocol (MCP)',
      'Multi-agent orchestration',
      'Structured extraction',
      'Structured context aggregation',
    ],
  },
  {
    title: 'Healthcare & Interop',
    items: [
      'FHIR R4 resources',
      'SMART on FHIR embed',
      'AWS HealthScribe / Transcribe (ambient scribe)',
      'AWS Comprehend Medical',
      'AWS Textract (document OCR)',
    ],
  },
  {
    title: 'Design & Content',
    items: [
      'Figma',
      'Canva',
      'Markdown',
      'SEO (local + technical)',
      'OpenGraph / metadata',
      'Sitemap / robots config',
      'Google Docs API ingestion',
      'Dashboards & admin tools',
      'Analytics & tracking',
    ],
  },
];

/* ---------- Static content (copied from the previous resume page) ---------- */

const VENTURES: ResumeBlock[] = [
  {
    header: 'Co-Founder & CTO',
    org: (
      <TextLink href="https://www.serelora.com">
        <strong>Serelora | San Diego, CA</strong>
      </TextLink>
    ),
    dates: 'Jun 2025 – Present',
    bullets: [
      <>Founded and led a healthcare SaaS company, initially delivering B2B CRM and workflow automation tools before pivoting to agentic systems that connect clinical data and act on it after identifying clinical documentation and interoperability gaps through customer outreach.</>,
      <>Designed an FHIR-native, agent-first data architecture emphasizing traceability and clinician trust.</>,
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
    header: 'Founder & Tutor',
    org: (
      <TextLink href="https://www.wozprep.org">
        <strong>WozPrep | San Diego, CA</strong>
      </TextLink>
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

const EDUCATION: ResumeBlock[] = [
  {
    header: 'Michigan State University',
    org: <strong>B.S. in Human Biology, Minor in Bioethics</strong>,
    dates: 'Sep 2020 – May 2024',
    bullets: [<>GPA: 3.91 (Honors) &nbsp; | &nbsp; MCAT: 524</>],
  },
];

const CLINICAL: ResumeBlock[] = [
  {
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

const RESEARCH: ResumeBlock[] = [
  {
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
            <TextLink href="https://doi.org/10.1021/acs.jctc.4c01682">
              Wozniak S, Janson G, Feig M. Accurate Predictions of Molecular Properties of Proteins via Graph Neural Networks and Transfer Learning. <em>Journal of Chemical Theory and Computation</em>. 2025.
            </TextLink>
          </>,
          <>
            <TextLink href="https://doi.org/10.1021/acs.jpcb.4c06877">
              Wozniak S, Feig M. Diffusion and Viscosity in Mixed Protein Solutions. <em>The Journal of Physical Chemistry B</em>. 2024.
            </TextLink>
          </>,
          <>
            <TextLink href="https://doi.org/10.1021/acs.jctc.4c01682">
              Wozniak S, Janson G, Feig M. (2025). Accurate Predictions of Molecular Properties of Proteins via GNNs
              and Transfer Learning. <em>JCTC</em>.
            </TextLink>
          </>,
          <>
            <TextLink href="https://doi.org/10.1021/acs.jpcb.4c06877">
              Wozniak S, Feig M. (2024). Diffusion and Viscosity in Mixed Protein Solutions. <em>JPCB</em>.
            </TextLink>
          </>,
        ],
      },
      {
        heading: 'Other Projects',
        items: [
          <>
            <span>
              Molecular Dynamics Simulations of Monoclonal Antibodies (Sep 2020 – Jan 2021)
            </span>
            <ul>
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
            <span>
              The Social Determinants of EHR Quality in US Hospitals (Jan 2024 – Apr 2024)
            </span>
            <ul>
              <li>Compiled data from American Community Survey and American Hospital Association.</li>
              <li>Explored how social factors relate to electronic health record quality across US hospitals.</li>
              <li>Calculated odds ratios from a logistic regression to assess statistical significance.</li>
              <li>
                Presented{' '}
                <TextLink href="/sdoehrq.pdf" newTab>
                  <strong>poster</strong>
                </TextLink>{' '}
                at the 2024 University Undergraduate Research and Arts Forum at MSU.
              </li>
            </ul>
          </>,
        ],
      },
    ],
  },
];

const CERTS: ResumeBlock[] = [
  {
    header: 'Basic Life Support (BLS)',
    org: <strong>American Heart Association</strong>,
    dates: 'Issued Feb 2025 • Expires Feb 2027',
  },
];

const AWARDS: ResumeBlock[] = [
  {
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
    <>
      <Section
        size="lg"
        titleId="h-stack"
        title="What I Build With"
        description="The stack, patterns, and platforms used across my projects."
      >
        <SpecTable
          variant="rows"
          items={STACK.map((s) => ({ label: s.title, value: <TagList items={s.items} /> }))}
        />
      </Section>

      <Section size="lg" titleId="h-ventures" title="Business Ventures">
        <EntryList>
          {VENTURES.map((b, i) => (
            <Entry key={i} when={b.dates} title={b.header} org={b.org} bullets={b.bullets} extras={b.extras} />
          ))}
        </EntryList>
      </Section>

      <Section size="lg" titleId="h-research" title="Research Experience">
        <EntryList>
          {RESEARCH.map((b, i) => (
            <Entry key={i} when={b.dates} title={b.header} org={b.org} bullets={b.bullets} extras={b.extras} />
          ))}
        </EntryList>
      </Section>

      <Section size="lg" titleId="h-clinical" title="Clinical Experience">
        <EntryList>
          {CLINICAL.map((b, i) => (
            <Entry key={i} when={b.dates} title={b.header} org={b.org} bullets={b.bullets} extras={b.extras} />
          ))}
        </EntryList>
      </Section>

      <Section size="lg" titleId="h-education" title="Education">
        <EntryList>
          {EDUCATION.map((b, i) => (
            <Entry key={i} when={b.dates} title={b.header} org={b.org} bullets={b.bullets} extras={b.extras} />
          ))}
        </EntryList>
      </Section>

      <Section size="lg" titleId="h-certs" title="Certifications">
        <EntryList>
          {CERTS.map((b, i) => (
            <Entry key={i} when={b.dates} title={b.header} org={b.org} bullets={b.bullets} extras={b.extras} />
          ))}
        </EntryList>
      </Section>

      <Section size="lg" titleId="h-awards" title="Awards & Honors">
        <EntryList>
          {AWARDS.map((b, i) => (
            <Entry key={i} when={b.dates} title={b.header} org={b.org} bullets={b.bullets} extras={b.extras} />
          ))}
        </EntryList>
      </Section>
    </>
  );
}
