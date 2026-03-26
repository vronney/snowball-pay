import type { MetadataRoute } from 'next';

const BASE_URL = 'https://getsnowballpay.com';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      // General crawlers: allow public pages, block auth/API/dashboard
      {
        userAgent: '*',
        allow: ['/', '/learn', '/calculator', '/privacy', '/terms'],
        disallow: ['/dashboard', '/api/', '/auth/'],
      },
      // AI search crawlers — explicitly allowed on public content pages
      {
        userAgent: [
          'GPTBot',           // ChatGPT / OpenAI
          'ChatGPT-User',
          'OAI-SearchBot',
          'ClaudeBot',        // Claude / Anthropic
          'anthropic-ai',
          'PerplexityBot',    // Perplexity
          'Googlebot',        // Google Search
          'Google-Extended',  // Google Gemini & AI Overviews
          'Bingbot',          // Microsoft Copilot
          'cohere-ai',        // Cohere
          'YouBot',           // You.com
        ],
        allow: ['/', '/learn', '/calculator'],
        disallow: ['/dashboard', '/api/', '/auth/'],
      },
    ],
    sitemap: `${BASE_URL}/sitemap.xml`,
    host: BASE_URL,
  };
}
