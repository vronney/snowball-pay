"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSaveIncome, useCreateDebt } from "@/lib/hooks";
import { formatCurrency } from "@/lib/utils";
import { ChevronRight, ChevronLeft, Check, DollarSign } from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

type Goal = "faster" | "interest" | "simplify" | "plan";
type Strategy = "snowball" | "avalanche" | "custom";

interface StepState {
  goal: Goal | null;
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
  goal: null,
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
    <div className="flex items-center gap-2 justify-center mb-8">
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

// ─── Step 1 — Goals ──────────────────────────────────────────────────────────

const GOALS: { id: Goal; label: string; desc: string; emoji: string }[] = [
  { id: "faster",   label: "Pay off debt faster",       desc: "Use extra payments strategically.", emoji: "⚡" },
  { id: "interest", label: "Lower interest paid",       desc: "Focus on high-rate debts first.",   emoji: "📉" },
  { id: "simplify", label: "Simplify monthly payments", desc: "One clear plan each month.",         emoji: "🗂" },
  { id: "plan",     label: "Build a realistic plan",    desc: "See your debt-free date.",           emoji: "📅" },
];

function StepGoals({ state, onChange }: { state: StepState; onChange: (g: Goal) => void }) {
  return (
    <div>
      <h2 className="text-2xl font-bold mb-1" style={{ color: "#111827" }}>
        What&apos;s your primary goal?
      </h2>
      <p className="text-sm mb-6" style={{ color: "#6B7280" }}>
        Choose one — you can always change this later.
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {GOALS.map((g) => {
          const active = state.goal === g.id;
          return (
            <button
              key={g.id}
              onClick={() => onChange(g.id)}
              className="text-left rounded-xl p-4 transition-all"
              style={{
                background: active ? "rgba(37,99,235,0.07)" : "#ffffff",
                border: active ? "2px solid #2563eb" : "2px solid rgba(15,23,42,0.1)",
                cursor: "pointer",
                fontFamily: "inherit",
              }}
            >
              <span style={{ fontSize: 22 }}>{g.emoji}</span>
              <p className="font-semibold text-sm mt-2" style={{ color: "#111827" }}>
                {g.label}
              </p>
              <p className="text-xs mt-0.5" style={{ color: "#6B7280" }}>
                {g.desc}
              </p>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─── Step 2 — Monthly budget ──────────────────────────────────────────────────

function NumberInput({
  label,
  value,
  onChange,
  hint,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  hint?: string;
}) {
  return (
    <div className="space-y-1">
      <label className="text-xs font-semibold" style={{ color: "#374151" }}>
        {label}
      </label>
      <div
        className="flex items-center rounded-xl border overflow-hidden"
        style={{ borderColor: "rgba(15,23,42,0.15)", background: "#ffffff" }}
      >
        <span
          className="px-3 py-3 text-sm font-semibold"
          style={{ color: "#94a3b8", background: "#F8FAFC", borderRight: "1px solid rgba(15,23,42,0.1)" }}
        >
          $
        </span>
        <input
          type="number"
          min="0"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="0"
          className="flex-1 px-3 py-3 text-sm outline-none"
          style={{ fontFamily: "inherit", color: "#111827", background: "transparent" }}
        />
      </div>
      {hint && <p className="text-xs" style={{ color: "#94a3b8" }}>{hint}</p>}
    </div>
  );
}

function StepBudget({
  state,
  onField,
}: {
  state: StepState;
  onField: (k: keyof StepState, v: string) => void;
}) {
  const income = parseFloat(state.monthlyIncome) || 0;
  const essential = parseFloat(state.essentialExpenses) || 0;
  const extra = parseFloat(state.extraPayment) || 0;
  const available = Math.max(0, income - essential - extra);

  return (
    <div>
      <h2 className="text-2xl font-bold mb-1" style={{ color: "#111827" }}>
        Your monthly capacity
      </h2>
      <p className="text-sm mb-6" style={{ color: "#6B7280" }}>
        This helps us build a payoff plan that fits your budget.
      </p>
      <div className="space-y-4">
        <NumberInput label="Monthly take-home pay" value={state.monthlyIncome} onChange={(v) => onField("monthlyIncome", v)} />
        <NumberInput label="Essential monthly expenses" value={state.essentialExpenses} onChange={(v) => onField("essentialExpenses", v)} hint="Rent, utilities, groceries, insurance…" />
        <NumberInput label="Extra payment budget (optional)" value={state.extraPayment} onChange={(v) => onField("extraPayment", v)} hint="Any extra amount you can put toward debt." />
      </div>
      {income > 0 && (
        <div
          className="mt-4 rounded-xl px-4 py-3 flex items-center gap-3"
          style={{ background: "rgba(37,99,235,0.06)", border: "1px solid rgba(37,99,235,0.14)" }}
        >
          <DollarSign size={16} style={{ color: "#2563eb", flexShrink: 0 }} />
          <span className="text-sm" style={{ color: "#374151" }}>
            Available for debt payoff:{" "}
            <strong style={{ color: "#2563eb" }}>{formatCurrency(available + extra)}</strong>
            /mo
          </span>
        </div>
      )}
    </div>
  );
}

// ─── Step 3 — Strategy ───────────────────────────────────────────────────────

const STRATEGIES: { id: Strategy; label: string; desc: string; emoji: string }[] = [
  { id: "snowball",  label: "Snowball",  emoji: "⛄", desc: "Pay smallest balance first. Build momentum with quick wins." },
  { id: "avalanche", label: "Avalanche", emoji: "🏔",  desc: "Pay highest APR first. Minimize total interest paid." },
  { id: "custom",    label: "Custom",    emoji: "✏️",  desc: "Drag and drop to set your own priority order." },
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
                border: active ? "2px solid #2563eb" : "2px solid rgba(15,23,42,0.1)",
                cursor: "pointer",
                fontFamily: "inherit",
              }}
            >
              <span style={{ fontSize: 28, lineHeight: 1 }}>{s.emoji}</span>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm" style={{ color: "#111827" }}>
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

// ─── Step 4 — First debt ─────────────────────────────────────────────────────

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
}: {
  state: StepState;
  onField: (k: keyof StepState, v: string) => void;
}) {
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
            className="w-full rounded-xl border px-3 py-3 text-sm outline-none"
            style={{
              borderColor: "rgba(15,23,42,0.15)",
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
            className="w-full rounded-xl border px-3 py-3 text-sm outline-none"
            style={{
              borderColor: "rgba(15,23,42,0.15)",
              fontFamily: "inherit",
              color: "#111827",
              background: "#ffffff",
            }}
          >
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <NumberInput label="Current balance" value={state.debtBalance} onChange={(v) => onField("debtBalance", v)} />
          <NumberInput label="APR (%)" value={state.debtApr} onChange={(v) => onField("debtApr", v)} />
          <NumberInput label="Minimum payment" value={state.debtMin} onChange={(v) => onField("debtMin", v)} />
        </div>
      </div>
    </div>
  );
}

// ─── Wizard shell ─────────────────────────────────────────────────────────────

const STEPS = 4;

export function OnboardingWizard() {
  const router = useRouter();
  const saveIncome = useSaveIncome();
  const createDebt = useCreateDebt();

  const [step, setStep] = useState(0);
  const [state, setState] = useState<StepState>(INITIAL_STATE);
  const [submitting, setSubmitting] = useState(false);

  function onField(k: keyof StepState, v: string) {
    setState((s) => ({ ...s, [k]: v }));
  }

  function canProceed() {
    if (step === 0) return state.goal !== null;
    if (step === 1) return parseFloat(state.monthlyIncome) > 0;
    if (step === 2) return true; // strategy always has a default
    if (step === 3) {
      return (
        state.debtName.trim().length > 0 &&
        parseFloat(state.debtBalance) > 0 &&
        parseFloat(state.debtApr) >= 0 &&
        parseFloat(state.debtMin) >= 0
      );
    }
    return true;
  }

  async function handleFinish() {
    setSubmitting(true);
    try {
      await saveIncome.mutateAsync({
        monthlyTakeHome: parseFloat(state.monthlyIncome) || 0,
        essentialExpenses: parseFloat(state.essentialExpenses) || 0,
        extraPayment: parseFloat(state.extraPayment) || 0,
        payoffMethod: state.strategy,
      });
      await createDebt.mutateAsync({
        name: state.debtName.trim(),
        category: state.debtCategory as "Credit Card",
        balance: parseFloat(state.debtBalance) || 0,
        originalBalance: parseFloat(state.debtBalance) || 0,
        interestRate: parseFloat(state.debtApr) || 0,
        minimumPayment: parseFloat(state.debtMin) || 0,
        creditLimit: 0,
      });
      router.push("/dashboard");
    } catch {
      setSubmitting(false);
    }
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4"
      style={{ background: "#F8FAFC" }}
    >
      <div
        className="w-full max-w-lg rounded-2xl p-8"
        style={{
          background: "#ffffff",
          boxShadow: "0 8px 24px rgba(17,24,39,0.08)",
          border: "1px solid rgba(15,23,42,0.08)",
        }}
      >
        {/* Logo link */}
        <div className="text-center mb-6">
          <a href="/" className="text-lg font-bold" style={{ color: "#2563eb", textDecoration: "none" }}>
            SnowballPay
          </a>
        </div>

        <StepIndicator current={step} total={STEPS} />

        {/* Step content */}
        <div className="tab-fade-in">
          {step === 0 && (
            <StepGoals state={state} onChange={(g) => setState((s) => ({ ...s, goal: g }))} />
          )}
          {step === 1 && <StepBudget state={state} onField={onField} />}
          {step === 2 && (
            <StepStrategy state={state} onChange={(s) => setState((st) => ({ ...st, strategy: s }))} />
          )}
          {step === 3 && <StepFirstDebt state={state} onField={onField} />}
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between mt-8 gap-3">
          {step > 0 ? (
            <button
              onClick={() => setStep((s) => s - 1)}
              className="flex items-center gap-1.5 rounded-xl px-4 py-2.5 text-sm font-medium transition hover:bg-slate-50"
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
              onClick={() => setStep((s) => s + 1)}
              disabled={!canProceed()}
              className="flex items-center gap-1.5 rounded-xl px-6 py-2.5 text-sm font-semibold text-white transition hover:brightness-110 disabled:opacity-40 disabled:cursor-not-allowed"
              style={{
                background: "linear-gradient(135deg, #2563eb, #3b82f6)",
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
              className="flex items-center gap-1.5 rounded-xl px-6 py-2.5 text-sm font-semibold text-white transition hover:brightness-110 disabled:opacity-40 disabled:cursor-not-allowed"
              style={{
                background: submitting ? "#94a3b8" : "linear-gradient(135deg, #27AE60, #2ecc71)",
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

        {/* Skip to dashboard link */}
        <p className="text-center text-xs mt-4" style={{ color: "#94a3b8" }}>
          <a href="/dashboard" style={{ color: "#94a3b8", textDecoration: "underline" }}>
            Skip setup — go to dashboard
          </a>
        </p>
      </div>
    </div>
  );
}
