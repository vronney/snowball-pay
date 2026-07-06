type TokenResponse = {
  access_token?: string;
  token_type?: string;
  expires_in?: number;
  error?: string;
  error_description?: string;
};

class Auth0ManagementConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'Auth0ManagementConfigError';
  }
}

function getAuth0Domain() {
  const rawDomain = process.env.AUTH0_MANAGEMENT_DOMAIN || process.env.AUTH0_DOMAIN;
  const domain = rawDomain?.trim().replace(/^https?:\/\//, '').replace(/\/+$/, '');

  if (!domain) {
    throw new Auth0ManagementConfigError('AUTH0_DOMAIN or AUTH0_MANAGEMENT_DOMAIN is required');
  }

  return domain;
}

function getAuth0ManagementCredentials() {
  const clientId = process.env.AUTH0_MANAGEMENT_CLIENT_ID?.trim();
  const clientSecret = process.env.AUTH0_MANAGEMENT_CLIENT_SECRET?.trim();

  if (!clientId || !clientSecret) {
    throw new Auth0ManagementConfigError('AUTH0_MANAGEMENT_CLIENT_ID and AUTH0_MANAGEMENT_CLIENT_SECRET are required');
  }

  return { clientId, clientSecret };
}

const FETCH_TIMEOUT_MS = 8000;

// Module-scope token cache. M2M token issuance is quota-limited per tenant,
// and setMfaRequired now runs on hot paths (Stripe webhooks, Plaid link).
// Survives warm serverless invocations; cold starts just re-fetch.
let cachedToken: { value: string; expiresAt: number } | null = null;

async function getManagementAccessToken() {
  if (cachedToken && Date.now() < cachedToken.expiresAt) {
    return cachedToken.value;
  }

  const domain = getAuth0Domain();
  const { clientId, clientSecret } = getAuth0ManagementCredentials();
  const response = await fetch(`https://${domain}/oauth/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      grant_type: 'client_credentials',
      client_id: clientId,
      client_secret: clientSecret,
      audience: `https://${domain}/api/v2/`,
    }),
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
  });

  const body = (await response.json().catch(() => ({}))) as TokenResponse;
  if (!response.ok || !body.access_token) {
    const message = body.error_description || body.error || 'Failed to get Auth0 Management API token';
    throw new Error(message);
  }

  const ttlSeconds = typeof body.expires_in === 'number' ? body.expires_in : 0;
  if (ttlSeconds > 120) {
    cachedToken = {
      value: body.access_token,
      expiresAt: Date.now() + (ttlSeconds - 60) * 1000,
    };
  }

  return body.access_token;
}

/**
 * Flags the Auth0 user so the "Conditional MFA" post-login Action challenges
 * them from their next login on. PATCH merges top-level app_metadata keys,
 * so repeat calls are idempotent and other metadata is preserved.
 */
export async function setMfaRequired(auth0UserId: string) {
  if (!auth0UserId) {
    throw new Error('Auth0 user id is required');
  }

  const domain = getAuth0Domain();
  const accessToken = await getManagementAccessToken();
  const response = await fetch(`https://${domain}/api/v2/users/${encodeURIComponent(auth0UserId)}`, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ app_metadata: { mfa_required: true } }),
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
  });

  if (response.ok) {
    return;
  }

  const body = (await response.json().catch(() => ({}))) as TokenResponse;
  const message = body.error_description || body.error || 'Failed to set MFA requirement';
  throw new Error(message);
}

export async function deleteAuth0User(auth0UserId: string) {
  if (!auth0UserId) {
    throw new Error('Auth0 user id is required');
  }

  const domain = getAuth0Domain();
  const accessToken = await getManagementAccessToken();
  const response = await fetch(`https://${domain}/api/v2/users/${encodeURIComponent(auth0UserId)}`, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (response.ok || response.status === 404) {
    return;
  }

  const body = (await response.json().catch(() => ({}))) as TokenResponse;
  const message = body.error_description || body.error || 'Failed to delete Auth0 user';
  throw new Error(message);
}
