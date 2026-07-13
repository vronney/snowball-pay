const CURRENCY_RE = /\$[\d,]+(?:\.\d+)?|\b\d{1,3}(?:,\d{3})+(?:\.\d+)?\b/g;
const SAFE_QUERY_KEYS = ['source', 'checkout', 'upgrade'] as const;
const SAFE_QUERY_VALUE_RE = /^[a-z0-9_-]{1,64}$/i;
const SAFE_NUMERIC_KEYS = new Set(['debt_count', 'debts', 'months']);
const URL_PROPERTY_KEY_RE = /(?:^|[$_])(?:current_url|entry_url|referrer)$/;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isSensitiveFinancialKey(key: string): boolean {
  const normalized = key.toLowerCase();
  if (normalized.endsWith('_count') || normalized === 'debts') return false;

  return /(^|_)(amount|apr|balance|credit_limit|debt_free_date|debt_name|expenses?|income|interest|minimum_payment|payment|principal|price|rate)(_|$)/.test(
    normalized,
  );
}

function stripUrlDetails(value: string): string {
  try {
    const url = new URL(value);
    return `${url.origin}${url.pathname}`;
  } catch {
    return value.split(/[?#]/, 1)[0];
  }
}

function sanitiseValue(key: string, value: unknown): unknown {
  if (isSensitiveFinancialKey(key)) return '[redacted]';

  if (typeof value === 'string') {
    const withoutUrlDetails = URL_PROPERTY_KEY_RE.test(key.toLowerCase())
      ? stripUrlDetails(value)
      : value;
    return withoutUrlDetails.replace(CURRENCY_RE, '[redacted]');
  }

  if (typeof value === 'number') {
    return key.startsWith('$') || SAFE_NUMERIC_KEYS.has(key)
      ? value
      : '[redacted]';
  }

  if (Array.isArray(value)) {
    return value.map((item) => sanitiseValue(key, item));
  }

  if (isRecord(value)) {
    return sanitiseAnalyticsProperties(value);
  }

  return value;
}

/** Remove financial values while preserving safe counts and SDK metadata. */
export function sanitiseAnalyticsProperties(
  properties: Record<string, unknown>,
): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(properties).map(([key, value]) => [
      key,
      sanitiseValue(key, value),
    ]),
  );
}

/** Keep attribution context without sending arbitrary or financial query data. */
export function getSafeRouteContext(
  searchParams: Pick<URLSearchParams, 'get'>,
): Record<string, string> {
  const context: Record<string, string> = {};

  for (const key of SAFE_QUERY_KEYS) {
    const value = searchParams.get(key);
    if (value && SAFE_QUERY_VALUE_RE.test(value)) {
      context[`route_${key}`] = value;
    }
  }

  return context;
}
