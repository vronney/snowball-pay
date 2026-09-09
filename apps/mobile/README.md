# SnowballPay Mobile (Expo)

Native iOS + Android app for the SnowballPay funnel — free calculator → saved plan → Pro — on top of the **existing** Next.js API. No parallel backend.

```
apps/mobile ──HTTPS + Bearer──▶ getsnowballpay.com/api/*   (same routes the web uses)
```

## Stack

| Layer | Choice |
|---|---|
| Framework | Expo SDK 57 (managed) + expo-router |
| Styling | NativeWind 4 — tokens from `../../DESIGN.md` in `tailwind.config.js` |
| Server state | TanStack Query (`src/lib/queries.ts`) |
| UI state | Zustand, one store (`src/store/calculator.ts`) |
| Auth | Auth0 native PKCE via expo-auth-session; tokens in expo-secure-store |
| Build/release | EAS Build + EAS Submit (`eas.json`) |

This package is standalone (own `package-lock.json`, own `node_modules`); the root `tsconfig.json` excludes `apps/` so the web build never sees it.

## Screens

| Route | Screen |
|---|---|
| `/calculator` | Free, no-login calculator. Pre-seeded with realistic numbers; full payoff order visible. |
| `/plan` | Plan builder — snowball vs. avalanche with each option's real date, reorder debts, name the plan. |
| `/save` | Save gate — "Save my plan" triggers Auth0 sign-in, then `POST /api/onboarding/complete`. |
| `/(app)/dashboard` | Debt-free date front and center, per-debt progress, one tap to an extra payment. |
| `/(app)/debt/[id]/extra` | The wedge: amount → live "Debt-free N days sooner" delta → `POST /api/payments` (mode `log`). |
| `/(app)/settings` | Sign out, plan status, in-app account deletion (`DELETE /api/user/data`). |

## API contract this app depends on (web repo)

- `src/lib/mobileAuth.ts` + `src/middleware.ts` — accept `Authorization: Bearer <Auth0 access token>` on `/api/*`, verified against the tenant JWKS for `AUTH0_MOBILE_AUDIENCE`.
- `POST /api/plan/calculate` — public payoff math (`src/lib/planCalculate.ts`) so mobile and web share one engine.

## Setup

1. **Auth0** (one-time, tenant dashboard):
   - Create an **API** with identifier `https://api.getsnowballpay.com` (RS256). Set the same value as `AUTH0_MOBILE_AUDIENCE` on Vercel.
   - Create a **Native** application. Allowed Callback URLs: `snowballpay://auth/callback`. Enable the Refresh Token grant and the Google connection you already use on web.
   - Optional: an Action that adds `https://getsnowballpay.com/email` to access tokens. Without it the API falls back to `/userinfo` (cached).
2. Copy `.env.example` to `.env` and fill the `EXPO_PUBLIC_*` values (public identifiers only).
3. `npm install`, then `npx expo start` — Expo Go can't run secure-store + auth-session reliably, so use a development build: `eas build --profile development`.

## Ship

```bash
npm run typecheck
eas build --profile preview            # TestFlight + Play internal
eas build --profile production && eas submit --platform ios --profile production
```

## Not in this build (on purpose)

- RevenueCat / in-app Pro purchase (P1 — Apple 3.1.1 means no Stripe links in-app; Settings only states the price).
- Push reminders, Plaid Link, PDF import, widgets (P1/P2 per the build spec).
- Offline calculator math — the API is the single implementation until offline is actually requested.
