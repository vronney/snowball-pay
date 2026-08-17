// Deployment validation: the free-trial tombstone must be HMAC-keyed in
// production (src/lib/trialGrantKey.ts falls back to an unkeyed digest when
// the secret is absent — acceptable for dev/preview, not production). Failing
// the BUILD blocks a misconfigured production deploy while the previous
// deployment stays live; runtime call sites stay best-effort.
if (process.env.VERCEL_ENV === 'production' && !process.env.TRIAL_GRANT_SECRET) {
  throw new Error(
    'TRIAL_GRANT_SECRET is required for production builds. Set it in Vercel ' +
      'environment variables (see .env.example) so trial-grant identifiers ' +
      'are keyed, per the privacy policy.'
  );
}

/** @type {import('next').NextConfig} */
const nextConfig = {
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
        ],
      },
    ];
  },

  async redirects() {
    return [
      {
        source: '/sitemap.txt',
        destination: '/sitemap.xml',
        permanent: true,
      },
    ];
  },
  
  images: {
    // Restrict to known profile picture CDNs used by Auth0 social providers.
    // Add more hostnames here if you enable additional Auth0 connections.
    remotePatterns: [
      { protocol: 'https', hostname: 'lh3.googleusercontent.com' },      // Google
      { protocol: 'https', hostname: 'avatars.githubusercontent.com' },   // GitHub
      { protocol: 'https', hostname: 's.gravatar.com' },                  // Gravatar
      { protocol: 'https', hostname: 'secure.gravatar.com' },             // Gravatar (secure)
      { protocol: 'https', hostname: 'cdn.auth0.com' },                   // Auth0
      { protocol: 'https', hostname: '*.auth0.com' },                     // Auth0 tenants
    ],
  },
  typescript: {
    ignoreBuildErrors: false,
  },
  eslint: {
    dirs: ['src'],
  },
  experimental: {
    typedRoutes: true,
    serverActions: {
      bodySizeLimit: '10mb',
    },
    serverComponentsExternalPackages: ['@auth0/nextjs-auth0', 'pdf-parse', 'pdfjs-dist'],
  }
};

module.exports = nextConfig;
