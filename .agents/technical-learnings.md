# Technical Learnings & Guidelines for Agents

This document contains cumulative technical knowledge and "gotchas" discovered while building and debugging the Debt Snowball Planner. Future agents should reference these guidelines when making architectural decisions or debugging.

## Next.js Auth0 Middleware vs. Vercel Cron
- **The Issue**: When using `@auth0/nextjs-auth0` middleware, it typically secures all `/api/*` routes by requiring an active user session. Vercel Cron jobs trigger via headless HTTP requests that do not have an Auth0 session, which results in the middleware blocking the request with a `401 Unauthorized` before the route handler is ever executed.
- **The Solution**: In `src/middleware.ts`, ensure that all cron routes (e.g., `pathname.startsWith('/api/cron')`) and any public webhooks (e.g., Stripe, unsubscribe links) bypass the Auth0 session validation. 
- **Cron Security**: The cron endpoints should still be secured, but this should be done *inside* the route handler using Vercel's `CRON_SECRET` rather than Auth0.

## Next.js App Router Dependencies
- Avoid bringing in generic React SPA dependencies. For routing, rely strictly on Next.js `next/navigation` and `next/link`. Do not use `react-router-dom`.
- Minimize heavy client-side utility libraries. Use native `Intl` for date and currency formatting instead of importing heavy libraries like `date-fns` unless complex timezone manipulations are strictly required.

## The KISS Principle (Keep It Simple, Stupid)
- **File Encapsulation**: Do not `export` helper functions, types, or custom Error classes unless they are actively imported by other files. Keep internal implementations encapsulated to reduce the public API surface area.
- **Continuous De-bloating**: When refactoring or deprecating features, always aggressively delete dead files, unused React components, and stale utilities. Use tools like `knip` to verify that code and dependencies are actually in use.
