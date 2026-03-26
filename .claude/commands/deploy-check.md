# /deploy-check

Run a pre-deployment readiness check for this repo using `DEPLOYMENT.md`.

## Local Validation
1. `npm run lint`
2. `npm run build`

## Environment Checklist
- Confirm required env vars are documented and present in target environment:
  - `DATABASE_URL`
  - `AUTH0_DOMAIN`
  - `AUTH0_CLIENT_ID`
  - `AUTH0_CLIENT_SECRET`
  - `NEXT_PUBLIC_API_URL`
- Confirm Auth0 callback/logout URLs match deployment domain.
- Confirm database migration plan (`npx prisma db push` or `npx prisma migrate deploy`).

## Output Format
Provide:
1. Go/No-Go recommendation
2. Blocking issues (if any)
3. Exact next actions to resolve blockers

## Safety
- Never print secret values.
- Do not execute production deploy commands automatically.
