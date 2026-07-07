/**
 * Full calculator state persisted in localStorage so it survives the Auth0
 * signup round trip. Written by the public calculator before redirecting to
 * signup; read by /onboarding to skip the wizard and commit the exact plan
 * the user was shown. Same-device only by design — no PII leaves the browser
 * until the user is authenticated.
 */

export const CALCULATOR_DRAFT_KEY = "sp_calculator_draft_v1";
const CALCULATOR_DRAFT_TTL_MS = 14 * 24 * 60 * 60 * 1000;

/** sessionStorage flag set by onboarding when the free tier couldn't hold
 *  every calculator debt; DashboardClient reads it to surface the upgrade
 *  path instead of dropping the overflow silently. */
export const SKIPPED_DEBTS_FLAG = "sp_onboarding_skipped_debts";

export interface CalculatorDraftDebt {
  name: string;
  balance: string;
  rate: string;
  minimum: string;
}

export interface CalculatorDraft {
  version: 1;
  savedAt: number;
  method: "snowball" | "avalanche" | "custom";
  monthlyIncome: string;
  essentialExpenses: string;
  extraPayment: string;
  debtCategory: string;
  debts: CalculatorDraftDebt[];
  debtFreeDate?: string;
  interestSaved?: number;
}

export type CalculatorDraftInput = Omit<CalculatorDraft, "version" | "savedAt">;

/** Live calculator session as the UI holds it — the shared contract between
 *  PublicCalculator, ResultsPanel, SavePlanModal, and buildPlanSnapshot. */
export type CalculatorSessionState = Omit<
  CalculatorDraftInput,
  "debtFreeDate" | "interestSaved"
>;

function isFiniteNonNegative(value: string): boolean {
  if (value === "") return true;
  const n = Number.parseFloat(value);
  return Number.isFinite(n) && n >= 0;
}

function sanitizeDebt(debt: unknown): CalculatorDraftDebt | null {
  if (!debt || typeof debt !== "object") return null;
  const d = debt as Record<string, unknown>;
  const name = typeof d.name === "string" ? d.name.slice(0, 120) : "";
  const balance = typeof d.balance === "string" ? d.balance : "";
  const rate = typeof d.rate === "string" ? d.rate : "";
  const minimum = typeof d.minimum === "string" ? d.minimum : "";
  if ((Number.parseFloat(balance) || 0) <= 0) return null;
  if (!isFiniteNonNegative(rate) || !isFiniteNonNegative(minimum)) return null;
  return { name, balance, rate, minimum };
}

export function saveCalculatorDraft(input: CalculatorDraftInput): void {
  try {
    const draft: CalculatorDraft = { version: 1, savedAt: Date.now(), ...input };
    localStorage.setItem(CALCULATOR_DRAFT_KEY, JSON.stringify(draft));
  } catch {
    // Storage unavailable (private mode, quota) — the wizard fallback covers it.
  }
}

export function loadCalculatorDraft(): CalculatorDraft | null {
  try {
    const raw = localStorage.getItem(CALCULATOR_DRAFT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<CalculatorDraft>;
    if (parsed.version !== 1) return null;
    if (
      typeof parsed.savedAt !== "number" ||
      Date.now() - parsed.savedAt > CALCULATOR_DRAFT_TTL_MS
    ) {
      localStorage.removeItem(CALCULATOR_DRAFT_KEY);
      return null;
    }
    if (
      parsed.method !== "snowball" &&
      parsed.method !== "avalanche" &&
      parsed.method !== "custom"
    ) {
      return null;
    }
    const debts = Array.isArray(parsed.debts)
      ? parsed.debts
          .map(sanitizeDebt)
          .filter((d): d is CalculatorDraftDebt => d !== null)
          .slice(0, 30)
      : [];
    return {
      version: 1,
      savedAt: parsed.savedAt,
      method: parsed.method,
      monthlyIncome:
        typeof parsed.monthlyIncome === "string" ? parsed.monthlyIncome : "",
      essentialExpenses:
        typeof parsed.essentialExpenses === "string"
          ? parsed.essentialExpenses
          : "",
      extraPayment:
        typeof parsed.extraPayment === "string" ? parsed.extraPayment : "",
      debtCategory:
        typeof parsed.debtCategory === "string" ? parsed.debtCategory : "Other",
      debts,
      debtFreeDate:
        typeof parsed.debtFreeDate === "string" ? parsed.debtFreeDate : undefined,
      interestSaved:
        typeof parsed.interestSaved === "number" &&
        Number.isFinite(parsed.interestSaved)
          ? parsed.interestSaved
          : undefined,
    };
  } catch {
    return null;
  }
}

export function clearCalculatorDraft(): void {
  try {
    localStorage.removeItem(CALCULATOR_DRAFT_KEY);
  } catch {
    // ignore
  }
}

/**
 * A draft can skip the wizard when it carries everything onboarding would
 * have asked for: a positive income and at least one debt with a balance.
 */
export function isExpressEligible(draft: CalculatorDraft): boolean {
  return (
    (Number.parseFloat(draft.monthlyIncome) || 0) > 0 && draft.debts.length > 0
  );
}
