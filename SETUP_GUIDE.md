# Debt Snowball Planner - Setup Guide

## Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js**: v18.0 or higher ([Download](https://nodejs.org/))
- **PostgreSQL**: v12 or higher ([Download](https://www.postgresql.org/download/))
- **npm** or **yarn**: Comes with Node.js

## Step 1: PostgreSQL Database Setup

### On Windows (PostgreSQL installed):

1. Open **pgAdmin** (comes with PostgreSQL) or use command line
2. Create a new database:
   ```sql
   CREATE DATABASE debt_snowball;
   ```
3. Note your PostgreSQL credentials:
   - Username: `postgres` (default)
   - Password: (the one you set during installation)
   - Host: `localhost`
   - Port: `5432`

### On Mac (using Homebrew):

1. Install PostgreSQL:
   ```bash
   brew install postgresql@15
   brew services start postgresql@15
   ```

2. Create database:
   ```bash
   createdb debt_snowball
   ```

### On Linux (Ubuntu/Debian):

```bash
sudo apt-get install postgresql postgresql-contrib
sudo -u postgres psql
CREATE DATABASE debt_snowball;
```

## Step 2: Auth0 Setup

If you plan to enable Google social login, complete this checklist after finishing the base Auth0 app setup: `AUTH0_GOOGLE_CONNECTION_CHECKLIST.md`.

### Register for Auth0 Developer Account

1. Go to https://auth0.com
2. Sign up for a free developer account
3. Verify your email
4. Log into your Auth0 dashboard

### Create an Auth0 Application

1. From your Auth0 Dashboard, go to **Applications** → **Applications**
2. Click **Create App Integration**
3. Choose **OIDC** as the sign-in method
4. Select **Single-Page Application**
5. Click **Next**

### Configure Your App

Fill in the following information:

- **App Integration Name**: Debt Snowball Planner
- **Sign-in redirect URIs**:
  - `http://localhost:3000/auth/callback`
  - `https://yourdomain.com/auth/callback` (for production)
- **Sign-out redirect URIs**:
  - `http://localhost:3000`

Click **Save**

### Get Your Credentials

After creating the app, you'll see your credentials:

- **Client ID** - Copy this
- **Client Secret** - Copy this (keep this secret!)
- **Auth0 Domain** - Find in the top right corner, format: `https://xxxxx.auth0.com`

## Step 3: Local Setup

### 1. Clone the Repository

```bash
cd path/to/your/workspace
git clone <repository-url> debt-planner
cd debt-planner
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Create Environment File

Create `.env.local` in the root directory:

```env
# Database
DATABASE_URL="postgresql://postgres:your_password@localhost:5432/debt_snowball"

# Auth0 Configuration
AUTH0_DOMAIN="https://your-auth0-domain.auth0.com"
AUTH0_CLIENT_ID="your_auth0_client_id_here"
AUTH0_CLIENT_SECRET="your_auth0_client_secret_here"

# Public URLs (safe to expose)
AUTH0_DOMAIN="https://your-auth0-domain.auth0.com"
AUTH0_CLIENT_ID="your_auth0_client_id_here"
NEXT_PUBLIC_API_URL="http://localhost:3000"
```

**Replace the placeholders with your actual values:**
- Your PostgreSQL password
- Your Auth0 domain, client ID, and client secret

### 4. Initialize Database

Run Prisma migrations to create the database schema:

```bash
npx prisma db push
```

You should see output like:
```
✔ Database synced, migrations will be recorded as applied
```

### 5. Verify Database Connection

Open Prisma Studio to verify your database:

```bash
npx prisma studio
```

This opens a web interface at `http://localhost:5555` where you can view and manage your database.

## Step 4: Run the Application

### Development Mode

```bash
npm run dev
```

You should see:
```
▲ Next.js 14.0.0
  - Local:        http://localhost:3000
```

Open your browser and navigate to `http://localhost:3000`

### Build for Production

```bash
npm run build
npm start
```

## First Time Use

1. **Visit the app**: Open `http://localhost:3000`
2. **Click "Get Started"** or navigate to `/dashboard`
3. **Log in with Auth0**: You'll be redirected to Auth0's login screen
4. **Create account** if needed
5. **Start adding debts**: 
   - Go to "My Debts" tab
   - Click "Add New Debt"
   - Fill in your debt information
6. **Add income**: 
   - Go to "Income & Budget" tab
   - Enter your financial details
7. **View your plan**: 
   - Go to "Payoff Plan" tab
   - See your personalized debt elimination strategy

## Troubleshooting

### "Database connection failed"

- Check PostgreSQL is running
- Verify DATABASE_URL is correct
- Try connecting with a PostgreSQL client to confirm credentials

### "Cannot find module 'prisma'"

```bash
npm install
npx prisma generate
```

### Auth0 login not working

- Verify AUTH0_DOMAIN, AUTH0_CLIENT_ID, and AUTH0_CLIENT_SECRET are correct
- Check redirect URIs match exactly in Auth0 settings
- Check browser console for error details (F12)

### Port 3000 already in use

```bash
# Use a different port
npm run dev -- -p 3001
```

### Database migrations failed

```bash
# Reset and re-sync database (WARNING: deletes all data)
npx prisma migrate reset
npx prisma db push
```

## Development Tools

### Prisma Studio (Database GUI)

```bash
npx prisma studio
```

Access at `http://localhost:5555`

### Next.js Build Analysis

```bash
npm run build
npm run analyze  # requires @next/bundle-analyzer
```

### ESLint Check

```bash
npm run lint
```

## Git Workflow

```bash
# Initialize git if needed
git init
git add .
git commit -m "Initial commit: Debt Snowball Planner setup"

# Create a feature branch
git checkout -b feature/your-feature-name

# After changes, push
git push origin feature/your-feature-name
```

## Environment Checklist

Before deploying, ensure:

- [ ] PostgreSQL database created
- [ ] Auth0 application created
- [ ] All environment variables set
- [ ] Database migrations run successfully
- [ ] Application runs without errors
- [ ] Can log in with Auth0
- [ ] Can add debts and view payoff plan

## Next Steps

Once setup is complete:

1. **Explore the app**: Add some sample debts and test the snowball calculation
2. **Customize**: Modify colors, text, and branding in components
3. **Deploy**: Deploy to Vercel, AWS, or your preferred platform
4. **Add features**: Implement document import, notifications, etc.

## Need Help?

- Check the main [README.md](./README.md)
- Review [Troubleshooting](#troubleshooting) section
- Check Next.js docs: https://nextjs.org/docs
- Check Prisma docs: https://www.prisma.io/docs
- Check Auth0 docs: https://auth0.com/docs
- Open an issue in the repository

## Security Notes

⚠️ **Important:**

- Never commit `.env.local` to version control
- Keep AUTH0_CLIENT_SECRET private
- Use strong database passwords
- Enable HTTPS in production
- Regularly update dependencies: `npm update`
