import type { Metadata } from "next";
import { notFound } from "next/navigation";
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

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(calcJsonLd) }}
      />
      <PublicCalculator config={config} />
    </>
  );
}
