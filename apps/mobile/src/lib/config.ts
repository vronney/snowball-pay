/** Public build-time config. EXPO_PUBLIC_* is inlined by Metro — identifiers only, never secrets. */
export const config = {
  apiUrl: (process.env.EXPO_PUBLIC_API_URL ?? 'https://getsnowballpay.com').replace(/\/$/, ''),
  auth0Domain: process.env.EXPO_PUBLIC_AUTH0_DOMAIN ?? '',
  auth0ClientId: process.env.EXPO_PUBLIC_AUTH0_CLIENT_ID ?? '',
  auth0Audience: process.env.EXPO_PUBLIC_AUTH0_AUDIENCE ?? 'https://api.getsnowballpay.com',
  scheme: 'snowballpay',
  proMonthlyPrice: 12,
  freeDebtLimit: 5,
} as const;

export const authConfigured = Boolean(config.auth0Domain && config.auth0ClientId);
