import type { Metadata } from 'next';
import { auth0 } from '@/lib/auth0';
import DashboardClient from '@/components/DashboardClient';

export const metadata: Metadata = {
  title: 'Dashboard',
  robots: { index: false, follow: false },
};

export default async function DashboardPage() {
  const session = await auth0.getSession();
  const user = session?.user ?? null;

  return <DashboardClient user={user} />;
}
