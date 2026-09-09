import { config } from './config';
import { getAccessToken } from './tokens';

/**
 * Thin fetch wrapper over the production Next.js API. Same routes the web
 * app uses; the only difference is a bearer token instead of the session
 * cookie (see src/lib/mobileAuth.ts in the web repo).
 */

export class ApiError extends Error {
  status: number;
  /** 'upgrade_required' when a Pro gate fired — carries the feature name. */
  code?: string;
  feature?: string;
  retryAfter?: number;

  constructor(status: number, message: string, extra: Partial<ApiError> = {}) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    Object.assign(this, extra);
  }

  get isUpgradeRequired() {
    return this.status === 403 && this.code === 'upgrade_required';
  }

  get isUnauthorized() {
    return this.status === 401;
  }
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  body?: unknown;
  /** Public endpoints skip the token lookup entirely. */
  auth?: boolean;
  headers?: Record<string, string>;
}

export async function api<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, auth = true, headers = {} } = options;
  const requestHeaders: Record<string, string> = { Accept: 'application/json', ...headers };

  if (auth) {
    const token = await getAccessToken();
    if (!token) throw new ApiError(401, 'Sign in to continue');
    requestHeaders.Authorization = `Bearer ${token}`;
  }
  if (body !== undefined) requestHeaders['Content-Type'] = 'application/json';

  let response: Response;
  try {
    response = await fetch(`${config.apiUrl}${path}`, {
      method,
      headers: requestHeaders,
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw new ApiError(0, "Can't reach SnowballPay. Check your connection and try again.");
  }

  const text = await response.text();
  let json: Record<string, unknown> = {};
  if (text) {
    try {
      json = JSON.parse(text) as Record<string, unknown>;
    } catch {
      json = {};
    }
  }

  if (!response.ok) {
    const error = typeof json.error === 'string' ? json.error : `Request failed (${response.status})`;
    const message =
      typeof json.message === 'string' ? json.message : error;
    throw new ApiError(response.status, message, {
      code: error,
      feature: typeof json.feature === 'string' ? json.feature : undefined,
      retryAfter: typeof json.retryAfter === 'number' ? json.retryAfter : undefined,
    });
  }

  return json as T;
}
