import { Auth0Client } from '@auth0/nextjs-auth0/server';

export const auth0 = new Auth0Client({
  // Force Auth0 /v2/logout so federated logout query params are honored.
  logoutStrategy: 'v2',
  session: {
    rolling: true,
    inactivityDuration: 25 * 60,     // 25 min inactivity → logged out (client warns at 19m, logs out at 20m)
    absoluteDuration: 60 * 60 * 24,  // 24 hour hard cap → force re-login
  },
});
