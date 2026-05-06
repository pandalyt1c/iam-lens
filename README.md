# IAM Lens

Visualize AWS IAM policies in your browser. No backend, no account, no telemetry.

🔗 **Live:** [iamlens.dev](https://iamlens.dev)

![IAM Lens screenshot](https://iamlens.dev/screenshot.png)

## What it does

Paste an AWS IAM policy JSON and get three things:

- **Visual graph** — principals, actions, and resources rendered as a draggable React Flow graph so you can see the shape of permissions at a glance.
- **Plain-English summary** — what the policy actually grants, statement by statement.
- **Risk audit** — automated flags for the patterns that go wrong in production:
  - Full administrative access (`Action: *` + `Resource: *`)
  - Wildcard actions or resources used carelessly
  - `NotAction` / `NotResource` with `Allow` (almost always over-grants)
  - Public principals (`Principal: *`)
  - Sensitive actions without `Condition` gating: `iam:PassRole`, `sts:AssumeRole`
  - Known privilege-escalation chains from the Rhino Security list

The parser is hand-written TypeScript — deterministic, no LLM, no AWS SDK, no network calls. Your policy never leaves the browser.

## Why

Reading IAM policies as raw JSON is a pain, especially during audits or PR reviews. Existing tools either need AWS API access (Access Analyzer, Policy Simulator) or charge for it. I wanted something I could paste into and immediately see the shape of the permissions.

## Learn IAM

Short, opinionated guides to the IAM patterns that actually matter in production:

- [How to read an IAM policy](https://iamlens.dev/learn/how-to-read-an-iam-policy)
- [Allow vs Deny precedence](https://iamlens.dev/learn/allow-vs-deny-precedence)
- [Trust policies vs identity policies](https://iamlens.dev/learn/trust-policies-vs-identity-policies)
- [Why IAM wildcards are dangerous](https://iamlens.dev/learn/why-iam-wildcards-are-dangerous)
- [10 IAM privilege escalation paths to know](https://iamlens.dev/learn/privilege-escalation-paths)
- [iam:PassRole, explained](https://iamlens.dev/learn/iam-passrole-explained)
- [MFA enforcement patterns that actually work](https://iamlens.dev/learn/mfa-enforcement-patterns)
- [Reading CloudTrail for AccessDenied](https://iamlens.dev/learn/reading-cloudtrail-for-iam-denials)

[Full library →](https://iamlens.dev/learn)

## Stack

- Next.js 16 with static export
- TypeScript (strict)
- React Flow (`@xyflow/react`) for the graph
- Tailwind CSS + shadcn/ui
- next-mdx-remote for the /learn content
- Vitest for the parser tests
- Cloudflare Pages for hosting

## Run locally

```bash
git clone https://github.com/pandalyt1c/iam-lens.git
cd iam-lens
npm install
npm run dev
```

Then open http://localhost:3000.

## Run the tests

```bash
npm test
```

The parser test suite covers happy paths, malformed inputs, and risk-flag detection.

## Project structure

```
app/                  Next.js routes (/, /learn, /learn/[slug])
components/           UI components (PolicyGraph, RiskFlags, etc.)
content/learn/        MDX articles for the learn section
lib/parser/           Hand-written IAM policy parser
  ├── types.ts        Type definitions for parsed policies
  ├── parse.ts        Top-level parser
  ├── normalize.ts    Coerces single-vs-array fields to canonical form
  ├── analyze.ts      Risk detection rules
  ├── summary.ts      Plain-English summary generator
  └── __tests__/      Vitest tests
```

## Not what this does

Important: IAM Lens is a **static reader**, not a policy simulator. It can't tell you "if I attach this policy to user X, can they call `s3:GetObject` on bucket Y" — that requires the actual identity context, attached managed policies, SCPs, and permission boundaries.

For real simulation, use:
- AWS [IAM Policy Simulator](https://policysim.aws.amazon.com/)
- [`cloud-copilot/iam-lens`](https://github.com/cloud-copilot/iam-lens) (different project, similar name — it's a CLI for actual simulation)

This tool answers a different question: "what does this single policy document grant, in isolation?"

## Contributing

Risk-rule suggestions, parser edge cases, and policy shapes that confuse the analyzer are all welcome. Open an issue with an example policy and I'll take a look.

## License

MIT
