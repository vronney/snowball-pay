"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  useCompleteOnboarding,
  type OnboardingCompletePayload,
  type OnboardingDebtPayload,
} from "@/lib/hooks";
import { formatCurrency } from "@/lib/utils";
import {
  loadCalculatorDraft,
  clearCalculatorDraft,
  isExpressEligible,
  SKIPPED_DEBTS_FLAG,
  type CalculatorDraft,
} from "@/lib/calculatorDraft";
import { track, Events } from "@/lib/analytics";
import { PLANS } from "@/lib/stripe";
import {
  ONBOARDING_DRAFT_VERSION,
  ONBOARDING_STEPS,
  normaliseOnboardingStep,
} from "@/lib/onboardingFunnel";
import { ChevronRight, ChevronLeft, Check, DollarSign, Info } from "lucide-react";

const FREE_DEBT_LIMIT = PLANS.free.debtLimit;

// ─── Types ────────────────────────────────────────────────────────────────────

type Strategy = "snowball" | "avalanche" | "custom";

interface StepState {
  monthlyIncome: string;
  essentialExpenses: string;
  extraPayment: string;
  strategy: Strategy;
  debtName: string;
  debtBalance: string;
  debtApr: string;
  debtMin: string;
  debtCategory: string;
}

const INITIAL_STATE: StepState = {
  monthlyIncome: "",
  essentialExpenses: "",
  extraPayment: "",
  strategy: "snowball",
  debtName: "",
  debtBalance: "",
  debtApr: "",
  debtMin: "",
  debtCategory: "Credit Card",
};

// ─── Step indicator ──────────────────────────────────────────────────────────

function StepIndicator({ current, total }: { current: number; total: number }) {
  return (
    <div
      className="flex items-center gap-2 justify-center mb-8"
      role="progressbar"
      aria-label="Account setup progress"
      aria-valuemin={1}
      aria-valuemax={total}
      aria-valuenow={current + 1}
    >
      {Array.from({ length: total }).map((_, i) => (
        <div
          key={i}
          className="rounded-full transition-all duration-300"
          style={{
            width: i === current ? 24 : 8,
            height: 8,
            background: i <= current ? "#2563eb" : "rgba(15,23,42,0.12)",
          }}
        />
      ))}
    </div>
  );
}

// ─── Step 1 — Monthly budget ──────────────────────────────────────────────────

function NumberInput({
  label,
  value,
  onChange,
  hint,
  invalid = false,
  prefix = "$",
  suffix,
  max,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  hint?: string;
  /** Red border when this specific field is the cause of the step's
   *  validation error — matches the --error (#ef4444) token in DESIGN.md
   *  and the existing pattern in SavePlanModal's email field. */
  invalid?: boolean;
  prefix?: string | null;
  suffix?: string;
  max?: number;
}) {
  return (
    <div className="space-y-1">
      <label className="text-xs font-semibold" style={{ color: "#374151" }}>
        {label}
      </label>
      <div
        className="flex items-center rounded-lg border overflow-hidden"
        style={{
          borderColor: invalid ? "#ef4444" : "rgba(15,23,42,0.15)",
          background: "#ffffff",
        }}
      >
        {prefix && (
          <span
            className="px-3 py-3 text-sm font-semibold"
            style={{
              color: "#94a3b8",
              background: "#F8FAFC",
              borderRight: "1px solid rgba(15,23,42,0.1)",
            }}
          >
            {prefix}
          </span>
        )}
        <input
          type="number"
          min="0"
          max={max}
          step="any"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="0"
          className="flex-1 px-3 py-3 text-sm outline-none"
          style={{
            fontFamily: "inherit",
            color: "#111827",
            background: "transparent",
          }}
        />
        {suffix && (
          <span
            className="px-3 py-3 text-sm font-semibold"
            style={{
              color: "#64748b",
              background: "#F8FAFC",
              borderLeft: "1px solid rgba(15,23,42,0.1)",
            }}
          >
            {suffix}
          </span>
        )}
      </div>
      {hint && (
        <p className="text-xs" style={{ color: "#94a3b8" }}>
          {hint}
        </p>
      )}
    </div>
  );
}

