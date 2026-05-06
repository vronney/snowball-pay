# SnowballPay

Know exactly when you will be debt-free.

SnowballPay is a personal debt payoff planner that turns scattered balances,
minimum payments, interest rates, and monthly cash flow into a clear plan users
can actually follow. Add debts, choose a payoff strategy, see the projected
debt-free date, and keep momentum with progress tracking, reminders, milestones,
and personalized planning insights.

It is built for people who are tired of spreadsheets, minimum-payment autopilot,
and the recurring question: "Which debt should I pay first?"

## What SnowballPay Does

SnowballPay gives users a debt payoff command center:

- Prioritized payoff order for Snowball, Avalanche, or Custom strategies
- Month-by-month payoff projections with a debt-free date
- Cash-flow-aware planning based on income, expenses, and minimum payments
- Balance charts, payoff timelines, focus-debt guidance, and progress tracking
- What-if planning for extra payments and strategy changes
- AI-powered payoff recommendations for Pro users
- Payment reminders, lifecycle emails, calendar export, and shareable progress
- No bank connection required; users can add debts manually or import documents

## Product Promise

Debt payoff is not just math. It is staying consistent long enough for the math
to work.

SnowballPay combines payoff calculations with execution support so users know:

- What to pay next
- Why that debt is the current priority
- How long the plan will take
- How extra payments change the timeline
- Whether the plan still fits their real monthly cash flow
- How much progress they have already made

## Core Workflows

### 1. Build a Plan

Users add debt balances, APRs, minimum payments, due dates, income, and recurring
expenses. SnowballPay calculates available payoff cash flow and generates a
personalized payoff roadmap.

### 2. Choose a Strategy

Users can switch between:

- Snowball: smallest balance first for faster early wins
- Avalanche: highest APR first to reduce interest
- Custom: user-defined payoff order for personal priorities

The dashboard updates the payoff order, charts, debt-free date, interest impact,
and focus debt as the strategy changes.

### 3. Track Progress

Users log payments and update balances over time. SnowballPay shows total paid,
remaining debt, debts closed, tracking streaks, balance trends, and payoff
milestones.

### 4. Stay on Course

The app supports due-date reminders, weekly progress emails, monthly reviews,
win-back emails, payoff plan emails, and personalized recommendations to help
users keep returning to the plan.

## Feature Highlights

### Payoff Planning

- Snowball, Avalanche, and Custom payoff methods
- Debt-free date projection
- Interest paid and interest saved estimates
- Payoff order list and focus-debt explanation
- Balance-over-time chart and payoff timeline
- Minimums-only comparison and strategy comparison

### Cash Flow and Budgeting

- Monthly take-home income tracking
- Essential expenses and recurring expenses
- Available cash flow calculation
- Extra payment and acceleration planning
- Guardrails for realistic payoff planning

### Debt Tracking

- Track credit cards, student loans, auto loans, mortgages, personal loans,
  medical debt, and other balances
- Store APR, balance, original balance, credit limit, minimum payment, due date,
  category, and custom priority
- Record payments and monthly balance snapshots
- View utilization and progress by debt

### AI Insights

Pro users can generate personalized recommendations, including:

- Payoff advice
- Spending insights
- Monthly change summaries
- Behavior nudges
- Debt-risk alerts
- Negotiation suggestions
- Strategy and cash-flow guidance

### Document Import

SnowballPay can analyze uploaded statement, debt, and income documents to help
extract debts, recurring charges, and income inputs for review before saving.

### Sharing and Exports

- Shareable debt-free date card
- Calendar export for payments
- Email payoff plan flow
- Open Graph image routes for payoff milestones

### Monetization

The current product surface supports a freemium model:

- Free: up to 5 debts, Snowball and Avalanche strategies, monthly payoff
  calendar, progress visualization, and mobile-friendly planning
- Pro: $9/month with a 7-day trial, unlimited debts, custom priority order,
  personalized recommendations, deeper planning tools, and priority support

## Tech Stack

- Framework: Next.js 14 App Router
- Language: TypeScript
- UI: React 18, Tailwind CSS, shadcn/Radix primitives, Lucide icons
- Data fetching: TanStack Query
- Charts: Recharts
- Database: PostgreSQL with Prisma
- Auth: Auth0
- Billing: Stripe subscriptions and customer portal
- Email: Resend and React Email
- AI: Anthropic Claude API
- Rate limiting: Upstash Redis with local fallback
- Analytics: PostHog
- Tests: Vitest
- Deployment target: Vercel

## App Surfaces

Key user-facing routes include:

- `/` - product landing page
- `/dashboard` - authenticated payoff command center
- `/onboarding` - guided setup flow
- `/calculator` - public debt payoff calculator
- `/learn` - educational content
- `/contact` - support contact flow
- `/privacy` and `/terms` - legal pages

## Local Development

### Prerequisites

- Node.js 18+
- npm
- PostgreSQL database, or Neon branch connection strings
- Auth0 application
- Optional service accounts for Stripe, Resend, Anthropic, Upstash, and PostHog

### Install

