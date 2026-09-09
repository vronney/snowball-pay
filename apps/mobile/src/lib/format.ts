const usd = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 0,
});

const usdCents = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export function money(value: number, cents = false): string {
  return (cents ? usdCents : usd).format(Number.isFinite(value) ? value : 0);
}

/** "Mar 2029" */
export function monthYear(iso: string | Date): string {
  const date = typeof iso === 'string' ? new Date(iso) : iso;
  return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
}

/** "2 yr 5 mo" / "7 mo" */
export function monthsLabel(months: number): string {
  const y = Math.floor(months / 12);
  const m = months % 12;
  if (y === 0) return `${m} mo`;
  return m === 0 ? `${y} yr` : `${y} yr ${m} mo`;
}

/** Whole days from `from` to `to` (positive when `to` is later). */
export function daysBetween(from: string | Date, to: string | Date): number {
  const a = typeof from === 'string' ? new Date(from) : from;
  const b = typeof to === 'string' ? new Date(to) : to;
  return Math.round((b.getTime() - a.getTime()) / 86_400_000);
}

/**
 * Loose money/percent parsing, mirroring the web calculator: "$14,200",
 * "24.99%" parse; "1O00" is null so the caller can show a format hint.
 */
export function parseNumericInput(raw: string): number | null {
  const stripped = raw.trim().replace(/%$/, '').replace(/[$£€\s]/g, '');
  if (!stripped) return null;
  if (!/^[+-]?[0-9.,]+$/.test(stripped)) return null;
  const normalized = stripped.replace(/,/g, '');
  if ((normalized.match(/\./g) ?? []).length > 1) return null;
  const n = Number.parseFloat(normalized);
  return Number.isFinite(n) ? n : null;
}
