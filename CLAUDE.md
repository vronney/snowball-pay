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

## Project Docs
- `docs/product/PRD.md`
- `docs/architecture/ARCHITECTURE.md`
- `docs/security/CYBERSECURITY.md`
- `docs/security/AUTH0_GOOGLE_CONNECTION_CHECKLIST.md`
- `docs/marketing/MARKETING_PLAN.md`
- `docs/agent/SKILL.md`

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
