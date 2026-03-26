import type { Metadata } from 'next';
import { auth0 } from '@/lib/auth0';

const faqJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: [
    {
      '@type': 'Question',
      name: 'What is the Debt Snowball method?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'The Debt Snowball method involves paying off your smallest debt first while making minimum payments on all others. Once the smallest is gone, you roll that payment into the next smallest — creating a "snowball" of momentum. It\'s psychologically powerful because you see wins early, which keeps you motivated.',
      },
    },
    {
      '@type': 'Question',
      name: 'How is Snowball different from the Avalanche method?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'The Avalanche method targets your highest-interest debt first, which saves the most money mathematically. Snowball focuses on smallest balance first for faster early wins. Both methods are available in SnowballPay.',
      },
    },
    {
      '@type': 'Question',
      name: 'How does the document import feature work?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'You can upload a PDF bank statement, credit card statement, or CSV export. Our parser automatically extracts your debt balances, interest rates, and minimum payments — filling your dashboard in seconds. No manual entry required.',
      },
    },
    {
      '@type': 'Question',
      name: 'Is my financial data secure?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Yes. SnowballPay uses AES-256 encryption at rest and TLS in transit. We never sell your data or share it with third parties. You can export or delete your data at any time from your account settings.',
      },
    },
    {
      '@type': 'Question',
      name: 'Does SnowballPay connect to my bank accounts?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'No — SnowballPay does not require bank account access. You enter or import your debt details manually, which means zero risk of unauthorized transactions. Your data stays in your control at all times.',
      },
    },
    {
      '@type': 'Question',
      name: 'What types of debt can I track?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Any type: credit cards, personal loans, auto loans, student loans, medical debt, mortgage debt, payday loans, and more. Each debt entry supports custom names, balances, interest rates, and minimum payments.',
      },
    },
    {
      '@type': 'Question',
      name: 'Can I change my payoff strategy after I start?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Yes, anytime. Switch between Snowball and Avalanche strategies or set up a custom order. Your payoff timeline will automatically recalculate and update all projections instantly.',
      },
    },
  ],
};

export const metadata: Metadata = {
  title: 'SnowballPay — Debt Snowball & Avalanche Planner',
  description:
    'Use the proven Debt Snowball or Avalanche method to eliminate debt. Track every balance, build unstoppable momentum, and reach debt-free faster than you think. Free to start.',
  alternates: {
    canonical: 'https://getsnowballpay.com',
  },
  openGraph: {
    title: 'SnowballPay — Debt Snowball & Avalanche Planner',
    description:
      'Use the proven Debt Snowball or Avalanche method to eliminate debt. Track every balance and reach debt-free faster.',
    url: 'https://getsnowballpay.com',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'SnowballPay — Debt Snowball & Avalanche Planner',
    description: 'Use the proven Debt Snowball or Avalanche method to eliminate debt. Free to start.',
  },
};
import LandingNav from '@/components/landing/LandingNav';
import LandingHero from '@/components/landing/LandingHero';
import SocialProofStrip from '@/components/landing/SocialProofStrip';
import ProblemSolution from '@/components/landing/ProblemSolution';
import FeaturesGrid from '@/components/landing/FeaturesGrid';
import CaseStudies from '@/components/landing/CaseStudies';
import HowItWorks from '@/components/landing/HowItWorks';
import Pricing from '@/components/landing/Pricing';
import Testimonials from '@/components/landing/Testimonials';
import FAQ from '@/components/landing/FAQ';
import FinalCTA from '@/components/landing/FinalCTA';
import LandingFooter from '@/components/landing/LandingFooter';

export default async function Home() {
  const session = await auth0.getSession();
  const isLoggedIn = !!session;

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />
      <div className="lp" style={{ backgroundColor: '#f8fafc', color: '#0f172a' }}>
        <LandingNav isLoggedIn={isLoggedIn} />
        <LandingHero isLoggedIn={isLoggedIn} />
        <SocialProofStrip />
        <ProblemSolution />
        <FeaturesGrid />
        <CaseStudies />
        <HowItWorks />
        <Pricing />
        <Testimonials />
        <FAQ />
        <FinalCTA isLoggedIn={isLoggedIn} />
        <LandingFooter />
      </div>
    </>
  );
}
