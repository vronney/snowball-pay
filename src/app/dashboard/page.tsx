import type { Metadata } from 'next';
import { auth0 } from '@/lib/auth0';
import { ensureUserProvisioned } from '@/lib/auth-server';
import { isPlaidAllowed } from '@/lib/plaid';
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
  if (session?.user?.sub) {
    await ensureUserProvisioned(session.user);
  }

  // Allowlist override only — the full gate also includes Pro status, which
  // isn't known server-side here (it's fetched client-side via useSubscription
  // and combined in DashboardClient). See canUsePlaid() for the real gate the
  // API routes enforce.
  return <DashboardClient user={user} plaidTestAccess={isPlaidAllowed(user?.email)} />;
}
