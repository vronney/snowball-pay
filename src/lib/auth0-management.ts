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

async function getManagementAccessToken() {
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
  });

  const body = (await response.json().catch(() => ({}))) as TokenResponse;
  if (!response.ok || !body.access_token) {
    const message = body.error_description || body.error || 'Failed to get Auth0 Management API token';
    throw new Error(message);
  }

  return body.access_token;
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
