const TODAY_RE = /^(\d{4})-(\d{2})-(\d{2})$/;
const MAX_SKEW_MS = 36 * 60 * 60 * 1000;

/** The caller's local calendar date as YYYY-MM-DD (sent by the client). */
export function localDateParam(d: Date = new Date()): string {
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${mm}-${dd}`;
}

/**
 * The client's date (so "missed" and "this month" match the browser), trusted
 * only when it is a real date within ±36h of the server's; otherwise the
 * server's date. Always a local-midnight Date.
 */
export function resolveToday(param: string | null, now: Date = new Date()): Date {
  const fallback = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const match = param ? TODAY_RE.exec(param) : null;
  if (!match) return fallback;
  const year = Number(match[1]);
  const month = Number(match[2]) - 1;
  const day = Number(match[3]);
  const candidate = new Date(year, month, day);
  const isRealDate =
    candidate.getFullYear() === year && candidate.getMonth() === month && candidate.getDate() === day;
  if (!isRealDate) return fallback;
  if (Math.abs(candidate.getTime() - fallback.getTime()) > MAX_SKEW_MS) return fallback;
  return candidate;
}
