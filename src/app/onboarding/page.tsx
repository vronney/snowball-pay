import type { Metadata } from "next";
import { auth0 } from "@/lib/auth0";
import { ensureUserProvisioned } from "@/lib/auth-server";
import { prisma } from "@/lib/prisma";
import { planSnapshotSchema, snapshotToDraft } from "@/lib/planSnapshot";
import type { CalculatorDraft } from "@/lib/calculatorDraft";
import { OnboardingWizard } from "@/components/onboarding/OnboardingWizard";

export const metadata: Metadata = {
  title: "Get Started",
  description: "Set up your debt payoff plan in minutes.",
  robots: { index: false, follow: false },
};

/**
 * Cross-device rehydration: the SavePlanModal stored the full plan on the
 * lead row keyed by email. If the signed-in user's email matches a lead
 * with a snapshot, the wizard can skip straight to the express screen even
 * though this browser never ran the calculator. Best-effort — onboarding
 * must render no matter what.
 *
 * Only for VERIFIED emails: without this gate, signing up with someone
 * else's address (unverified) would leak that person's saved financial
 * snapshot. Unverified users still get the localStorage draft, which never
 * left their own browser.
 */
async function loadServerDraft(
  email: string | null | undefined,
  emailVerified: boolean | undefined,
): Promise<CalculatorDraft | null> {
  if (!email || emailVerified !== true) return null;
  try {
    const lead = await prisma.calculatorLead.findUnique({
      where: { email: email.trim().toLowerCase() },
    });
    if (!lead?.planSnapshot) return null;
    const parsed = planSnapshotSchema.safeParse(lead.planSnapshot);
    if (!parsed.success) return null;
    return snapshotToDraft(parsed.data, {
      savedAt: lead.updatedAt.getTime(),
      debtFreeDate: lead.debtFreeDate,
      interestSaved: lead.interestSaved,
    });
  } catch {
    return null;
  }
}

export default async function OnboardingPage() {
  const session = await auth0.getSession();

  // Provision the DB user row at first page load, not first API call — a
  // signup who bounces mid-wizard should still exist in our DB (admin counts,
  // lifecycle emails). Never throws; page renders regardless.
  if (session?.user?.sub) {
    await ensureUserProvisioned(session.user);
  }

  const serverDraft = await loadServerDraft(
    session?.user?.email,
    session?.user?.email_verified,
  );

  return (
    <OnboardingWizard
      userEmail={session?.user?.email ?? null}
      serverDraft={serverDraft}
    />
  );
}
