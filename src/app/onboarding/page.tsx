import type { Metadata } from "next";
import { auth0 } from "@/lib/auth0";
import { ensureUserProvisioned } from "@/lib/auth-server";
import { OnboardingWizard } from "@/components/onboarding/OnboardingWizard";

export const metadata: Metadata = {
  title: "Get Started",
  description: "Set up your debt payoff plan in minutes.",
  robots: { index: false, follow: false },
};

export default async function OnboardingPage() {
  const session = await auth0.getSession();

  // Provision the DB user row at first page load, not first API call — a
  // signup who bounces mid-wizard should still exist in our DB (admin counts,
  // lifecycle emails). Never throws; page renders regardless.
  if (session?.user?.sub) {
    await ensureUserProvisioned(session.user);
  }

  return <OnboardingWizard userEmail={session?.user?.email ?? null} />;
}
