/**
 * apr-negotiation-adapter.ts
 * -------------------------------------------------------------------------
 * Maps a Snowball Pay tracked debt (`Debt` from `@/types`) into the
 * `NegotiationInputs` consumed by the APR-negotiation scripts & templates.
 *
 * Pure functions only — no React, no data fetching. Safe to unit-test and to
 * run on the server or client. The React glue lives in
 * `useAprNegotiation.ts`.
 *
 * Drop next to `apr-negotiation.ts` (e.g. `src/lib/apr-negotiation/`).
 * -------------------------------------------------------------------------
 */

import type { NegotiationInputs } from "./apr-negotiation";

/* -------------------------------------------------------------------------
 * Minimal structural type for a Snowball Pay debt.
 *
 * We intentionally re-declare a *structural* subset instead of importing the
 * full `Debt` from `@/types` so this module has zero coupling and can be
 * unit-tested in isolation. The app's real `Debt` is assignable to this.
 * ---------------------------------------------------------------------- */
export interface TrackedDebtLike {
  id: string;
  name: string;
  category:
    | "Credit Card"
    | "Student Loan"
    | "Auto Loan"
    | "Mortgage"
    | "Personal Loan"
    | "Medical Debt"
    | "Other";
  balance: number;
  /** APR in percent, e.g. 24.99 */
  interestRate: number;
  minimumPayment: number;
  /** For credit cards; 0 when unknown. */
  creditLimit: number;
  createdAt: Date | string;
}

/**
 * Fields the app can't derive from a tracked debt and must collect from the
 * user (or pull from a profile if you later store them). All optional.
 */
export interface UserSuppliedContext {
  fullName?: string | null;
  /** e.g. "740". Snowball Pay does not store this on the Debt model. */
  creditScore?: string | number | null;
  /** Named competing offer, e.g. "a credit union at 14.99%". */
  competingOffer?: string | null;
  /** Override the auto-computed target APR (percent, no % sign). */
  targetAprOverride?: string | number | null;
  /** Override the auto-computed walk-away APR. */
  walkAwayAprOverride?: string | number | null;
}

/* -------------------------------------------------------------------------
 * Formatting helpers
 * ---------------------------------------------------------------------- */

/** "24.99" from 24.99 — trims trailing ".00" to ".0" only when whole. */
export function formatRate(rate: number): string {
  if (!Number.isFinite(rate)) return "";
  // Keep up to 2 decimals but drop pointless trailing zeros.
  return String(Math.round(rate * 100) / 100);
}