function StepBudget({
  state,
  onField,
  showErrors,
}: {
  state: StepState;
  onField: (k: keyof StepState, v: string) => void;
  /** Only apply field-level red borders once the user has interacted with
   *  this step — see `touchedSteps` in OnboardingWizard. */
  showErrors: boolean;
}) {
  const income = parseFloat(state.monthlyIncome) || 0;
  const essential = parseFloat(state.essentialExpenses) || 0;
  const extra = parseFloat(state.extraPayment) || 0;
  // Surplus can be negative — that's a real financial state (essential
  // expenses eating the whole paycheck), not an error condition. Clamp only
  // the "leftover after essentials" leg to 0 before adding the separate,
  // explicit "extra" contribution, so this always resolves to an honest,
  // non-negative number without silently dropping either input.
  const surplus = income - essential;
  const overBudget = income > 0 && surplus < 0;
  const totalForDebtPayoff = Math.max(0, surplus) + extra;

  const incomeInvalid = showErrors && income <= 0;
  const essentialInvalid = showErrors && essential < 0;
  const extraInvalid = showErrors && extra < 0;

  return (
    <div>
      <h2 className="text-2xl font-bold mb-1" style={{ color: "#111827" }}>
        Your monthly capacity
      </h2>
      <p className="text-sm mb-6" style={{ color: "#6B7280" }}>
        This helps us build a payoff plan that fits your budget.
      </p>
      <div className="space-y-4">
        <NumberInput
          label="Monthly take-home pay"
          value={state.monthlyIncome}
          onChange={(v) => onField("monthlyIncome", v)}
          invalid={incomeInvalid}
        />
        <NumberInput
          label="Essential monthly expenses"
          value={state.essentialExpenses}
          onChange={(v) => onField("essentialExpenses", v)}
          hint="Rent, utilities, groceries, insurance…"
          invalid={essentialInvalid}
        />
        <NumberInput
          label="Extra payment budget (optional)"
          value={state.extraPayment}
          onChange={(v) => onField("extraPayment", v)}
          hint="Any extra amount you can put toward debt."
          invalid={extraInvalid}
        />
      </div>
      {showErrors && overBudget ? (
        <div
          className="mt-4 rounded-xl px-4 py-3 flex items-center gap-3"
          style={{
            background: "rgba(14,165,233,0.08)",
            border: "1px solid rgba(14,165,233,0.2)",
          }}
        >
          <Info size={16} style={{ color: "#0ea5e9", flexShrink: 0 }} />
          <span className="text-sm" style={{ color: "#374151" }}>
            Your essential expenses use up all of your take-home pay right
            now — that&apos;s okay. We&apos;ll build your plan around
            minimum payments, and you can add extra funds any time things
            change.{" "}
            <a
              href="/learn/when-expenses-exceed-income"
              target="_blank"
              rel="noopener noreferrer"
              style={{
                color: "#0ea5e9",
                fontWeight: 700,
                textDecoration: "underline",
              }}
            >
              See your options →
            </a>
          </span>
        </div>
      ) : (
        income > 0 && (
          <div
            className="mt-4 rounded-xl px-4 py-3 flex items-center gap-3"
            style={{
              background: "rgba(37,99,235,0.06)",
              border: "1px solid rgba(37,99,235,0.14)",
            }}
          >
            <DollarSign
              size={16}
              style={{ color: "#2563eb", flexShrink: 0 }}
            />
            <span className="text-sm" style={{ color: "#374151" }}>
              Available for debt payoff:{" "}
              <strong style={{ color: "#2563eb" }}>
                {formatCurrency(totalForDebtPayoff)}
              </strong>
              /mo
            </span>
          </div>
        )
      )}
    </div>
  );
}

// ─── Step 2 — Strategy ───────────────────────────────────────────────────────

const STRATEGIES: {
  id: Strategy;
  label: string;
  desc: string;
  emoji: string;
}[] = [
  {
    id: "snowball",
    label: "Snowball",
    emoji: "⛄",
    desc: "Pay smallest balance first. Build momentum with quick wins.",
  },
  {
    id: "avalanche",
    label: "Avalanche",
    emoji: "🏔",
    desc: "Pay highest APR first. Minimize total interest paid.",
  },
  {
    id: "custom",
    label: "Custom",
    emoji: "✏️",
    desc: "Drag and drop to set your own priority order.",
  },
];

