```
sw/
│
├── update_github.bat                  # Script for pushing changes to GitHub
│
├── .gitignore                         # Ignore node_modules, .env, etc.
├── package.json                       # Next.js project dependencies & scripts
├── package-lock.json                  # Locked dependency versions
├── tsconfig.json                      # TypeScript project configuration
├── next.config.js                     # Next.js configuration
├── README.md                          # Project documentation
│
├── public/                            # Static assets (images, videos, etc.)
│   └── favicon.ico
│
├── styles/
│   └── globals.css                    # Global stylesheet (formerly index.css)
│
├── src/
│   ├── app/                           # Next.js App Router directory
│   │   ├── layout.tsx                 # App-wide layout component
│   │   ├── page.tsx                   # Home page (formerly HomePage)
│   │   ├── not-found.tsx              # 404 fallback page (formerly NotFound)
│   │   ├── about/page.tsx             # AboutPage
│   │   ├── contact/page.tsx           # ContactPage
│   │   ├── gallery/page.tsx           # Gallery
│   │   │
│   │   └── api/                       # Backend API routes
│   │       ├── openai/route.ts       # GPT API handler (replaces run_openai.py)
│   │       ├── users/route.ts        # User login/register, etc.
│   │       └── ...                   # Other API endpoints
│   │
│   ├── components/                   # Shared UI components (from items/ + components/)
│   │   ├── Header.tsx
│   │   ├── Footer.tsx
│   │   ├── Navigation.tsx
│   │   ├── Sidebar.tsx
│   │   ├── AdminTopNav.tsx
│   │   ├── LoadingCircle.tsx
│   │   ├── MenuButton.tsx
│   │   ├── TempMsg.tsx
│   │   ├── VideoPlayer.tsx
│   │   ├── ArticleItem.tsx
│   │   ├── Chatbot.tsx
│   │   ├── MapSection.tsx
│   │   ├── ContactForm.tsx
│   │   ├── Testimonials.tsx
│   │   ├── ImpactSection.tsx
│   │   ├── Timeline.tsx
│   │   ├── TeamCard.tsx
│   │   └── ProtectedRoute.tsx
│   │
│   ├── data/
│   │   └── navigationData.json       # Site navigation structure
│
│   ├── lib/                          # Replaces all Python back-end logic
│   │   ├── openai.ts                 # Logic that used to be in run_openai.py
│   │   ├── auth.ts                   # Token validation, session logic, etc.
│   │   ├── db.ts                     # SQLite logic (formerly instance/users.db)
│   │   └── utils.ts                  # Any general-purpose server utilities
│   ├── prompts/                      # Prompt templates (migrated from Python)
│   │   ├── system_prompt.txt
│   │   └── user_prompt.txt
│   │
│   └── assets/                       # (Optional) Internal use assets (e.g. TS constants, SVGs)
│
└── .env.local                        # Secure environment variables (OpenAI key, DB path, etc.)
```
