import type { Metadata } from "next";
import { auth0 } from "@/lib/auth0";
import { OnboardingWizard } from "@/components/onboarding/OnboardingWizard";

export const metadata: Metadata = {
  title: "Get Started",
  description: "Set up your debt payoff plan in minutes.",
  robots: { index: false, follow: false },
};

export default async function OnboardingPage() {
  const session = await auth0.getSession();

  return <OnboardingWizard userEmail={session?.user?.email ?? null} />;
}
