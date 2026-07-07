/**
 * Start onboarding only when the account is PROVEN empty — queries succeeded
 * and returned nothing. A query error must never count as "no data": when
 * every API call 401s (e.g. signup email already registered under a different
 * sign-in method, so provisioning refuses to link), redirecting to onboarding
 * strands the user in a wizard whose final submit can only fail.
 */
export function shouldStartOnboarding(args: {
  hasIncome: boolean;
  debtCount: number;
  hadError: boolean;
}): boolean {
  return !args.hadError && !args.hasIncome && args.debtCount === 0;
}
