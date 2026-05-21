import type { Metadata } from "next";
import { auth0 } from "@/lib/auth0";

const faqJsonLd = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: [
    {
      "@type": "Question",
      name: "What is the Debt Snowball method?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "The Debt Snowball method pays off your smallest debt first while you keep minimum payments on the rest. Once one balance is gone, you roll that payment into the next debt to build momentum.",
      },
    },
    {
      "@type": "Question",
      name: "How is Snowball different from the Avalanche method?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Avalanche prioritizes the highest interest rate first to minimize total interest paid. Snowball prioritizes the smallest balance first for faster early wins. SnowballPay supports both approaches.",
      },
    },
    {
      "@type": "Question",
      name: "Is my financial data secure?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "SnowballPay applies safeguards to protect account data and limit unauthorized access. Review the Privacy Policy for the latest details.",
      },
    },
    {
      "@type": "Question",
      name: "Does SnowballPay connect to my bank accounts?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "No. SnowballPay does not require a bank connection. Add your debts manually in seconds.",
      },
    },
    {
      "@type": "Question",
      name: "What types of debt can I track?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "You can track credit cards, personal loans, auto loans, student loans, medical debt, and more. Each debt includes fields for balance, rate, and minimum payment.",
      },
    },
    {
      "@type": "Question",
      name: "Can I change my payoff strategy after I start?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Yes. You can switch between Snowball and Avalanche or define a custom order. Your projected timeline updates automatically.",
      },
    },
    {
      "@type": "Question",
      name: "What does Pro add beyond the free plan?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Free helps you build the first payoff plan. Pro is for follow-through: unlimited debts, custom priority order, debt-free lever charts, monthly payoff coach notes, and buffer guardrails when the plan needs attention.",
      },
    },
    {
      "@type": "Question",
      name: "Is SnowballPay a debt settlement or debt relief service?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "No. SnowballPay is a planning and tracking tool. It does not negotiate, settle, or reduce debts for you. It helps you understand payoff order, monthly progress, and possible next steps.",
      },
    },
  ],
};

export const metadata: Metadata = {
  title: "SnowballPay - Debt Payoff Planner with Progress Coach",
  description:
    "Use SnowballPay to compare Debt Snowball and Avalanche plans, see your projected debt-free date, track balances, and get coach notes for the next safe payoff move.",
  alternates: {
    canonical: "https://getsnowballpay.com",
  },
  openGraph: {
    title: "SnowballPay - Debt Payoff Planner with Progress Coach",
    description:
      "Compare Snowball and Avalanche plans, see your projected debt-free date, and turn payoff charts into a clear next move.",
    url: "https://getsnowballpay.com",
  },
  twitter: {
    card: "summary_large_image",
    title: "SnowballPay - Debt Payoff Planner with Progress Coach",
    description:
      "Build a clear debt payoff plan with Snowball or Avalanche strategies, useful charts, and payoff coach notes.",
  },
};

import LandingNav from "@/components/landing/LandingNav";
import LandingHero from "@/components/landing/LandingHero";
import SocialProofStrip from "@/components/landing/SocialProofStrip";
import ProblemSolution from "@/components/landing/ProblemSolution";
import FeaturesGrid from "@/components/landing/FeaturesGrid";
import CaseStudies from "@/components/landing/CaseStudies";
import HowItWorks from "@/components/landing/HowItWorks";
import Pricing from "@/components/landing/Pricing";
import Testimonials from "@/components/landing/Testimonials";
import FAQ from "@/components/landing/FAQ";
import FinalCTA from "@/components/landing/FinalCTA";
import LandingFooter from "@/components/landing/LandingFooter";

export default async function Home() {
  const session = await auth0.getSession();
  const isLoggedIn = !!session;

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />
      <div
        className="lp"
        style={{ backgroundColor: "#eef3f8", color: "#0b1220" }}
      >
        <LandingNav isLoggedIn={isLoggedIn} />
        <LandingHero isLoggedIn={isLoggedIn} />
        <SocialProofStrip />
        <Testimonials />
        <ProblemSolution />
        <FeaturesGrid />
        <CaseStudies />
        <HowItWorks />
        <Pricing />
        <FAQ />
        <FinalCTA isLoggedIn={isLoggedIn} />
        <LandingFooter />
      </div>
    </>
  );
}
