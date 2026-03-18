# Deployment Guide

This guide covers deploying the Debt Snowball Planner to production environments.

## Deployment Options

### Option 1: Vercel (Recommended)

Vercel is the easiest option as it's optimized for Next.js and created by the same team.

#### Steps:

1. **Create Vercel Account**
   - Go to https://vercel.com
   - Sign up with GitHub, GitLab, or Bitbucket

2. **Connect Your Repository**
   - Click "New Project"
   - Select your repository
   - Vercel auto-detects Next.js

3. **Configure Environment Variables**
   - In the Vercel dashboard, go to Project Settings → Environment Variables
   - Add all variables from `.env.local`:
     ```
     DATABASE_URL
     AUTH0_DOMAIN
     AUTH0_CLIENT_ID
     AUTH0_CLIENT_SECRET
     AUTH0_DOMAIN
     AUTH0_CLIENT_ID
     NEXT_PUBLIC_API_URL (set to your Vercel URL)
     ```

4. **Add Postgres Database**
   - Click **Storage** → **Create Database** → **Postgres**
   - Vercel will automatically set DATABASE_URL
   - Optionally, use external PostgreSQL (AWS RDS, etc.)

5. **Update Auth0 Settings**
   - In Auth0 dashboard, update your app settings:
     - Add Sign-in redirect URI: `https://yourdomain.vercel.app/auth/callback`
     - Add Sign-out redirect URI: `https://yourdomain.vercel.app`

6. **Deploy**
   - Vercel automatically deploys on every push to main branch
   - Monitor at https://vercel.com/dashboard

#### Database Migration on Vercel:

```bash
# Install Vercel CLI
npm i -g vercel

# Pull environment variables
vercel env pull

# Run migrations
npx prisma db push

# Or create a migration
npx prisma migrate deploy
```

### Option 2: AWS (EC2 + RDS)

For more control and scalability.

#### Prerequisites:

- AWS account
- EC2 instance (t3.small or larger, Ubuntu 20.04+)
- RDS PostgreSQL instance
- Domain name

#### Steps:

1. **Create RDS PostgreSQL Database**
   ```bash
   # In AWS Console:
   # - DB instance class: db.t3.micro (free tier)
   # - Storage: 20GB gp2
   # - Publicly accessible: Yes
   # - Initial database: debt_snowball
   ```

2. **Create EC2 Instance**
   ```bash
   # In AWS Console:
   # - AMI: Ubuntu 20.04 LTS
   # - Type: t3.small
   # - Security group: Allow ports 22, 80, 443
   ```

3. **SSH into Instance**
   ```bash
   ssh -i your-key.pem ubuntu@your-ec2-IP
   ```

4. **Install Node.js and Dependencies**
   ```bash
   curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
   sudo apt-get install -y nodejs npm
   sudo apt-get install -y git
   ```

5. **Clone Repository**
   ```bash
   cd ~
   git clone <your-repo-url> debt-planner
   cd debt-planner
   npm install
   ```

6. **Configure Environment**
   ```bash
   nano .env.local
   # Add all environment variables
   # DATABASE_URL should point to your RDS instance
   ```

7. **Run Database Migrations**
   ```bash
   npx prisma db push
   ```

8. **Build Application**
   ```bash
   npm run build
   ```

9. **Install PM2 (Process Manager)**
   ```bash
   sudo npm install -g pm2
   pm2 start npm --name "debt-planner" -- start
   pm2 startup
   pm2 save
   ```

10. **Install Nginx (Reverse Proxy)**
    ```bash
    sudo apt-get install -y nginx
    sudo nano /etc/nginx/sites-available/default
    ```
    
    Replace with:
    ```nginx
    server {
        listen 80 default_server;
        listen [::]:80 default_server;
        server_name _;
    
        location / {
            proxy_pass http://localhost:3000;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection 'upgrade';
            proxy_set_header Host $host;
            proxy_cache_bypass $http_upgrade;
        }
    }
    ```
    
    ```bash
    sudo systemctl restart nginx
    ```

11. **Set Up SSL with Let's Encrypt**
    ```bash
    sudo apt-get install -y certbot python3-certbot-nginx
    sudo certbot --nginx -d yourdomain.com
    sudo systemctl reload nginx
    ```

### Option 3: Docker Deployment