```bash
npm install
```

### Configure Environment

Copy the sample environment file and fill in the values you need:

```bash
cp .env.example .env.local
```

Core variables:

```env
DATABASE_URL="postgresql://..."
DIRECT_URL="postgresql://..."

AUTH0_DOMAIN="your-tenant.us.auth0.com"
AUTH0_CLIENT_ID="your_client_id"
AUTH0_CLIENT_SECRET="your_client_secret"
AUTH0_SECRET="replace_with_64_char_random_hex"

APP_BASE_URL="http://localhost:3000"
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

Optional integrations are documented in `.env.example`:

- Stripe: subscription checkout, customer portal, webhooks
- Resend: lifecycle and transactional emails
- Anthropic: document extraction and AI recommendations
- Upstash Redis: rate limiting
- PostHog: product analytics
- Auth0 Management API: account deletion

### Prepare the Database

```bash
npm run db:push
```

Useful Prisma commands:

```bash
npm run db:migrate
npm run db:studio
```

### Run the App

```bash
npm run dev
```

Open `http://localhost:3000`.

## Neon Workflow

This project includes scripts for switching Neon branches:

```bash
npm run db:use:dev
npm run db:use:prod
```

Recommended flow:

1. Work against the Neon `development` branch locally.
2. Apply and validate schema changes with `npm run db:push`.
3. Promote deliberate schema changes to the `production` branch.
4. Smoke test auth, debt CRUD, income, expenses, payoff plans, billing, and
   lifecycle email flows after promotion.

For stricter release control, prefer Prisma migrations over repeated direct
schema pushes.

## Scripts

```bash
npm run dev            # Start the Next.js dev server
npm run build          # Generate Prisma client and build Next.js
npm run start          # Start the production build
npm run lint           # Run Next.js linting
npm run test           # Run Vitest
npm run test:watch     # Run Vitest in watch mode
npm run test:coverage  # Run coverage
npm run db:push        # Push Prisma schema to the database
npm run db:migrate     # Create/apply a local Prisma migration
npm run db:studio      # Open Prisma Studio
```

## Project Structure

```text
src/
  app/                 Next.js App Router pages and API routes
  components/          Landing, dashboard, payoff, billing, document, and UI components
  emails/              React Email templates for lifecycle messaging
  lib/                 Auth, Prisma, Stripe, analytics, AI, calculations, utilities
  types/               Shared TypeScript types
  __tests__/           Vitest suites

prisma/
  schema.prisma        PostgreSQL data model

docs/
  architecture/        Architecture notes
  marketing/           Growth and positioning docs
  product/             Product requirements
  security/            Security and Auth0 setup notes

public/                Logos, icons, favicon, llms.txt
scripts/               Neon branch utility scripts
```

## Data Model

The Prisma schema includes models for:

- Users and preferences
- Debts, income, expenses, and payment records
- Balance snapshots and payoff plans
- AI recommendation cache
- Uploaded documents
- Debt story and milestone events
- Stripe subscription metadata

## API Coverage

The app includes API routes for:

- Debts, income, expenses, payments, snapshots, and payoff plan calculation
- Recommendations and AI-generated debt story/celebration content
- Document upload and extraction
- Calendar export
- Stripe checkout, portal, and webhooks
- User subscription, data export/deletion, and preferences
- Lifecycle email, unsubscribe, support, and cron jobs
- Open Graph images for debt payoff sharing

## Testing

Run the test suite:

```bash
npm run test
```

Coverage:

```bash
npm run test:coverage
```

Note: the current Vitest include pattern targets `src/__tests__/**/*.test.ts`.
Some colocated tests under feature folders may need config updates if they should
run as part of the default suite.

## Deployment

Vercel is the expected deployment target. Before deploying, configure production
environment variables for:

- Database and Prisma direct connection
- Auth0 app and management credentials
- Stripe keys, price IDs, and webhook secrets
- Resend API key
- Anthropic API key
- Upstash Redis
- PostHog
- Cron and unsubscribe secrets

Cron jobs are configured in `vercel.json` for lifecycle emails, weekly progress,
monthly reviews, win-back, weekly digest, and due-date reminders.

## Security and Privacy Notes

- Authenticated routes use Auth0 session checks.
- API routes scope user data to the authenticated user.
- Account deletion removes the Auth0 account, local user data, active app data,
  and cancels a stored active SnowballPay subscription when present.
- The app is for planning and education, not financial, legal, or credit advice.

## More Documentation

- `QUICKSTART.md` - local setup path
- `SETUP_GUIDE.md` - environment and service setup
- `DEPLOYMENT.md` - production deployment notes
- `DESIGN.md` - product design guidance
- `docs/architecture/ARCHITECTURE.md` - system architecture
- `docs/security/AUTH0_GOOGLE_CONNECTION_CHECKLIST.md` - Google social login setup

## Disclaimer

SnowballPay provides debt payoff planning tools and educational projections. It
does not provide financial advice, debt settlement, legal advice, or guaranteed
results. Users should review their own financial situation and consult qualified
professionals when needed.
