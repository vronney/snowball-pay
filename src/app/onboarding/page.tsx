import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth0 } from "@/lib/auth0";
import { ensureUserProvisioned } from "@/lib/auth-server";
import { prisma } from "@/lib/prisma";
import { planSnapshotSchema, snapshotToDraft } from "@/lib/planSnapshot";
import type { CalculatorDraft } from "@/lib/calculatorDraft";
import { OnboardingWizard } from "@/components/onboarding/OnboardingWizard";
import { AuthenticatedAnalytics } from "@/components/analytics/AuthenticatedAnalytics";
import { SignupConversionReporter } from "@/components/analytics/SignupConversionReporter";

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

/**
 * Whether this account already has a saved plan (an income row). Onboarding
 * is for accounts without one: its express screen submits the calculator's
 * numbers, and for an existing user that replaced their real take-home with
 * whatever the calculator held (observed 2026-09-10 — the $5,200 sample).
 * /api/onboarding/complete refuses too; this keeps them from being shown a
 * plan they can't save. A DB error returns false so onboarding still renders.
 */
async function hasExistingPlan(userId: string): Promise<boolean> {
  try {
    const income = await prisma.income.findUnique({
      where: { userId },
      select: { id: true },
    });
    return income !== null;
  } catch (error) {
    console.error("[onboarding] existing-plan check failed:", error);
    return false;
  }
}

export default async function OnboardingPage({
  searchParams,
}: {
  // Next 15: searchParams is a Promise.
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const resolvedSearchParams = await searchParams;
  const session = await auth0.getSession();

  // Provision the DB user row at first page load, not first API call — a
  // signup who bounces mid-wizard should still exist in our DB (admin counts,
  // lifecycle emails). Never throws; page renders regardless.
  const provisioned = session?.user?.sub
    ? await ensureUserProvisioned(session.user)
    : null;

  // Outside any try/catch: redirect() works by throwing.
  if (provisioned && (await hasExistingPlan(provisioned.id))) {
    redirect(
      resolvedSearchParams?.checkout === "pro" ? "/dashboard?checkout=pro" : "/dashboard",
    );
  }

  const serverDraft = await loadServerDraft(
    session?.user?.email,
    session?.user?.email_verified,
  );

  return (
    <>
      <AuthenticatedAnalytics userId={provisioned?.id ?? null} />
      {provisioned?.isNew && (
        <SignupConversionReporter
          email={provisioned.email}
          transactionId={`signup:${provisioned.id}`}
        />
      )}
      <OnboardingWizard
        userEmail={session?.user?.email ?? null}
        serverDraft={serverDraft}
      />
    </>
  );
}