For containerized deployments.

#### Create Dockerfile:

```dockerfile
FROM node:18-alpine AS builder

WORKDIR /app
COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

FROM node:18-alpine

WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY prisma ./prisma

ENV NODE_ENV=production
EXPOSE 3000

CMD ["npm", "start"]
```

#### Build and Run:

```bash
# Build image
docker build -t debt-planner:latest .

# Run container with environment variables
docker run -p 3000:3000 \
  -e DATABASE_URL="postgresql://..." \
  -e AUTH0_DOMAIN="https://..." \
  -e AUTH0_CLIENT_ID="..." \
  -e AUTH0_CLIENT_SECRET="..." \
  debt-planner:latest
```

## Production Checklist

Before going live:

### Security
- [ ] Change default Auth0 settings
- [ ] Enable HTTPS/SSL
- [ ] Implement rate limiting
- [ ] Enable CSRF protection
- [ ] Set secure headers in Next.js
- [ ] Use environment variables for secrets
- [ ] Enable database backups
- [ ] Set up database firewall rules

### Performance
- [ ] Enable CDN (CloudFront, Cloudflare)
- [ ] Set up database connection pooling
- [ ] Enable caching headers
- [ ] Optimize images
- [ ] Monitor Core Web Vitals
- [ ] Set up monitoring and alerting

### Monitoring
- [ ] Set up error tracking (Sentry)
- [ ] Enable application logging
- [ ] Set up uptime monitoring
- [ ] Monitor database performance
- [ ] Track user analytics

### Backups
- [ ] Enable automated database backups
- [ ] Set retention policy
- [ ] Test backup restoration
- [ ] Store backups in separate region

## Environment Variables for Production

```env
# Database
DATABASE_URL="postgresql://user:password@host:5432/db"

# Auth0
AUTH0_DOMAIN="https://your-domain.auth0.com"
AUTH0_CLIENT_ID="your_client_id"
AUTH0_CLIENT_SECRET="your_client_secret"

# Public URLs
AUTH0_DOMAIN="https://your-domain.auth0.com"
AUTH0_CLIENT_ID="your_client_id"
NEXT_PUBLIC_API_URL="https://yourdomain.com"

# Optional but recommended
NODE_ENV="production"
NEXT_PUBLIC_ENVIRONMENT="production"
```

## Monitoring & Logging

### Application Monitoring

```bash
# Install Sentry
npm install @sentry/nextjs

# Configure in next.config.js
withSentryConfig(nextConfig, {
  org: "your-org",
  project: "debt-planner",
})
```

### Database Monitoring

Monitor connection pool, slow queries, and backups through your PostgreSQL provider's dashboard.

## Common Issues

### Database Connection Issues

```bash
# Test connection
psql $DATABASE_URL -c "SELECT 1"

# Check connection pool
# In production, use PgBouncer for connection pooling
```

### High Memory Usage

- Check for memory leaks in Next.js
- Monitor database query performance
- Increase server memory or optimize code

### Slow Builds

- Enable caching in CI/CD
- Use incremental builds
- Optimize dependencies

## Rollback Procedure

### Vercel
- Click "Deployments"
- Find previous stable deployment
- Click "Promote to Production"

### EC2/Custom
```bash
# Revert to previous commit
git revert <commit-hash>
npm install
npm run build
pm2 restart debt-planner
```

## Database Updates in Production

```bash
# Always create backups first
# Then apply migrations

# For Prisma
npx prisma migrate deploy

# Verify with
npx prisma db push --skip-generate
```

## Cost Estimates

### Vercel
- **Free tier**: Suitable for small projects
- **Pro**: $20/month + usage

### AWS
- **EC2 t3.small**: ~$8/month
- **RDS db.t3.micro**: ~$10/month  (free tier first year)
- **Data transfer**: ~$0.01/GB

### Other Options
- **Railway**: $5-20/month
- **Render**: $7/month basic
- **Fly.io**: Pay as you go

## Continuous Deployment

### GitHub Actions Example

```yaml
name: Deploy

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - run: npm ci
      - run: npm run build
      - run: npm test
      
      - name: Deploy to Vercel
        uses: vercel/action@master
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}
```

## Support

For deployment issues:
- Check your provider's documentation
- Review application logs
- Monitor database health
- Check Auth0 integration settings
