import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { auth0 } from '@/lib/auth0';
import { ensureUserProvisioned } from '@/lib/auth-server';
import { isPlaidAllowed } from '@/lib/plaid';
import { prisma } from '@/lib/prisma';
import DashboardClient from '@/components/DashboardClient';

export const metadata: Metadata = {
  title: 'Dashboard',
  robots: { index: false, follow: false },
};

export default async function DashboardPage() {
  const session = await auth0.getSession();
  const user = session?.user ?? null;

  // Provision the DB user row at first page load, not first API call, so
  // every Auth0 signup exists in our DB immediately. Never throws.
  const provisioned = session?.user?.sub
    ? await ensureUserProvisioned(session.user)
    : null;

  // Brand-new account: decide onboarding SERVER-side so a fresh signup goes
  // straight to the wizard — no dashboard loading screen flashing first.
  // The client-side check in DashboardClient stays as the SPA-navigation
  // fallback. "Skip setup" is honored via a session cookie (the server can't
  // see sessionStorage). Provisioning failures leave `provisioned` null and
  // fall through to the client, which renders the account-issue screen.
  let startOnboarding = false;
  if (provisioned && cookies().get('sp_onboarding_skipped')?.value !== '1') {
    try {
      const [debtCount, income] = await Promise.all([
        prisma.debt.count({ where: { userId: provisioned.id } }),
        prisma.income.findUnique({
          where: { userId: provisioned.id },
          select: { id: true },
        }),
      ]);
      startOnboarding = debtCount === 0 && !income;
    } catch (error) {
      // Transient DB error: fall through to the client dashboard, not a 500.
      console.error('[dashboard] onboarding check failed:', error);
    }
  }
  if (startOnboarding) redirect('/onboarding');

  // Allowlist override only — the full gate also includes Pro status, which
  // isn't known server-side here (it's fetched client-side via useSubscription
  // and combined in DashboardClient). See canUsePlaid() for the real gate the
  // API routes enforce.
  return <DashboardClient user={user} plaidTestAccess={isPlaidAllowed(user?.email)} />;
}
