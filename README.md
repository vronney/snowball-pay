# Debt Snowball Planner

A comprehensive web application for managing and paying off debt using the snowball method. Built with Next.js, React, TanStack Query, PostgreSQL, and Auth0 authentication.

## Features

✨ **Debt Management**
- Add and track multiple debts with different interest rates
- Categorize debts (Credit Card, Student Loan, Auto Loan, Mortgage, Personal Loan, Medical Debt, Other)
- View credit utilization and debt summaries
- Real-time debt balance tracking

💰 **Budget Planning**
- Input monthly income and expenses
- Track recurring expenses (subscriptions, utilities, etc.)
- Calculate available cash flow for debt payoff
- Visual budget breakdown

📊 **Payoff Plans**
- Automatic snowball method calculation (pay smallest balance first)
- Alternative avalanche method (highest interest rate first)
- Visualize payoff timeline and order
- Calculate total interest saved
- Project debt-free date

📄 **Document Import**
- Upload bank statements and pay stubs
- Automatically extract income information
- Import existing debts from documents
- Streamlined onboarding process

🔐 **Security**
- Auth0 authentication integration
- Secure user sessions
- Protected API endpoints

## Tech Stack

- **Frontend**: Next.js 14, React 18, TanStack Query, Tailwind CSS, HeroUI, Lucide Icons
- **Backend**: Next.js API Routes
- **Database**: PostgreSQL with Prisma ORM
- **Authentication**: Auth0
- **Styling**: Tailwind CSS with custom animations
- **Charts**: Recharts (for future enhancements)

## Getting Started

Need Google social sign-in with Auth0? Follow the full setup steps in `AUTH0_GOOGLE_CONNECTION_CHECKLIST.md`.

### Prerequisites

- Node.js 18+ installed
- PostgreSQL database
- Auth0 application created at https://auth0.com

### Installation

1. **Clone and install dependencies:**
   ```bash
   npm install
   ```

2. **Set up environment variables:**
   Create a `.env.local` file:
   ```env
   DATABASE_URL="postgresql://user:password@localhost:5432/debt_snowball"
   
   # Auth0 Configuration
   AUTH0_DOMAIN="https://your-auth0-domain.auth0.com"
   AUTH0_CLIENT_ID="your_auth0_client_id"
   AUTH0_CLIENT_SECRET="your_auth0_client_secret"
   AUTH0_SECRET="replace-with-32-byte-hex-secret"
   APP_BASE_URL="http://localhost:3000"

   NEXT_PUBLIC_API_URL="http://localhost:3000"
   ```

3. **Create and seed the database:**
   ```bash
   npx prisma db push
   npx prisma db seed
   ```

4. **Run the development server:**
   ```bash
   npm run dev
   ```

5. **Open browser:**
   Navigate to http://localhost:3000

## Neon Database Workflow

This repository is configured to use Neon with Prisma.

- Neon org: `org-patient-tree-71143752`
- Neon project: `flat-hill-73561129`
- Branches:
  - `development` for local development, schema testing, and validation
  - `production` for live traffic

### Environment variable mapping

- `DATABASE_URL`: pooled Neon URL (runtime and app queries)
- `DIRECT_URL`: direct Neon URL (Prisma schema operations)

Both should include `sslmode=require`.

### Branch-based schema workflow (recommended)

1. Work against Neon `development` branch locally.
2. Apply schema changes and validate behavior.
3. Promote the same schema changes to Neon `production` branch.

Use the following command pattern to pull branch-specific URLs:

```bash
# Pooled URL for runtime
npx neonctl connection-string development --project-id flat-hill-73561129 --pooled

# Direct URL for Prisma schema operations
npx neonctl connection-string development --project-id flat-hill-73561129
```

Then run:

```bash
npm run db:push
npm run dev
```

### Production promotion flow

When a schema change is validated on `development`:

1. Switch env vars to `production` branch connection strings.
2. Apply schema to production deliberately:

