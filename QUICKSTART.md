# Debt Snowball Planner - Quick Start Guide

## 5-Minute Setup

### 1. Prerequisites Check
```bash
node --version  # Should be 18+
npm --version
# Have PostgreSQL running locally
# Have Auth0 account ready
```

### 2. Clone & Install
```bash
cd your-workspace
npm install
```

### 3. Environment Setup
Create `.env.local` with:
```env
DATABASE_URL="postgresql://postgres:password@localhost:5432/debt_snowball"
AUTH0_DOMAIN="https://your-auth0-domain.auth0.com"
AUTH0_CLIENT_ID="your-id"
AUTH0_CLIENT_SECRET="your-secret"
AUTH0_DOMAIN="https://your-auth0-domain.auth0.com"
AUTH0_CLIENT_ID="your-id"
NEXT_PUBLIC_API_URL="http://localhost:3000"
```

### 4. Database
```bash
npx prisma db push
```

### 5. Run
```bash
npm run dev
# Open http://localhost:3000
```

## File Structure Reference

```
Budget/
├── src/
│   ├── app/
│   │   ├── api/                    # API endpoints
│   │   │   ├── debts/              # Debt CRUD
│   │   │   ├── income/             # Income management
│   │   │   ├── expenses/           # Recurring expenses
│   │   │   ├── plan/               # Payoff plan calculation
│   │   │   └── documents/          # Document upload
│   │   ├── dashboard/              # Main app
│   │   ├── layout.tsx              # Root layout
│   │   ├── page.tsx                # Home page
│   │   ├── globals.css             # Global styles
│   │   └── providers.tsx           # Providers setup
│   ├── components/
│   │   ├── Header.tsx              # App header
│   │   ├── TabNavigation.tsx       # Tab switcher
│   │   ├── DebtCard.tsx            # Debt display
│   │   ├── DebtForm.tsx            # Add debt form
│   │   ├── DocumentImport.tsx      # Document uploader
│   │   └── tabs/
│   │       ├── DebtTab.tsx         # Debts management
│   │       ├── IncomeTab.tsx       # Income & budget
│   │       └── PayoffTab.tsx       # Payoff plan
│   ├── lib/
│   │   ├── hooks.ts                # React Query hooks
│   │   ├── utils.ts                # Utility functions
│   │   ├── snowball.ts             # Calculation engine
│   │   ├── auth-server.ts          # Server-side auth
│   │   └── prisma.ts               # DB client
│   └── types/
│       └── index.ts                # TypeScript types
├── prisma/
│   └── schema.prisma               # Database schema
├── package.json                    # Dependencies
├── tsconfig.json                   # TypeScript config
├── tailwind.config.ts              # Tailwind config
├── README.md                       # Documentation
├── SETUP_GUIDE.md                  # Detailed setup
├── DEPLOYMENT.md                   # Deployment guide
└── .env.local                      # Secrets (don't commit)
```

## Key Features Explained

### 🏠 Home Tab - My Debts
**What it does**: Manage all your debts
- View summary cards (total debt, avg rate, utilization)
- Add new debts with details
- Delete debts
- See credit card utilization bars

**How to use**:
1. Click "Add New Debt"
2. Fill in: name, category, balance, APR, minimum payment
3. Optionally add credit limit and due date
4. Click "Add Debt"

### 💰 Income Tab - Budget
**What it does**: Track money in and out
- Enter monthly income
- Enter essential expenses
- Add recurring expenses
- See visual budget breakdown

**Features**:
- Automatic budget visualization
- Calculates available cash flow
- Tracks recurring subscriptions
- Shows monthly payment requirements

### 📊 Plan Tab - Payoff Strategy
**What it does**: Generates your debt elimination plan
- Shows debt-free date
- Displays total interest saved
- Lists payoff order (smallest to largest)
- Shows monthly snowball amount

**The Snowball Method**:
1. Pay minimums on everything
2. Attack smallest debt with extra cash
3. When paid off, add that payment to next smallest
4. Repeat - your "snowball" gets bigger each time!

## API Quick Reference

