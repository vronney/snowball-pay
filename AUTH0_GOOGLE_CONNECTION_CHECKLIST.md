# Auth0 + Google Connection Setup Checklist

## 1) Auth0 Application

1. Go to Auth0 Dashboard -> Applications -> Applications -> your app.
2. Confirm application type is **Regular Web Application**.
3. Note these values:
   - Auth0 Domain (example: `dev-xxxx.us.auth0.com`)
   - Client ID
   - Client Secret

## 2) Google Cloud OAuth Setup

1. Open Google Cloud Console -> APIs & Services -> Credentials.
2. Configure OAuth consent screen:
   - App name, support email, developer email.
   - Scopes: `openid`, `email`, `profile`.
   - Add test users (if app is in Testing mode).
3. Create OAuth credentials:
   - Create Credentials -> OAuth client ID -> Web application.
4. Add Authorized redirect URI:
   - `https://YOUR_AUTH0_DOMAIN/login/callback`
   - Example: `https://dev-xxxx.us.auth0.com/login/callback`
5. Save and copy Google Client ID and Client Secret.

## 3) Configure Google Connection in Auth0

1. Auth0 Dashboard -> Authentication -> Social -> Google.
2. Enable Google connection.
3. Paste Google Client ID and Client Secret.
4. In the connection settings, enable this connection for your application.
5. Save.

## 4) Auth0 App URLs

In Auth0 Dashboard -> Applications -> your app -> Settings:

1. Allowed Callback URLs:
   - `http://localhost:3000/auth/callback`
   - Production callback URLs (for example: `https://yourapp.com/auth/callback`)
2. Allowed Logout URLs:
   - `http://localhost:3000`
   - Production logout URLs
3. Allowed Web Origins:
   - `http://localhost:3000`
   - Production origins
4. Save changes.

## 5) Local Environment Variables

In `.env.local`:

```env
AUTH0_DOMAIN=dev-xxxx.us.auth0.com
AUTH0_CLIENT_ID=your_auth0_client_id
AUTH0_CLIENT_SECRET=your_auth0_client_secret
AUTH0_SECRET=replace_with_32_byte_hex
APP_BASE_URL=http://localhost:3000
NEXT_PUBLIC_API_URL=http://localhost:3000
```

In `.env` (Prisma CLI):

```env
DATABASE_URL=your_postgres_connection_string
```

## 6) Verify App Routes

1. Login route: `/auth/login`
2. Logout route: `/auth/logout`
3. Callback route: `/auth/callback` (handled by Auth0 SDK)
4. Middleware should be active to protect dashboard/API routes.

## 7) Local End-to-End Test

1. Run `npm run dev`.
2. Open home page.
3. Click **Sign In**.
4. Choose Google.
5. Complete consent/login.
6. Confirm redirect to `/dashboard`.
7. Confirm protected API calls no longer return 401.

## 8) Production Readiness

1. Ensure Auth0 warning about Dev Keys is gone.
2. Add production URLs in Auth0 app settings.
3. Set production env vars in host:
   - `AUTH0_DOMAIN`
   - `AUTH0_CLIENT_ID`
   - `AUTH0_CLIENT_SECRET`
   - `AUTH0_SECRET`
   - `APP_BASE_URL`
   - `DATABASE_URL`
4. Redeploy and retest login/logout/callback flow.

## 9) Common Issues

1. **Callback URL mismatch**
   - Fix exact callback URL in Auth0 application settings.
2. **Google invalid_redirect_uri**
   - Ensure Google redirect URI is Auth0 callback (`https://YOUR_AUTH0_DOMAIN/login/callback`).
3. **Login loop/session issues**
   - Verify `APP_BASE_URL`, Allowed Web Origins, and HTTPS in production.
4. **Works locally but not production**
   - Check production URLs in Auth0 and production env vars.