```bash
npm run db:push
```

3. Run a quick smoke test on key flows (auth, debts CRUD, income, payoff plan).

For stricter release control, prefer migration files with `prisma migrate` over repeated direct pushes.

## Usage

### Adding Debts

1. Navigate to the "My Debts" tab
2. Click "Add New Debt"
3. Fill in debt details:
   - Debt name (e.g., "Chase Visa")
   - Category (Credit Card, Student Loan, etc.)
   - Current balance
   - Interest rate (APR %)
   - Minimum payment
   - Credit limit (for credit cards)
   - Due date (optional)
4. Click "Add Debt"

### Setting Up Income

1. Go to "Income & Budget" tab
2. Enter your monthly take-home income
3. Enter essential monthly expenses
4. Add any extra amount available for debt payoff
5. Add recurring expenses (subscriptions, utilities, etc.)
6. Click "Save Budget"

### Viewing Your Payoff Plan

1. Navigate to "Payoff Plan" tab
2. The app automatically calculates your debt-free date
3. View the order you should pay off your debts
4. See how much interest you'll save
5. Monitor your progress

### Importing Documents

**Coming soon**: Upload bank statements and pay stubs to auto-populate debt and income information.

## Project Structure

```
src/
├── app/
│   ├── api/
│   │   ├── debts/
│   │   ├── income/
│   │   ├── expenses/
│   │   └── plan/
│   ├── dashboard/
│   ├── layout.tsx
│   ├── page.tsx
│   ├── globals.css
│   └── providers.tsx
├── components/
│   ├── Header.tsx
│   ├── TabNavigation.tsx
│   ├── DebtCard.tsx
│   ├── DebtForm.tsx
│   └── tabs/
│       ├── DebtTab.tsx
│       ├── IncomeTab.tsx
│       └── PayoffTab.tsx
├── lib/
│   ├── hooks.ts
│   ├── utils.ts
│   ├── snowball.ts
│   ├── auth-server.ts
│   └── prisma.ts
├── types/
│   └── index.ts
└── styles/

prisma/
└── schema.prisma
```

## API Endpoints

### Debts
- `GET /api/debts` - Get all debts
- `POST /api/debts` - Create new debt
- `GET /api/debts/[id]` - Get specific debt
- `PATCH /api/debts/[id]` - Update debt
- `DELETE /api/debts/[id]` - Delete debt

### Income
- `GET /api/income` - Get income information
- `POST /api/income` - Create/update income

### Expenses
- `GET /api/expenses` - Get recurring expenses
- `POST /api/expenses` - Add recurring expense
- `DELETE /api/expenses/[id]` - Delete recurring expense

### Plan
- `POST /api/plan/calculate` - Calculate payoff plan

## Snowball Method Explanation

The snowball method is a debt payoff strategy that works as follows:

1. **List debts** from smallest to largest balance
2. **Pay minimums** on all debts
3. **Pay extra** on the smallest debt
4. **Once paid off**, take that payment and add it to the next smallest debt ("snowball effect")
5. **Repeat** until all debts are paid

This method is psychologically powerful because you see quick wins, which motivates continued action.

## Alternative: Avalanche Method

The avalanche method prioritizes highest interest rates first, which mathematically saves the most money but requires more discipline.

## Future Enhancements

- 📄 Document import (bank statements, pay stubs)
- 📈 Advanced charts and visualizations
- 🎯 Customizable goals and milestones
- 📱 Mobile app
- 🔔 Payment reminders and notifications
- 📊 Advanced analytics and reporting
- 🤖 AI-powered recommendations
- 💳 Integration with banking APIs

## Contributing

Contributions welcome! Please create feature branches and submit pull requests.

## License

MIT License - feel free to use this project for personal or commercial purposes.

## Support

For issues or questions, please open an issue on GitHub or contact support.

## Disclaimer

This application is for informational purposes only and should not be considered financial advice. Always consult with a financial advisor before making debt management decisions.
