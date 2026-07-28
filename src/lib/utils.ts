import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(value);
}

/**
 * Whole-dollar USD, no cents. The canonical format for *projected* figures
 * (interest saved/avoided/reclaimed, forecast savings) so the same estimate
 * renders identically across tabs — e.g. "$5,573" everywhere instead of
 * "$5,573.00" on one screen and "$5,572.98" on another. Reserve cents-bearing
 * formatCurrency for concrete amounts (balances, payments) where precision is
 * real. Projections are estimates; showing cents implies false precision and
 * invites cross-tab rounding mismatches.
 */
export function formatCurrencyWhole(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

/**
 * A display-safe first name derived from an auth profile name, or null when
 * there's no real name to show. Auth0 commonly backfills the `name` field with
 * the account email when the user never set a display name, so an email-shaped
 * value is treated as "no name" — callers fall back to a name-less greeting
 * rather than printing "Good afternoon, someone@example.com."
 */
export function displayFirstName(name: string | null | undefined): string | null {
  const trimmed = name?.trim();
  if (!trimmed) return null;
  if (trimmed.includes('@')) return null;
  const first = trimmed.split(/\s+/)[0];
  return first || null;
}

export function formatPercent(value: number): string {
  return `${value.toFixed(2)}%`;
}

/**
 * Compact duration for a month count: 14 → "1y 2m", 24 → "2y", 8 → "8m".
 * The canonical format for payoff timelines — chosen to fit on mobile.
 */
export function formatMonths(months: number): string {
  const years = Math.floor(months / 12);
  const rem = months % 12;
  if (years > 0 && rem > 0) return `${years}y ${rem}m`;
  if (years > 0) return `${years}y`;
  return `${rem}m`;
}

/** Human "X ago" string for a past date (no date-fns dependency). */
export function formatRelativeTime(date: Date): string {
  const seconds = Math.max(0, Math.floor((Date.now() - date.getTime()) / 1000));
  if (seconds < 60) return 'less than a minute';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? '' : 's'}`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'}`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days} day${days === 1 ? '' : 's'}`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months} month${months === 1 ? '' : 's'}`;
  const years = Math.floor(months / 12);
  return `${years} year${years === 1 ? '' : 's'}`;
}

export function getOrdinalDay(day: number): string {
  if (!day) return '';
  const s = ['th', 'st', 'nd', 'rd'];
  const v = day % 100;
  return day + (s[(v - 20) % 10] || s[v] || s[0]);
}

export function getCategoryColor(category: string): string {
  const colorMap: Record<string, string> = {
    'Credit Card': '#f59e0b',
    'Student Loan': '#8b5cf6',
    'Auto Loan': '#06b6d4',
    'Mortgage': '#10b981',
    'Personal Loan': '#f97316',
    'Medical Debt': '#ef4444',
    'Other': '#64748b',
  };
  return colorMap[category] || '#64748b';
}

export function calculateUtilization(balance: number, limit: number): number {
  if (limit <= 0) return 0;
  return (balance / limit) * 100;
}
