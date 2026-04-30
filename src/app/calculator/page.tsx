import type { Metadata } from "next";
import PublicCalculator from "@/components/calculator/PublicCalculator";
import { defaultCalculatorConfig } from "@/components/calculator/configs";

export const metadata: Metadata = {
  title: "Free Debt Payoff Calculator — Snowball & Avalanche",
  description:
    "Calculate your exact debt-free date in seconds. Compare the Snowball vs Avalanche method, see total interest saved, and get a personalized payoff plan — free, no account required.",
  alternates: {
    canonical: "https://getsnowballpay.com/calculator",
  },
  openGraph: {
    title: "Free Debt Payoff Calculator — Snowball & Avalanche",
    description:
      "See exactly when you'll be debt-free. Compare Snowball vs Avalanche. No signup required.",
    url: "https://getsnowballpay.com/calculator",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Free Debt Payoff Calculator — Snowball & Avalanche",
    description: "See exactly when you'll be debt-free. No signup required.",
  },
};

const calcJsonLd = {
  "@context": "https://schema.org",
  "@type": "WebApplication",
  name: "Free Debt Payoff Calculator",
  url: "https://getsnowballpay.com/calculator",
  applicationCategory: "FinanceApplication",
  operatingSystem: "Web",
  offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
  description:
    "Calculate your exact debt-free date in seconds. Compare the Debt Snowball vs Avalanche method, see total interest saved, and get a personalized payoff plan — free, no account required.",
  featureList: [
    "Debt Snowball payoff calculation",
    "Debt Avalanche payoff calculation",
    "Debt-free date forecasting",
    "Total interest savings comparison",
    "No account required",
  ],
};

export default function CalculatorPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(calcJsonLd) }}
      />
      <PublicCalculator config={defaultCalculatorConfig} />
    </>
  );
}
