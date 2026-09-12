/**
 * Dashboard v2 rollout (spec §5.3). DASHBOARD_V2_USERS is a comma-separated
 * list of emails, or "all". Unset = off, so v1 renders exactly as before.
 */
export function isDashboardV2(
  email: string | null | undefined,
  raw: string | undefined = process.env.DASHBOARD_V2_USERS,
): boolean {
  if (!raw) return false;
  const list = raw.split(',').map((s) => s.trim().toLowerCase()).filter(Boolean);
  if (list.includes('all')) return true;
  return Boolean(email) && list.includes(email!.trim().toLowerCase());
}
