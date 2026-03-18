# Project Guidelines

## Code Style

- Use TypeScript with strict typing and avoid `any`.
- Prefer imports via `@/*` aliases from `tsconfig.json`.
- Keep domain types in `src/types/index.ts` unless a new focused type module is clearly needed.
- Keep components small and focused; follow existing patterns in `src/components`.

## Architecture

- Framework: Next.js 14 App Router.
- UI pages live under `src/app/**`; API routes live under `src/app/api/**/route.ts`.
- Auth and request ownership are enforced server-side with `verifyAuth()` from `src/lib/auth-server.ts`.
- Data access is through Prisma (`src/lib/prisma.ts`) and user-scoped by `userId`.
- Client data synchronization uses TanStack Query hooks in `src/lib/hooks.ts`.
- Core payoff math lives in `src/lib/snowball.ts` and is consumed by API/UI.

## Build and Test

- Install: `npm install`
- Dev server: `npm run dev`
- Lint: `npm run lint`
- Production build: `npm run build`
- Prisma schema sync (dev): `npm run db:push`
- Prisma migration: `npm run db:migrate`
- Prisma Studio: `npm run db:studio`

## Conventions

- In API routes, call `verifyAuth()` before database work and return helper errors (`unauthorized`, `badRequest`, `serverError`) for consistent responses.
- Validate request payloads with Zod before writes.
- After mutations, invalidate the relevant TanStack Query keys.
- Preserve existing Auth0 + Prisma user sync flow in `src/lib/auth-server.ts`.
- Align debt payoff features with product docs in `Agent/PRD.md` and execution constraints in `Agent/SKILL.md`.

## Known Pitfalls

- On Windows, a root file named `nul` can break git staging (`unable to index file 'nul'`). Keep it ignored or remove it before staging.
- Missing `.env.local` values for Auth0 or `DATABASE_URL` will break auth/data flows.
- `NEXT_PUBLIC_API_URL` must match the app base URL for client-side API hooks.
