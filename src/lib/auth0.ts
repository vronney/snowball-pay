import { Auth0Client } from '@auth0/nextjs-auth0/server';

export const auth0 = new Auth0Client({
  session: {
    rolling: true,
    inactivityDuration: 60 * 60,     // 1 hour inactivity → logged out
    absoluteDuration: 60 * 60 * 24,  // 24 hour hard cap → force re-login
  },
});