/** "5,420.00" from 5420 */
export function formatMoney(amount: number): string {
  if (!Number.isFinite(amount)) return "";
  return amount.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/**
 * Years as a customer, derived from the debt's createdAt.
 * NOTE: this is how long the debt has been TRACKED in Snowball Pay, which is
 * a floor, not necessarily the true account-opening date. The UI should let
 * the user correct it. Returns a friendly string like "3" or "under 1".
 */
export function yearsSince(createdAt: Date | string, now: Date = new Date()): string {
  const start = typeof createdAt === "string" ? new Date(createdAt) : createdAt;
  if (Number.isNaN(start.getTime())) return "";
  const ms = now.getTime() - start.getTime();
  const years = ms / (1000 * 60 * 60 * 24 * 365.25);
  if (years < 1) return "under 1";
  return String(Math.floor(years));
}

/**
 * Extract the issuer from a debt name when possible. Users often name cards
 * like "Chase Freedom" or "Amex Gold" — grab a sensible issuer guess, else
 * fall back to a neutral placeholder the user can edit.
 */
export function guessIssuer(debtName: string): string {
  const known = [
    "Chase", "American Express", "Amex", "Citi", "Capital One", "Discover",
    "Bank of America", "Wells Fargo", "Barclays", "Synchrony", "US Bank",
    "Navy Federal", "USAA", "PNC", "TD", "HSBC", "Apple",
  ];
  const hit = known.find((k) => new RegExp(k, "i").test(debtName));
  if (hit) return hit === "Amex" ? "American Express" : hit;
  return debtName.trim() || "your issuer";
}

/** Last 4 digits if the name happens to contain them, else "" for the user to fill. */
export function extractLast4(debtName: string): string {
  const m = debtName.match(/(\d{4})(?!.*\d)/);
  return m ? m[1] : "";
}

/* -------------------------------------------------------------------------
 * Target / walk-away rate logic
 * -------------------------------------------------------------------------
 * A grounded, conservative rule of thumb — NOT financial advice, and clearly
 * presented in-app as a starting suggestion the user can override:
 *
 *   - Aim for a meaningful cut: ~30% off the current rate, floored so the ask
 *     stays realistic and not insultingly low.
 *   - Walk-away = a modest but real reduction (~2 points, or 10% off), so the
 *     user knows the minimum worth accepting before trying again later.
 * ---------------------------------------------------------------------- */

export interface RateTargets {
  targetApr: string;
  walkAwayApr: string;
}

export function computeRateTargets(currentApr: number): RateTargets {
  if (!Number.isFinite(currentApr) || currentApr <= 0) {
    return { targetApr: "", walkAwayApr: "" };
  }
  // Ask for ~30% lower, but never below a realistic 9.99% floor.
  const target = Math.max(9.99, Math.round(currentApr * 0.7 * 100) / 100);
  // Minimum worth accepting: the better of "2 points off" or "10% off".
  const walk = Math.max(
    currentApr - 2,
    Math.round(currentApr * 0.9 * 100) / 100
  );
  return {
    targetApr: formatRate(Math.min(target, currentApr)),
    walkAwayApr: formatRate(Math.min(walk, currentApr)),
  };
}

/* -------------------------------------------------------------------------
 * Guards
 * ---------------------------------------------------------------------- */

/** APR negotiation guidance is built for revolving credit-card debt. */
export function isNegotiableCard(debt: Pick<TrackedDebtLike, "category">): boolean {
  return debt.category === "Credit Card";
}

/* -------------------------------------------------------------------------
 * The adapter
 * ---------------------------------------------------------------------- */

export interface BuildInputsOptions {
  now?: Date;
  /** Fallback issuer name when it can't be guessed from the debt name. */
  defaultIssuer?: string;
}

/**
 * Build a fully-populated `NegotiationInputs` from a tracked debt plus any
 * user-supplied context. Fields we can't determine are left as sensible,
 * clearly-editable placeholders rather than fabricated values.
 */
export function buildNegotiationInputs(
  debt: TrackedDebtLike,
  ctx: UserSuppliedContext = {},
  opts: BuildInputsOptions = {}
): NegotiationInputs {
  const now = opts.now ?? new Date();
  const current = debt.interestRate;
  const auto = computeRateTargets(current);

  const targetApr =
    ctx.targetAprOverride != null && ctx.targetAprOverride !== ""
      ? formatRate(Number(ctx.targetAprOverride))
      : auto.targetApr;

  const walkAwayApr =
    ctx.walkAwayAprOverride != null && ctx.walkAwayAprOverride !== ""
      ? formatRate(Number(ctx.walkAwayAprOverride))
      : auto.walkAwayApr;

  return {
    fullName: (ctx.fullName ?? "").trim() || "[your name]",
    issuerName: guessIssuer(debt.name) || opts.defaultIssuer || "your issuer",
    cardLast4: extractLast4(debt.name) || "[last 4]",
    cardProductName: debt.name?.trim() || "my credit card",
    currentApr: formatRate(current),
    targetApr,
    walkAwayApr,
    yearsAsCustomer: yearsSince(debt.createdAt, now) || "[years]",
    creditScore:
      ctx.creditScore != null && ctx.creditScore !== ""
        ? String(ctx.creditScore)
        : "[your score]",
    currentBalance: formatMoney(debt.balance),
    competingOffer:
      (ctx.competingOffer ?? "").trim() ||
      "a competing card with a lower rate",
    date: now.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    }),
  };
}

/**
 * Which `NegotiationInputs` fields still need the user's attention because
 * we could only supply a placeholder. Drive a "complete your details" nudge
 * in the UI from this.
 */
export function missingInputFields(inputs: NegotiationInputs): (keyof NegotiationInputs)[] {
  const placeholderRe = /^\[.*\]$/;
  const checkKeys: (keyof NegotiationInputs)[] = [
    "fullName",
    "cardLast4",
    "creditScore",
    "yearsAsCustomer",
  ];
  return checkKeys.filter((k) => placeholderRe.test(inputs[k]));
}
