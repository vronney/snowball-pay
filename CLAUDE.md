# Project: Budget (Debt Snowball Planner)

## Tech Stack
- Next.js 14 App Router
- TypeScript
- Tailwind CSS
- Prisma + PostgreSQL (Neon)
- Auth0

## Architecture
- `src/app`: App Router pages and API routes
- `src/components`: UI components and client-side feature modules
- `src/lib`: shared runtime utilities (auth, hooks, calculations, db client)
- `prisma`: schema and database model definitions
- `apps/mobile`: Expo (iOS/Android) app on the same API — standalone package, see `apps/mobile/README.md`

## Project Docs
- `docs/product/PRD.md`
- `docs/architecture/ARCHITECTURE.md`
- `docs/security/CYBERSECURITY.md`
- `docs/security/AUTH0_GOOGLE_CONNECTION_CHECKLIST.md`
- `docs/marketing/MARKETING_PLAN.md`

## Agent Skills
- `.claude/skills/snowball-pay-developer.md` — feature dev role (PRD phases, TypeScript, Zustand, Recharts)
- `.claude/skills/cybersecurity.md` — security review role (middleware, CORS, auth, rate limiting)

## Coding Conventions
- Prefer small, single-purpose components and utility functions.
- Keep all server mutations in API routes or server-safe modules.
- Validate all inbound API payloads (Zod where applicable).
- Avoid destructive git/file operations unless explicitly requested.

## Safety Rules
- Store secrets only in environment variables; never hardcode credentials.
- Treat all request input as untrusted and validate/sanitize.
- Use parameterized Prisma queries and least-privilege access patterns.
- Do not execute shell commands that delete data or reset history unless explicitly approved.

## Branch and Review Policy
- Work on feature/fix branches.
- Keep changes scoped and reversible.
- Run `npm run lint` and `npm run build` before finalizing major edits.

## Local Command Shortcuts
- `/review`: findings-first code review on current changes.
- `/test`: run `npm run lint` and `npm run build` with pass/fail report.
- `/deploy-check`: run pre-deploy checks against `DEPLOYMENT.md` requirements.

## Design System
Always read `DESIGN.md` before making any visual or UI decisions.
All font choices, colors, spacing, border-radius, and aesthetic direction are defined there.
Do not deviate without explicit user approval.
In QA mode, flag any code that doesn't match `DESIGN.md`.

Key rules from DESIGN.md:
- Fonts: **Plus Jakarta Sans** (display 600–800, body 400–600) with **Manrope** fallback, loaded via next/font. Numbers: `.mono` utility with `tabular-nums`.
- Primary color `#2563eb` — used ONLY on CTAs, progress fills, and active states. Not on nav or passive elements.
- Border radius is hierarchical: cards 12px, inputs 8px, tags 6px. Never uniform.
- Celebration easing: `cubic-bezier(0.22,1,0.36,1)` — all win-moment animations must use this curve.
- Never use Inter, Roboto, system-ui, Space Grotesk as display/body fonts.
- Never add purple/violet gradients, 3-column icon grids, or gradient CTA buttons.

## gstack
- Use the `/browse` skill from gstack for **all web browsing**. Never use `mcp__claude-in-chrome__*` tools directly.
- gstack is installed at `~/.claude/skills/gstack`.
- Available skills: `/office-hours`, `/plan-ceo-review`, `/plan-eng-review`, `/plan-design-review`, `/design-consultation`, `/design-shotgun`, `/design-html`, `/review`, `/ship`, `/land-and-deploy`, `/canary`, `/benchmark`, `/browse`, `/connect-chrome`, `/qa`, `/qa-only`, `/design-review`, `/setup-browser-cookies`, `/setup-deploy`, `/retro`, `/investigate`, `/document-release`, `/codex`, `/cso`, `/autoplan`, `/careful`, `/freeze`, `/guard`, `/unfreeze`, `/gstack-upgrade`, `/learn`.

## Skill routing

When the user's request matches an available skill, ALWAYS invoke it using the Skill
tool as your FIRST action. Do NOT answer directly, do NOT use other tools first.
The skill has specialized workflows that produce better results than ad-hoc answers.

Key routing rules:
- Product ideas, "is this worth building", brainstorming → invoke office-hours
- Bugs, errors, "why is this broken", 500 errors → invoke investigate
- Ship, deploy, push, create PR → invoke ship
- QA, test the site, find bugs → invoke qa
- Code review, check my diff → invoke review
- Update docs after shipping → invoke document-release
- Weekly retro → invoke retro
- Design system, brand → invoke design-consultation
- Visual audit, design polish → invoke design-review
- Architecture review → invoke plan-eng-review
