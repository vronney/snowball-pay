import type { MetadataRoute } from 'next';
import { calculatorConfigs } from '@/components/calculator/configs';

const BASE_URL = 'https://getsnowballpay.com';

export default function sitemap(): MetadataRoute.Sitemap {
  const calculatorPages: MetadataRoute.Sitemap = Object.keys(calculatorConfigs).map((slug) => ({
    url: `${BASE_URL}/calculators/${slug}`,
    lastModified: new Date('2026-04-30'),
    changeFrequency: 'monthly' as const,
    priority: 0.9,
  }));

  return [
    {
      url: BASE_URL,
      lastModified: new Date('2025-04-19'),
      changeFrequency: 'weekly',
      priority: 1.0,
    },
    {
      url: `${BASE_URL}/learn`,
      lastModified: new Date('2025-04-01'),
      changeFrequency: 'monthly',
      priority: 0.8,
    },
    {
      url: `${BASE_URL}/calculator`,
      lastModified: new Date('2025-04-01'),
      changeFrequency: 'monthly',
      priority: 0.8,
    },
    {
      url: `${BASE_URL}/learn/debt-snowball-calculator`,
      lastModified: new Date('2025-04-01'),
      changeFrequency: 'monthly',
      priority: 0.8,
    },
    ...calculatorPages,
    {
      url: `${BASE_URL}/privacy`,
      lastModified: new Date('2025-01-01'),
      changeFrequency: 'yearly',
      priority: 0.3,
    },
    {
      url: `${BASE_URL}/terms`,
      lastModified: new Date('2025-01-01'),
      changeFrequency: 'yearly',
      priority: 0.3,
    },
  ];
}
