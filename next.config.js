/** @type {import('next').NextConfig} */
const nextConfig = {
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
  serverExternalPackages: ['@auth0/nextjs-auth0'],
  experimental: {
    typedRoutes: true,
    serverActions: {
      bodySizeLimit: '10mb',
    },
  },
};

module.exports = nextConfig;
