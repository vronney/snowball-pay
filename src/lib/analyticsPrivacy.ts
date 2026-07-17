const CURRENCY_RE = /\$[\d,]+(?:\.\d+)?|\b\d{1,3}(?:,\d{3})+(?:\.\d+)?\b/g;
const EMAIL_RE = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi;
const SAFE_ROUTE_QUERY_KEYS = ['source', 'checkout', 'upgrade'] as const;
const CAMPAIGN_QUERY_KEYS = [
  'utm_source',
  'utm_medium',
  'utm_campaign',
  'utm_content',
  'utm_term',
] as const;
const SAFE_QUERY_VALUE_RE = /^[a-z0-9_-]{1,64}$/i;
const CAMPAIGN_PROPERTY_KEY_RE =
  /(?:^|_)utm_(?:source|medium|campaign|content|term)$/;
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

/** Normalize campaign labels and reject values that could carry PII. */
export function sanitiseCampaignValue(value: string): string {
  if (EMAIL_RE.test(value)) {
    EMAIL_RE.lastIndex = 0;
    return '[redacted]';
  }
  EMAIL_RE.lastIndex = 0;

  const normalized = value.trim().toLowerCase().replace(/\s+/g, '_');
  return /^[a-z0-9][a-z0-9._~-]{0,99}$/.test(normalized)
    ? normalized
    : '[redacted]';
}

function sanitiseValue(key: string, value: unknown): unknown {
  if (isSensitiveFinancialKey(key)) return '[redacted]';

  if (typeof value === 'string') {
    if (CAMPAIGN_PROPERTY_KEY_RE.test(key.toLowerCase())) {
      return sanitiseCampaignValue(value);
    }
    const withoutUrlDetails = URL_PROPERTY_KEY_RE.test(key.toLowerCase())
      ? stripUrlDetails(value)
      : value;
    return withoutUrlDetails
      .replace(CURRENCY_RE, '[redacted]')
      .replace(EMAIL_RE, '[redacted]');
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

  for (const key of SAFE_ROUTE_QUERY_KEYS) {
    const value = searchParams.get(key);
    if (value && SAFE_QUERY_VALUE_RE.test(value)) {
      context[`route_${key}`] = value;
    }
  }

  for (const key of CAMPAIGN_QUERY_KEYS) {
    const value = searchParams.get(key);
    if (!value) continue;
    const sanitized = sanitiseCampaignValue(value);
    if (sanitized !== '[redacted]') context[key] = sanitized;
  }

  return context;
}
