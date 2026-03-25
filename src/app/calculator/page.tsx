import type { Metadata } from 'next';
import PublicCalculator from '@/components/calculator/PublicCalculator';

export const metadata: Metadata = {
  title: 'Free Debt Payoff Calculator — Snowball & Avalanche | SnowballPay',
  description:
    'Calculate your exact debt-free date in seconds. Compare the snowball vs avalanche method, see total interest saved, and get a personalized payoff plan — free, no account required.',
  openGraph: {
    title: 'Free Debt Payoff Calculator',
    description: 'See exactly when you\'ll be debt-free. No signup required.',
    type: 'website',
  },
};

export default function CalculatorPage() {
  return <PublicCalculator />;
}
