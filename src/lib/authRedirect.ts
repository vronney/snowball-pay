/**
 * Loop breaker for the global 401 → re-login redirect.
 *
 * A 401 with an EXPIRED session is fixed by re-login. A 401 with a VALID
 * session (e.g. the signup email is already registered under a different
 * sign-in method, so provisioning refuses to link) is NOT — re-login
 * silently succeeds via SSO, returns to the dashboard, 401s again, and
 * loops until the middleware rate limiter starts 429ing the Auth0 callback
 * itself. If we already sent the user through login moments ago, don't do
 * it again — let the UI render its account-issue state instead.
 */
export const RELOGIN_LOOP_WINDOW_MS = 2 * 60 * 1000;

export function shouldRedirectOn401(args: {
  pathname: string;
  lastReloginAt: number | null;
  now: number;
}): boolean {
  const onProtectedPage =
    args.pathname.startsWith('/dashboard') || args.pathname.startsWith('/plaid');
  if (!onProtectedPage) return false;
  if (
    args.lastReloginAt !== null &&
    args.now - args.lastReloginAt < RELOGIN_LOOP_WINDOW_MS
  ) {
    return false;
  }
  return true;
}
