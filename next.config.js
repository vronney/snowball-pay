/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
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
      bodySizeLimit: '100mb',
    },
  },
};

module.exports = nextConfig;
