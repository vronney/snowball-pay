import type { Metadata } from "next";
import PublicCalculator from "@/components/calculator/PublicCalculator";
import { defaultCalculatorConfig } from "@/components/calculator/configs";
import { GoogleAdsConversion } from "@/components/GoogleAdsConversion";

export const metadata: Metadata = {
  title: "Free Debt Payoff Calculator — Snowball & Avalanche",
  description:
    "Discover your exact debt-free date and see how much interest you'll pay. Compare Snowball vs Avalanche strategies—free, no account required.",
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

export default function CalculatorPage() {
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

  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: defaultCalculatorConfig.faqItems.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.answer,
      },
    })),
  };

  const howToJsonLd = {
    "@context": "https://schema.org",
    "@type": "HowTo",
    name: "How to use this debt payoff calculator",
    description: defaultCalculatorConfig.contentIntroBody,
    step: [
      {
        "@type": "HowToStep",
        name: "Enter your debt details",
        text: "Input your balance, interest rate, and minimum payment for each debt",
      },
      {
        "@type": "HowToStep",
        name: "Enter your budget",
        text: "Provide your monthly take-home income and essential expenses to determine available funds for debt payoff",
      },
      {
        "@type": "HowToStep",
        name: "Choose your strategy",
        text: "Select either Snowball (smallest balance first) or Avalanche (highest rate first)",
      },
      {
        "@type": "HowToStep",
        name: "See your results",
        text: "View your exact debt-free date, total interest paid, and comparison to minimum payments",
      },
    ],
  };

  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "Home",
        item: "https://getsnowballpay.com",
      },
      {
        "@type": "ListItem",
        position: 2,
        name: "Calculator",
        item: "https://getsnowballpay.com/calculator",
      },
    ],
  };

  return (
    <>
      <GoogleAdsConversion />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(calcJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(howToJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />
      <PublicCalculator config={defaultCalculatorConfig} />
    </>
  );
}
