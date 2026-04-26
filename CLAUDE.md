# IAM Lens — Project Context for Claude Code

## What This Project Is

IAM Lens is a free web tool that turns AWS IAM policies from cryptic JSON into clear visual graphs. Users paste in an IAM policy, and the tool:
1. Renders an interactive graph showing principals → actions → resources
2. Generates a plain-English summary of what the policy actually allows
3. Flags dangerous patterns (wildcards, escalation paths, over-permissions)
4. Suggests least-privilege alternatives

It's the first asset in a portfolio of small, AI-built utility websites designed to generate $5K–$10K/mo combined within 18 months.

## Live Site

- Production URL: https://iamlens.dev (post-deploy)
- Domain registrar: Cloudflare
- Hosting: Cloudflare Pages
- Repo: https://github.com/pandalyt1c/iam-lens (private during build)

## Tech Stack

- **Framework:** Next.js 15 (App Router) with Turbopack
- **Language:** TypeScript (strict mode)
- **Styling:** Tailwind CSS v4 + shadcn/ui (base-nova style, neutral base color)
- **Visualization:** React Flow (for the graph rendering)
- **Icons:** lucide-react v1.11.0 (verified legitimate, by ericfennis)
- **Policy parsing:** Custom TypeScript parser (no external services for parsing)
- **Risk analysis:** Rule-based engine (free tier) + Claude API (pro tier, later)
- **Hosting:** Cloudflare Pages
- **Analytics:** Plausible (post-launch)
- **Package manager:** npm

## Architecture Principles

1. **Client-side first.** Policy parsing and basic analysis happen in the browser. Pasted policies NEVER leave the user's machine in the free tier. This is a privacy promise — treat it as inviolable.
2. **No user accounts in MVP.** No login, no database for user data. Stateless and simple.
3. **Shareable via URL encoding.** Users can share analyzed policies via compressed URL params. No server storage required.
4. **SEO-first content layer.** /learn pages are MDX, optimized for long-tail search.
5. **Performance budget:** Lighthouse score 95+ on mobile. Sub-2s LCP.

## Repo Structure

iam-lens/
- app/
  - page.tsx (landing page + main tool)
  - examples/[slug]/ (dynamic example pages, SEO)
  - learn/[slug]/ (educational content, SEO)
  - api/analyze/route.ts (optional Claude-powered deep analysis)
- components/
  - PolicyEditor.tsx (JSON input + syntax highlighting)
  - PolicyGraph.tsx (React Flow visualization)
  - RiskFlags.tsx (risk detection display)
  - PlainEnglish.tsx (summary generator output)
  - ui/ (shadcn components: button, card, textarea, badge, alert)
- lib/
  - parser.ts (IAM policy parser)
  - analyzer.ts (risk detection rules)
  - examples.ts (seed example policies)
  - utils.ts
- content/ (MDX articles for SEO)
- public/

## Coding Standards

- TypeScript strict mode. No `any` unless genuinely necessary.
- Functional React components only. Hooks for state.
- Tailwind for styling. No custom CSS files except global resets.
- Components < 200 lines. Split if larger.
- Accessibility: semantic HTML, keyboard nav, screen-reader friendly.
- Comments only when WHY isn't obvious from the code.
- Test critical parser logic (Vitest) — UI tests not required for MVP.

## Build Phase Roadmap

### Weekend 1: Core Functionality (COMPLETE)
- Next.js + Tailwind + shadcn scaffold ✓
- Landing page with policy textarea, three feature cards ✓
- Dark mode default ✓
- Git initialized, pushed to GitHub ✓

### Weekend 2: Parser + Visualization
- IAM policy parser (handles all standard syntax)
- React Flow visualization wired up
- Plain-English summary generator
- Wire up the "Analyze Policy" button
- Deploy to Cloudflare Pages

### Weekend 3: Risk Analysis + SEO + Launch Prep
- Rule-based risk detection
- Suggested fixes engine
- Shareable URL encoding
- 20-30 example policies in the library
- MDX content engine for /learn
- 25-30 SEO articles
- Open Graph images, sitemap, robots.txt
- Affiliate link infrastructure
- Launch announcement drafts

## Explicit Non-Goals (Don't Build These)

- User authentication
- Server-side policy storage
- Multi-tenant features
- Mobile app
- Programmatic API access (Phase 3 if ever)

## How To Help Me Best

1. **I'm a builder, not a maintainer.** Ship features fast, polish later.
2. **Suggest before implementing major changes.** Propose, get my OK, then code.
3. **Push back when I'm wrong.** I'd rather be corrected than coddled.
4. **Show me runnable commands.** I'm on Windows / PowerShell.
5. **Default to simplicity.** If a third-party library adds complexity for marginal benefit, write it ourselves.
6. **Optimize for SEO from day one.** Every page needs proper metadata, schema markup, and clean URL structures.

## Git Identity

- user.name: pandalyt1c
- user.email: 279329805+pandalyt1c@users.noreply.github.com
- Default branch: main
- Privacy email used to keep real email out of public commit history

## Notes for Future Sessions

- This file is the source of truth for the build. Update it as architecture decisions evolve.
- Companion docs in the parent Claude Project: "IAM Lens Project Brief" (broader business context).
- When in doubt about a decision: defer to the project brief; it has the business reasoning.
- Last updated: end of Weekend 1 build (April 2026)