function StepStrategy({
  state,
  onChange,
}: {
  state: StepState;
  onChange: (s: Strategy) => void;
}) {
  return (
    <div>
      <h2 className="text-2xl font-bold mb-1" style={{ color: "#111827" }}>
        Choose your strategy
      </h2>
      <p className="text-sm mb-6" style={{ color: "#6B7280" }}>
        You can switch strategies any time from your dashboard.
      </p>
      <div className="space-y-3">
        {STRATEGIES.map((s) => {
          const active = state.strategy === s.id;
          return (
            <button
              key={s.id}
              onClick={() => onChange(s.id)}
              className="w-full text-left rounded-xl p-4 flex items-center gap-4 transition-all"
              style={{
                background: active ? "rgba(37,99,235,0.07)" : "#ffffff",
                border: active
                  ? "2px solid #2563eb"
                  : "2px solid rgba(15,23,42,0.1)",
                cursor: "pointer",
                fontFamily: "inherit",
              }}
            >
              <span style={{ fontSize: 28, lineHeight: 1 }}>{s.emoji}</span>
              <div className="flex-1 min-w-0">
                <p
                  className="font-semibold text-sm"
                  style={{ color: "#111827" }}
                >
                  {s.label}
                </p>
                <p className="text-xs mt-0.5" style={{ color: "#6B7280" }}>
                  {s.desc}
                </p>
              </div>
              {active && (
                <Check size={16} style={{ color: "#2563eb", flexShrink: 0 }} />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─── Step 3 — First debt ─────────────────────────────────────────────────────

const CATEGORIES = [
  "Credit Card",
  "Student Loan",
  "Auto Loan",
  "Mortgage",
  "Personal Loan",
  "Medical Debt",
  "Other",
];

function StepFirstDebt({
  state,
  onField,
  showErrors,
}: {
  state: StepState;
  onField: (k: keyof StepState, v: string) => void;
  showErrors: boolean;
}) {
  const nameInvalid = showErrors && !state.debtName.trim();
  const balanceInvalid = showErrors && (parseFloat(state.debtBalance) || 0) <= 0;
  const apr = parseFloat(state.debtApr) || 0;
  const aprInvalid = showErrors && (apr < 0 || apr > 100);
  const minInvalid = showErrors && (parseFloat(state.debtMin) || 0) < 0;

  return (
    <div>
      <h2 className="text-2xl font-bold mb-1" style={{ color: "#111827" }}>
        Add your first debt
      </h2>
      <p className="text-sm mb-6" style={{ color: "#6B7280" }}>
        You can add more debts from your dashboard. Start with one.
      </p>
      <div className="space-y-4">
        <div className="space-y-1">
          <label className="text-xs font-semibold" style={{ color: "#374151" }}>
            Debt name / creditor
          </label>
          <input
            type="text"
            value={state.debtName}
            onChange={(e) => onField("debtName", e.target.value)}
            placeholder="e.g. Chase Visa, Student Loan"
            className="w-full rounded-lg border px-3 py-3 text-sm outline-none"
            style={{
              borderColor: nameInvalid ? "#ef4444" : "rgba(15,23,42,0.15)",
              fontFamily: "inherit",
              color: "#111827",
            }}
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-semibold" style={{ color: "#374151" }}>
            Debt type
          </label>
          <select
            value={state.debtCategory}
            onChange={(e) => onField("debtCategory", e.target.value)}
            className="w-full rounded-lg border px-3 py-3 text-sm outline-none"
            style={{
              borderColor: "rgba(15,23,42,0.15)",
              fontFamily: "inherit",
              color: "#111827",
              background: "#ffffff",
            }}
          >
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <NumberInput
            label="Current balance"
            value={state.debtBalance}
            onChange={(v) => onField("debtBalance", v)}
            invalid={balanceInvalid}
          />
          <NumberInput
            label="APR (%)"
            value={state.debtApr}
            onChange={(v) => onField("debtApr", v)}
            invalid={aprInvalid}
            prefix={null}
            suffix="%"
            max={100}
          />
          <NumberInput
            label="Minimum payment"
            value={state.debtMin}
            onChange={(v) => onField("debtMin", v)}
            invalid={minInvalid}
          />
        </div>
      </div>
    </div>
  );
}

// ─── Wizard shell ─────────────────────────────────────────────────────────────

const STEPS = ONBOARDING_STEPS.length;
const ONBOARDING_DRAFT_KEY = "sp_onboarding_draft_v1";
const ONBOARDING_DRAFT_TTL_MS = 14 * 24 * 60 * 60 * 1000;

function sanitizePositiveCurrency(value: string | null): string {
  if (!value) return "";
  const amount = Number.parseFloat(value);
  return Number.isFinite(amount) && amount >= 0 ? String(amount) : "";
}

function sanitizeStrategy(value: string | null): Strategy | null {
  return value === "snowball" || value === "avalanche" || value === "custom"
    ? value
    : null;
}

function sanitizeCategory(value: string): OnboardingDebtPayload["category"] {
  return CATEGORIES.includes(value)
    ? (value as OnboardingDebtPayload["category"])
    : "Other";
}

/** Every debt from the calculator session, ready for the complete endpoint. */
function draftDebtsToPayload(draft: CalculatorDraft): OnboardingDebtPayload[] {
  const category = sanitizeCategory(draft.debtCategory);
  return draft.debts
    .map((d, i) => ({
      name: d.name.trim() || `Debt ${i + 1}`,
      category,
      balance: parseFloat(d.balance) || 0,
      // The complete endpoint caps APR at 100 — clamp rather than let a
      // hand-typed 120% APR fail the whole express submit.
      interestRate: Math.min(parseFloat(d.rate) || 0, 100),
      minimumPayment: parseFloat(d.minimum) || 0,
      creditLimit: 0,
    }))
    .filter((d) => d.balance > 0);
}

function getStepError(step: number, state: StepState): string | null {
  if (step === 0) {
    const income = parseFloat(state.monthlyIncome) || 0;
    const essential = parseFloat(state.essentialExpenses) || 0;
    const extra = parseFloat(state.extraPayment) || 0;

    if (income <= 0) return "Enter your monthly take-home pay.";
    if (essential < 0 || extra < 0) return "Amounts cannot be negative.";
    // Essential expenses exceeding income is NOT a blocking error — it's a
    // real financial situation for a lot of people carrying debt, not a
    // mistake to correct. The calc engine (snowball.ts) already clamps
    // negative cash flow to a minimum-payments-only plan instead of crashing
    // or looping, so there's nothing here that requires stopping the user.
    // StepBudget shows a non-blocking, non-shaming heads-up instead.
    return null;
  }

  if (step === 1) return null;

  if (step === 2) {
    if (!state.debtName.trim()) return "Add a debt name or creditor.";
    if ((parseFloat(state.debtBalance) || 0) <= 0)
      return "Current balance must be greater than $0.";
    if ((parseFloat(state.debtApr) || 0) < 0) return "APR cannot be negative.";
    if ((parseFloat(state.debtApr) || 0) > 100)
      return "APR cannot exceed 100%.";
    if ((parseFloat(state.debtMin) || 0) < 0)
      return "Minimum payment cannot be negative.";
    return null;
  }

  return null;
}

export function OnboardingWizard({
  userEmail = null,
  serverDraft = null,
}: {
  /** Signed-in user's email, threaded to Google Ads Enhanced Conversions
   *  (hashed client-side by gtag before transmission). */
  userEmail?: string | null;
  /** Plan snapshot recovered from the lead row (cross-device); competes
   *  with the localStorage draft by savedAt — the fresher one wins. */
  serverDraft?: CalculatorDraft | null;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const completeOnboarding = useCompleteOnboarding();

  const [step, setStep] = useState(0);
  const [state, setState] = useState<StepState>(INITIAL_STATE);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  // Full calculator session restored from localStorage: when present, the
  // user already answered everything the wizard would ask — show the express
  // confirmation instead of re-collecting it (their plan, not a form).
  const [calcDraft, setCalcDraft] = useState<CalculatorDraft | null>(null);
  const [mode, setMode] = useState<"express" | "wizard">("wizard");
  const [draftResolved, setDraftResolved] = useState(false);
  const submitIdempotencyKeyRef = useRef<string | null>(null);
  const viewedStepsRef = useRef(new Set<string>());
  const completedStepsRef = useRef(new Set<string>());
  // Which steps the user has actually interacted with (typed in a field,
  // picked a strategy). Gates when validation becomes *visible* —
  // canProceed()/getStepError() below are unaffected, so the Continue button
  // stays correctly disabled from the first render. This only controls the
  // message + red-border styling, so a step never scolds the user before
  // they've done anything on it.
  const [touchedSteps, setTouchedSteps] = useState<Set<number>>(
    () => new Set(),
  );
  const markTouched = (s: number) =>
    setTouchedSteps((prev) => (prev.has(s) ? prev : new Set(prev).add(s)));

  const stepError = getStepError(step, state);
  const showStepErrors = touchedSteps.has(step);
  const visibleStepError = showStepErrors ? stepError : null;
  const onboardingSource =
    calcDraft || searchParams.get("source") === "calculator"
      ? "calculator"
      : "direct";

  useEffect(() => {
    // Two possible sources for the calculator session: this browser's
    // localStorage, or the snapshot saved on the lead row (another device).
    // Freshest wins — a plan re-saved on a phone beats yesterday's desktop.
    const localDraft = loadCalculatorDraft();
    const calc = [localDraft, serverDraft]
      .filter((d): d is CalculatorDraft => d !== null && isExpressEligible(d))
      .sort((a, b) => b.savedAt - a.savedAt)[0];
    if (calc) {
      setCalcDraft(calc);
      setMode("express");
      track(Events.ONBOARDING_EXPRESS_VIEWED, {
        debts: calc.debts.length,
        source: calc === localDraft ? "local" : "server",
      });
      // Prefill the wizard too, so "Review details" starts fully filled in.
      const first = calc.debts[0];
      setState((current) => ({
        ...current,
        strategy: calc.method,
        monthlyIncome: calc.monthlyIncome || current.monthlyIncome,
        essentialExpenses: calc.essentialExpenses || current.essentialExpenses,
        extraPayment: calc.extraPayment || current.extraPayment,
        debtName: first?.name || current.debtName,
        debtBalance: first?.balance || current.debtBalance,
        debtApr: first?.rate || current.debtApr,
        debtMin: first?.minimum || current.debtMin,
        debtCategory: sanitizeCategory(calc.debtCategory),
      }));
      setStep(0);
      setDraftResolved(true);
      return;
    }
    try {
      const raw = localStorage.getItem(ONBOARDING_DRAFT_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as Partial<StepState> & {
        goal?: unknown;
        step?: unknown;
        savedAt?: unknown;
        draftVersion?: unknown;
      };
      if (
        typeof parsed.savedAt === "number" &&
        Date.now() - parsed.savedAt > ONBOARDING_DRAFT_TTL_MS
      ) {
        localStorage.removeItem(ONBOARDING_DRAFT_KEY);
        return;
      }
      setState((current) => ({
        ...current,
        monthlyIncome:
          typeof parsed.monthlyIncome === "string"
            ? parsed.monthlyIncome
            : current.monthlyIncome,
        essentialExpenses:
          typeof parsed.essentialExpenses === "string"
            ? parsed.essentialExpenses
            : current.essentialExpenses,
        extraPayment:
          typeof parsed.extraPayment === "string"
            ? parsed.extraPayment
            : current.extraPayment,
        strategy:
          sanitizeStrategy(parsed.strategy ?? null) ?? current.strategy,
        debtName:
          typeof parsed.debtName === "string"
            ? parsed.debtName
            : current.debtName,
        debtBalance:
          typeof parsed.debtBalance === "string"
            ? parsed.debtBalance
            : current.debtBalance,
        debtApr:
          typeof parsed.debtApr === "string"
            ? parsed.debtApr
            : current.debtApr,
        debtMin:
          typeof parsed.debtMin === "string"
            ? parsed.debtMin
            : current.debtMin,
        debtCategory:
          typeof parsed.debtCategory === "string" &&
          CATEGORIES.includes(parsed.debtCategory)
            ? parsed.debtCategory
            : current.debtCategory,
      }));
      setStep(normaliseOnboardingStep(parsed.step, parsed.draftVersion));
    } catch {
      // Ignore corrupted draft data
    } finally {
      setDraftResolved(true);
    }
  }, [serverDraft]);

  useEffect(() => {
    const strategy = sanitizeStrategy(searchParams.get("method"));
    const debtCategory = searchParams.get("debtCategory");

    const hasCalculatorPrefill =
      !!strategy ||
      !!searchParams.get("income") ||
      !!searchParams.get("expenses") ||
      !!searchParams.get("extra") ||
      !!searchParams.get("debtName") ||
      !!searchParams.get("debtBalance") ||
      !!searchParams.get("debtApr") ||
      !!searchParams.get("debtMin");

    if (!hasCalculatorPrefill) return;

    setState((current) => ({
      ...current,
      strategy: strategy ?? current.strategy,
      monthlyIncome:
        sanitizePositiveCurrency(searchParams.get("income")) ||
        current.monthlyIncome,
      essentialExpenses:
        sanitizePositiveCurrency(searchParams.get("expenses")) ||
        current.essentialExpenses,
      extraPayment:
        sanitizePositiveCurrency(searchParams.get("extra")) ||
        current.extraPayment,
      debtName: searchParams.get("debtName")?.trim() || current.debtName,
      debtBalance:
        sanitizePositiveCurrency(searchParams.get("debtBalance")) ||
        current.debtBalance,
      debtApr:
        sanitizePositiveCurrency(searchParams.get("debtApr")) ||
        current.debtApr,
      debtMin:
        sanitizePositiveCurrency(searchParams.get("debtMin")) ||
        current.debtMin,
      debtCategory:
        debtCategory && CATEGORIES.includes(debtCategory)
          ? debtCategory
          : current.debtCategory,
    }));
  }, [searchParams]);

  useEffect(() => {
    if (!draftResolved || mode !== "wizard") return;
    const stepName = ONBOARDING_STEPS[step];
    if (!stepName) return;

    const viewKey = `${onboardingSource}:${stepName}`;
    if (viewedStepsRef.current.has(viewKey)) return;
    viewedStepsRef.current.add(viewKey);
    track(Events.ONBOARDING_STEP_VIEWED, {
      step: stepName,
      position: step + 1,
      total_steps: STEPS,
      source: onboardingSource,
    });
  }, [draftResolved, mode, onboardingSource, step]);

  useEffect(() => {
    if (!draftResolved) return;
    try {
      localStorage.setItem(
        ONBOARDING_DRAFT_KEY,
        JSON.stringify({
          ...state,
          step,
          draftVersion: ONBOARDING_DRAFT_VERSION,
          savedAt: Date.now(),
        }),
      );
    } catch {
      // Ignore storage failures
    }
  }, [draftResolved, state, step]);

  // Warn before accidental tab close / navigation during wizard.
  // The express screen has nothing to lose (the plan is persisted), so
  // don't nag there.
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (submitting || mode === "express") return;
      e.preventDefault();
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [submitting, mode]);

  function onField(k: keyof StepState, v: string) {
    if (submitError) setSubmitError(null);
    setState((s) => ({ ...s, [k]: v }));
    markTouched(step);
  }

  function canProceed() {
    return getStepError(step, state) == null;
  }

  function trackStepCompleted(stepIndex: number) {
    const stepName = ONBOARDING_STEPS[stepIndex];
    if (!stepName) return;

    const completionKey = `${onboardingSource}:${stepName}`;
    if (completedStepsRef.current.has(completionKey)) return;
    completedStepsRef.current.add(completionKey);
    track(Events.ONBOARDING_STEP_COMPLETED, {
      step: stepName,
      position: stepIndex + 1,
      total_steps: STEPS,
      source: onboardingSource,
    });
  }

  async function submitOnboarding(
    payload: OnboardingCompletePayload,
    completionMode: "express" | "wizard",
  ) {
    setSubmitting(true);
    setSubmitError(null);
    try {
      if (!submitIdempotencyKeyRef.current) {
        submitIdempotencyKeyRef.current =
          typeof crypto !== "undefined" &&
          typeof crypto.randomUUID === "function"
            ? crypto.randomUUID()
            : `ob_${Date.now()}_${Math.random().toString(36).slice(2)}`;
      }

      const result = (await completeOnboarding.mutateAsync({
        idempotencyKey: submitIdempotencyKeyRef.current,
        payload,
      })) as { skippedDebts?: number } | undefined;
      try {
        localStorage.removeItem(ONBOARDING_DRAFT_KEY);
      } catch {
        // Ignore storage cleanup errors
      }
      clearCalculatorDraft();
      // Free tier couldn't hold every debt — tell the dashboard so it can
      // surface the upgrade path instead of dropping them silently.
      if (result?.skippedDebts && result.skippedDebts > 0) {
        try {
          sessionStorage.setItem(SKIPPED_DEBTS_FLAG, String(result.skippedDebts));
        } catch {
          // Storage unavailable — the add-debt gate still upsells later.
        }
      }
      const debtCount = payload.debts?.length ?? (payload.firstDebt ? 1 : 0);
      const analyticsProperties = {
        debt_count: debtCount,
        method: payload.income.payoffMethod,
        mode: completionMode,
        source: onboardingSource,
      };

      if (completionMode === "wizard") {
        trackStepCompleted(STEPS - 1);
      }
      track(Events.SIGNUP_COMPLETED, analyticsProperties);
      if (completionMode === "express") {
        track(Events.ONBOARDING_EXPRESS_COMPLETED, analyticsProperties);
      }

      // The Google Ads signup conversion now fires at account creation
      // (SignupConversionReporter on the onboarding/dashboard pages), so
      // Google gets a signal for every created account, not only wizard
      // completions.
      submitIdempotencyKeyRef.current = null;
      router.push("/dashboard");
    } catch (err) {
      const status =
        err && typeof err === "object" && "response" in err
          ? (err as { response?: { status?: number } }).response?.status
          : undefined;
      setSubmitError(
        status === 401
          ? "We couldn't link this account. If this email is already registered with a different sign-in method (like Google), log out and sign in with that method — or verify your email and log in again."
          : "Could not save your setup. Check your connection and try again.",
      );
      setSubmitting(false);
    }
  }

  function buildIncomePayload(): OnboardingCompletePayload["income"] {
    return {
      monthlyTakeHome: parseFloat(state.monthlyIncome) || 0,
      essentialExpenses: parseFloat(state.essentialExpenses) || 0,
      extraPayment: parseFloat(state.extraPayment) || 0,
      payoffMethod: state.strategy,
    };
  }

  async function handleFinish() {
    const wizardDebt: OnboardingDebtPayload = {
      name: state.debtName.trim(),
      category: sanitizeCategory(state.debtCategory),
      balance: parseFloat(state.debtBalance) || 0,
      interestRate: parseFloat(state.debtApr) || 0,
      minimumPayment: parseFloat(state.debtMin) || 0,
      creditLimit: 0,
    };
    // The wizard edits the first debt; the rest of the calculator session
    // (if any) still comes along so reviewing never costs the user data.
    const extraDebts = calcDraft ? draftDebtsToPayload(calcDraft).slice(1) : [];
    await submitOnboarding(
      {
        income: buildIncomePayload(),
        debts: [wizardDebt, ...extraDebts],
      },
      "wizard",
    );
  }

  async function handleExpressFinish() {
    if (!calcDraft) return;
    await submitOnboarding(
      {
        income: {
          monthlyTakeHome: parseFloat(calcDraft.monthlyIncome) || 0,
          essentialExpenses: parseFloat(calcDraft.essentialExpenses) || 0,
          extraPayment: parseFloat(calcDraft.extraPayment) || 0,
          payoffMethod: calcDraft.method,
        },
        debts: draftDebtsToPayload(calcDraft),
      },
      "express",
    );
  }

  const handleContinue = () => {
    // The button is `disabled` when this is false, so this is a defensive
    // guard, not the primary gate — see the Continue button below.
    if (canProceed()) {
      trackStepCompleted(step);
      setStep((s) => s + 1);
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4"
      style={{ background: "#F8FAFC" }}
    >
      <div
        className="w-full max-w-lg rounded-xl p-8"
        style={{
          background: "#ffffff",
          boxShadow: "0 8px 24px rgba(17,24,39,0.08)",
          border: "1px solid rgba(15,23,42,0.08)",
        }}
      >
        {/* Logo link */}
        <div className="text-center mb-6">
          <a
            href="/"
            className="text-lg font-bold"
            style={{ color: "#0f172a", textDecoration: "none" }}
          >
            SnowballPay
          </a>
        </div>

        {/* Account creation counts as the first completed step so the
            indicator never starts at zero (endowed progress). */}
        <StepIndicator
          current={mode === "express" ? STEPS : step + 1}
          total={STEPS + 1}
        />

        {mode === "express" && calcDraft ? (
          /* Express path: the calculator session answered everything the
             wizard would ask, so the last step is a confirmation, not a form.
             Endowed progress is honest here — the user really did the work. */
          <div className="tab-fade-in">
            <h2 className="text-2xl font-bold mb-1" style={{ color: "#111827" }}>
              Your plan is ready
            </h2>
            <p className="text-sm mb-6" style={{ color: "#6B7280" }}>
              Everything you entered in the calculator is saved — nothing to
              re-type.
            </p>

            <div
              className="rounded-xl p-4 mb-4"
              style={{
                background: "rgba(37,99,235,0.06)",
                border: "1px solid rgba(37,99,235,0.14)",
              }}
            >
              {calcDraft.debtFreeDate && (
                <p
                  className="font-semibold text-base mb-1"
                  style={{ color: "#111827" }}
                >
                  Debt-free by {calcDraft.debtFreeDate}
                </p>
              )}
              {typeof calcDraft.interestSaved === "number" &&
                calcDraft.interestSaved > 0 && (
                  <p className="text-sm mb-2" style={{ color: "#374151" }}>
                    Saving{" "}
                    <strong
                      className="mono"
                      style={{
                        color: "#10b981",
                        fontVariantNumeric: "tabular-nums",
                      }}
                    >
                      {formatCurrency(calcDraft.interestSaved)}
                    </strong>{" "}
                    in interest vs. minimum payments
                  </p>
                )}
              <ul className="text-sm space-y-1" style={{ color: "#374151" }}>
                <li>
                  <Check
                    size={14}
                    style={{
                      color: "#10b981",
                      display: "inline",
                      marginRight: 6,
                      verticalAlign: "-2px",
                    }}
                  />
                  <span
                    className="mono"
                    style={{ fontVariantNumeric: "tabular-nums" }}
                  >
                    {calcDraft.debts.length}
                  </span>{" "}
                  {calcDraft.debts.length === 1 ? "debt" : "debts"} totaling{" "}
                  <span
                    className="mono"
                    style={{ fontVariantNumeric: "tabular-nums" }}
                  >
                    {formatCurrency(
                      calcDraft.debts.reduce(
                        (s, d) => s + (parseFloat(d.balance) || 0),
                        0,
                      ),
                    )}
                  </span>
                </li>
                <li>
                  <Check
                    size={14}
                    style={{
                      color: "#10b981",
                      display: "inline",
                      marginRight: 6,
                      verticalAlign: "-2px",
                    }}
                  />
                  <span
                    className="mono"
                    style={{ fontVariantNumeric: "tabular-nums" }}
                  >
                    {formatCurrency(parseFloat(calcDraft.monthlyIncome) || 0)}
                  </span>
                  /mo take-home budget
                </li>
                <li>
                  <Check
                    size={14}
                    style={{
                      color: "#10b981",
                      display: "inline",
                      marginRight: 6,
                      verticalAlign: "-2px",
                    }}
                  />
                  {calcDraft.method === "avalanche"
                    ? "Avalanche"
                    : calcDraft.method === "custom"
                      ? "Custom"
                      : "Snowball"}{" "}
                  strategy
                </li>
              </ul>
            </div>

            {calcDraft.debts.length > FREE_DEBT_LIMIT && (
              <p
                className="rounded-lg px-3 py-2 text-xs mb-3"
                style={{
                  background: "rgba(180,83,9,0.07)",
                  border: "1px solid rgba(180,83,9,0.16)",
                  color: "#92400e",
                }}
              >
                Free accounts track up to {FREE_DEBT_LIMIT} debts — your first{" "}
                {FREE_DEBT_LIMIT} will be added now. Upgrade to Pro anytime to
                track the rest.
              </p>
            )}

            <button
              onClick={() => void handleExpressFinish()}
              disabled={submitting}
              className="w-full flex items-center justify-center gap-1.5 rounded-lg px-6 py-3 text-sm font-semibold text-white transition hover:brightness-110 disabled:opacity-40 disabled:cursor-not-allowed"
              style={{
                // Solid fill — DESIGN.md disallows gradient CTA buttons.
                background: submitting ? "#94a3b8" : "#2563eb",
                border: "none",
                cursor: submitting ? "not-allowed" : "pointer",
                fontFamily: "inherit",
              }}
            >
              {submitting ? "Saving…" : "Open my dashboard"}
              {!submitting && <ChevronRight size={15} />}
            </button>

            <p className="text-center text-xs mt-3">
              <button
                onClick={() => setMode("wizard")}
                style={{
                  color: "#6B7280",
                  textDecoration: "underline",
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  fontFamily: "inherit",
                  fontSize: "inherit",
                }}
              >
                Review details first
              </button>
            </p>

            {submitError && (
              <div
                className="mt-3 rounded-lg px-3 py-2 text-xs"
                style={{
                  background: "rgba(239,68,68,0.08)",
                  border: "1px solid rgba(239,68,68,0.18)",
                  color: "#b91c1c",
                }}
              >
                {submitError}
              </div>
            )}
          </div>
        ) : (
          <>
        {/* Step content */}
        <div className="tab-fade-in">
          {step === 0 && (
            <StepBudget
              state={state}
              onField={onField}
              showErrors={showStepErrors}
            />
          )}
          {step === 1 && (
            <StepStrategy
              state={state}
              onChange={(s) => setState((st) => ({ ...st, strategy: s }))}
            />
          )}
          {step === 2 && (
            <StepFirstDebt
              state={state}
              onField={onField}
              showErrors={showStepErrors}
            />
          )}
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between mt-8 gap-3">
          {step > 0 ? (
            <button
              onClick={() => setStep((s) => s - 1)}
              className="flex items-center gap-1.5 rounded-lg px-4 py-2.5 text-sm font-medium transition hover:bg-slate-50"
              style={{
                color: "#6B7280",
                border: "1px solid rgba(15,23,42,0.12)",
                background: "transparent",
                cursor: "pointer",
                fontFamily: "inherit",
              }}
            >
              <ChevronLeft size={15} />
              Back
            </button>
          ) : (
            <div />
          )}

          {step < STEPS - 1 ? (
            <button
              onClick={handleContinue}
              disabled={!canProceed()}
              className="flex items-center gap-1.5 rounded-lg px-6 py-2.5 text-sm font-semibold text-white transition hover:brightness-110 disabled:opacity-40 disabled:cursor-not-allowed"
              style={{
                background: "#2563eb",
                border: "none",
                cursor: canProceed() ? "pointer" : "not-allowed",
                fontFamily: "inherit",
              }}
            >
              Continue
              <ChevronRight size={15} />
            </button>
          ) : (
            <button
              onClick={() => void handleFinish()}
              disabled={!canProceed() || submitting}
              className="flex items-center gap-1.5 rounded-lg px-6 py-2.5 text-sm font-semibold text-white transition hover:brightness-110 disabled:opacity-40 disabled:cursor-not-allowed"
              style={{
                background: submitting ? "#94a3b8" : "#2563eb",
                border: "none",
                cursor: canProceed() && !submitting ? "pointer" : "not-allowed",
                fontFamily: "inherit",
              }}
            >
              {submitting ? "Saving…" : "Build my plan"}
              {!submitting && <ChevronRight size={15} />}
            </button>
          )}
        </div>

        {visibleStepError && (
          <p className="text-xs mt-3" style={{ color: "#b91c1c" }}>
            {visibleStepError}
          </p>
        )}

        {submitError && (
          <div
            className="mt-3 rounded-lg px-3 py-2 text-xs"
            style={{
              background: "rgba(239,68,68,0.08)",
              border: "1px solid rgba(239,68,68,0.18)",
              color: "#b91c1c",
            }}
          >
            {submitError}
          </div>
        )}
          </>
        )}

        {/* Skip to dashboard link */}
        <p className="text-center text-xs mt-4" style={{ color: "#94a3b8" }}>
          <a
            href="/dashboard"
            style={{ color: "#94a3b8", textDecoration: "underline" }}
            onClick={() => {
              track(Events.ONBOARDING_SKIPPED, {
                step: ONBOARDING_STEPS[step],
                position: step + 1,
                total_steps: STEPS,
                source: onboardingSource,
              });
              try {
                sessionStorage.setItem("sp_onboarding_skipped", "1");
                // Session cookie too: the dashboard now decides onboarding
                // server-side, and the server can't read sessionStorage.
                document.cookie = "sp_onboarding_skipped=1; path=/; SameSite=Lax";
              } catch {
                /* ignore */
              }
            }}
          >
            Skip setup — go to dashboard
          </a>
        </p>
      </div>
    </div>
  );
}
