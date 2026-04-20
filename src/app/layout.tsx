import type { Metadata } from 'next';
import { Manrope, Plus_Jakarta_Sans } from 'next/font/google';
import { Providers } from '@/app/providers';
import './globals.css';

const manrope = Manrope({
  subsets: ['latin'],
  variable: '--font-manrope',
  weight: ['300', '400', '500', '600', '700', '800'],
  display: 'swap',
});

const jakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  variable: '--font-jakarta',
  weight: ['300', '400', '500', '600', '700', '800'],
  display: 'swap',
});

const BASE_URL = 'https://getsnowballpay.com';

export const metadata: Metadata = {
  metadataBase: new URL(BASE_URL),
  title: {
    default: 'SnowballPay — Debt Snowball & Avalanche Planner',
    template: '%s | SnowballPay',
  },
  description:
    'Eliminate debt faster with the proven Debt Snowball or Avalanche method. Track every balance, build unstoppable momentum, and reach debt-free faster than you think.',
  keywords: [
    'debt snowball',
    'debt avalanche',
    'debt payoff planner',
    'debt tracker',
    'pay off debt',
    'debt free',
    'personal finance',
  ],
  authors: [{ name: 'SnowballPay', url: BASE_URL }],
  creator: 'SnowballPay',
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: BASE_URL,
    siteName: 'SnowballPay',
    title: 'SnowballPay — Debt Snowball & Avalanche Planner',
    description:
      'Eliminate debt faster with the proven Debt Snowball or Avalanche method. Track every balance and reach debt-free faster.',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'SnowballPay — Debt Snowball & Avalanche Planner',
    description:
      'Eliminate debt faster with the proven Debt Snowball or Avalanche method.',
    creator: '@snowballpay',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  alternates: {
    canonical: BASE_URL,
  },
};

const jsonLd = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'WebSite',
      '@id': `${BASE_URL}/#website`,
      url: BASE_URL,
      name: 'SnowballPay',
      description: 'Debt Snowball & Avalanche Payoff Planner',
    },
    {
      '@type': 'SoftwareApplication',
      '@id': `${BASE_URL}/#app`,
      name: 'SnowballPay',
      url: BASE_URL,
      applicationCategory: 'FinanceApplication',
      operatingSystem: 'Web',
      offers: {
        '@type': 'Offer',
        price: '0',
        priceCurrency: 'USD',
      },
      description:
        'Track and eliminate debt using the Debt Snowball or Avalanche method. Personalized payoff plans, progress tracking, and interest savings calculator.',
      featureList: [
        'Debt Snowball payoff plan',
        'Debt Avalanche payoff plan',
        'Interest savings calculator',
        'Payoff date forecasting',
        'Payment streak tracking',
      ],
    },
    {
      '@type': 'Organization',
      '@id': `${BASE_URL}/#org`,
      name: 'SnowballPay',
      url: BASE_URL,
      logo: {
        '@type': 'ImageObject',
        url: `${BASE_URL}/opengraph-image`,
        width: 1200,
        height: 630,
      },
    },
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning className={`${manrope.variable} ${jakarta.variable}`}>
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body>
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}