### Debts
```
GET    /api/debts              List all debts
POST   /api/debts              Create debt
GET    /api/debts/[id]         Get specific debt
PATCH  /api/debts/[id]         Update debt
DELETE /api/debts/[id]         Delete debt
```

### Income
```
GET    /api/income             Get income settings
POST   /api/income             Save income settings
```

### Expenses
```
GET    /api/expenses           List recurring expenses
POST   /api/expenses           Add expense
DELETE /api/expenses/[id]      Delete expense
```

### Plan
```
POST   /api/plan/calculate     Generate payoff plan
```

### Documents
```
POST   /api/documents/upload   Upload document
GET    /api/documents/upload   List documents
```

## Database Essentials

### Prisma Commands
```bash
# View database GUI
npx prisma studio

# Create migration
npx prisma migrate dev --name add_feature

# Push schema (dev)
npx prisma db push

# Reset database (careful!)
npx prisma migrate reset

# Regenerate client
npx prisma generate
```

### Key Models
- **User**: Auth0 auth + ownership
- **Debt**: Credit cards, loans, etc.
- **Income**: Monthly budget info
- **Expense**: Recurring costs
- **PayoffPlan**: Generated plan
- **PayoffStep**: Each debt in sequence
- **UploadedDocument**: Imported documents

## Common Tasks

### Add a Credit Card
1. My Debts tab → Add New Debt
2. Name: "Chase Sapphire Preferred"
3. Category: Credit Card
4. Balance: 3500
5. APR: 18.99
6. Min payment: 85
7. Credit limit: 10000 (optional)
8. Click Add

### Import Bank Statement
1. Income tab → Import from Documents section
2. Select "Debt List / Statement"
3. Upload PDF/image
4. System extracts debts automatically
5. Review and save

### Update Payoff Focus
1. Adjust "Extra Payment" in Income tab
2. Payoff Plan updates automatically
3. See new debt-free date

## Troubleshooting

### Can't log in?
- Check Auth0 settings match
- Verify redirect URIs correct
- Check environment variables

### Database errors?
```bash
# Fresh start
npx prisma migrate reset

# Check connection
psql $DATABASE_URL -c "SELECT 1"
```

### Calculations wrong?
- Verify all debt info entered correctly
- Check income and expenses
- Ensure interest rates are APR, not decimal

### Slow performance?
- Check database queries (Prisma Studio)
- Verify network requests in DevTools
- Check available RAM/disk

## Next Steps

1. **Customize branding**:
   - Edit colors in `tailwind.config.ts`
   - Modify text in components

2. **Deploy**:
   - Follow `DEPLOYMENT.md`
   - Use Vercel for easiest option

3. **Add features**:
   - Document OCR extraction
   - Notifications/reminders
   - Mobile app
   - Advanced reporting

4. **Optimize**:
   - Add more calculations
   - Improve UI/UX
   - Performance monitoring
   - Analytics integration

## Resources

- **Next.js**: https://nextjs.org/docs
- **TanStack Query**: https://tanstack.com/query
- **Prisma**: https://www.prisma.io/docs
- **Auth0**: https://auth0.com/docs
- **Tailwind**: https://tailwindcss.com/docs
- **TypeScript**: https://www.typescriptlang.org/docs

## Getting Help

1. Check [SETUP_GUIDE.md](./SETUP_GUIDE.md) for detailed setup
2. Check [DEPLOYMENT.md](./DEPLOYMENT.md) for production info
3. Check [README.md](./README.md) for overview
4. Open an issue with:
   - Error message
   - Steps to reproduce
   - Environment details

## Success Metrics

Track these to gauge app health:

- **User engagement**: Debts added, plans viewed
- **Performance**: API response times
- **Reliability**: Errors per session
- **Satisfaction**: User feedback

## Tips for Success

✅ **Do**:
- Validate all financial information
- Back up database regularly
- Monitor server performance
- Test before deploying
- Keep dependencies updated

❌ **Don't**:
- Store API keys in code
- Commit `.env.local`
- Modify Prisma manually in production
- Use old Node.js versions
- Ignore security warnings

Happy debt eliminating! 🎉
