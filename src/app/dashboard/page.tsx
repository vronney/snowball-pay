import { auth0 } from '@/lib/auth0';
import DashboardClient from '@/components/DashboardClient';

export default async function DashboardPage() {
  const session = await auth0.getSession();
  const user = session?.user ?? null;

  return <DashboardClient user={user} />;
}
