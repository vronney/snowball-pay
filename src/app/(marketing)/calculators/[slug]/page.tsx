import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { GoogleAdsPageViewConversion } from "@/components/GoogleAdsConversion";
import PublicCalculator from "@/components/calculator/PublicCalculator";
import {
  calculatorConfigs,
  getCalculatorConfig,
} from "@/components/calculator/configs";

interface CalculatorSlugPageProps {
  params: {
    slug: string;
  };
}

export function generateStaticParams() {
  return Object.keys(calculatorConfigs).map((slug) => ({ slug }));
}

export function generateMetadata({
  params,
}: CalculatorSlugPageProps): Metadata {
  const config = getCalculatorConfig(params.slug);

  if (!config) {
    return {};
  }

  const title = `${config.pageTitle} | SnowballPay`;
  const url = `https://getsnowballpay.com/calculators/${config.slug}`;

  return {
    title,
    description: config.heroDescription,
    alternates: {
      canonical: url,
    },
    openGraph: {
      title,
      description: config.heroDescription,
      url,
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description: config.heroDescription,
    },
  };
}

export default function CalculatorSlugPage({
  params,
}: CalculatorSlugPageProps) {
  const config = getCalculatorConfig(params.slug);

  if (!config) {
    notFound();
  }

  const url = `https://getsnowballpay.com/calculators/${config.slug}`;

  const calcJsonLd = {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: config.pageTitle,
    url,
    applicationCategory: "FinanceApplication",
    operatingSystem: "Web",
    offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
    description: config.heroDescription,
    featureList: [
      `${config.pageTitle} calculations`,
      "Debt-free date forecasting",
      "Minimums vs extra payment comparison",
      "Free signup handoff to onboarding",
      "No account required to calculate",
    ],
  };

  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: config.faqItems.map((item) => ({
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
    name: `How to use this ${config.debtCategory} payoff calculator`,
    description: config.contentIntroBody,
    step: [
      {
        "@type": "HowToStep",
        name: "Enter your debt details",
        text: "Input your balance, interest rate, and minimum payment for your " + config.debtCategory,
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
        name: "Calculators",
        item: "https://getsnowballpay.com/calculators",
      },
      {
        "@type": "ListItem",
        position: 3,
        name: config.pageTitle,
        item: url,
      },
    ],
  };

  return (
    <>
      <GoogleAdsPageViewConversion
        calculatorName={config.pageTitle}
        calculatorSlug={config.slug}
      />
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
      <PublicCalculator config={config} />
    </>
  );
}
