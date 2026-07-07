"use client";

import { useState, useMemo } from "react";
import Image from "next/image";
import Link from "next/link";
import type { Route } from "next";
import {
  type PayoffMethod,
  calculateDebtSnowball,
  calculateDebtAvalanche,
} from "@/lib/snowball";
import type { Debt } from "@/types";
import { formatMonths } from "@/lib/utils";
import type { ChartEntry } from "@/components/payoff/BalanceOverTimeChart";
import DebtTable from "./DebtTable";
import BudgetPanel from "./BudgetPanel";
import ResultsPanel from "./ResultsPanel";
import {
  defaultCalculatorConfig,
  type CalculatorConfig,
  type DebtRowSeed,
} from "./configs";
import { saveCalculatorDraft } from "@/lib/calculatorDraft";

const LOGIN_URL = "/auth/login?returnTo=/dashboard";
const SIGNUP_URL = `/auth/login?screen_hint=signup&returnTo=${encodeURIComponent("/onboarding?source=calculator")}`;

// ── Types ─────────────────────────────────────────────────────────────────────

export type DebtRow = {
  id: string;
  name: string;
  balance: string;
  rate: string;
  minimum: string;
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function cloneSeedRows(rows: DebtRowSeed[]): DebtRow[] {
  return rows.map((row) => ({ ...row }));
}

function newRow(): DebtRow {
  return {
    id: Date.now().toString(),
    name: "",
    balance: "",
    rate: "",
    minimum: "",
  };
}

function toDebt(
  row: DebtRow,
  index: number,
  category: Debt["category"],
): Debt | null {
  const balance = parseFloat(row.balance);
  if (!balance || balance <= 0) return null;
  return {
    id: row.id,
    userId: "",
    name: row.name.trim() || `Debt ${index + 1}`,
    category,
    balance,
    originalBalance: balance,
    interestRate: parseFloat(row.rate) || 0,
    minimumPayment: parseFloat(row.minimum) || 0,
    creditLimit: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

// ── FAQ Accordion ──────────────────────────────────────────────────────────────

function FAQAccordion({
  items,
}: {
  items: { question: string; answer: string }[];
}) {
  const [open, setOpen] = useState<number | null>(null);
  return (
    <div>
      {items.map((item, i) => (
        <div
          key={item.question}
          style={{ borderBottom: "1px solid rgba(15,23,42,0.08)" }}
        >
          <button
            onClick={() => setOpen(open === i ? null : i)}
            style={{
              width: "100%",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "18px 0",
              background: "none",
              border: "none",
              cursor: "pointer",
              textAlign: "left",
              gap: "16px",
            }}
          >
            <span
              style={{
                fontSize: "15px",
                fontWeight: 700,
                color: "#0f172a",
                lineHeight: 1.4,
              }}
            >
              {item.question}
            </span>
            <span
              style={{
                flexShrink: 0,
                width: "22px",
                height: "22px",
                borderRadius: "50%",
                background: open === i ? "#0f172a" : "rgba(15,23,42,0.07)",
                color: open === i ? "#ffffff" : "#64748b",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "15px",
                fontWeight: 700,
                transition: "background 0.15s, color 0.15s",
                lineHeight: 1,
              }}
            >
              {open === i ? "−" : "+"}
            </span>
          </button>
          {open === i && (
            <p
              style={{
                fontSize: "14px",
                color: "#475569",
                lineHeight: 1.75,
                paddingBottom: "20px",
                margin: 0,
              }}
            >
              {item.answer}
            </p>
          )}
        </div>
      ))}
    </div>
  );
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function PublicCalculator({
  config = defaultCalculatorConfig,
}: {
  config?: CalculatorConfig;
}) {
  const [debtRows, setDebtRows] = useState<DebtRow[]>(() =>
    cloneSeedRows(config.seedDebts),
  );
  const [takeHome, setTakeHome] = useState(config.defaultTakeHome);
  const [essential, setEssential] = useState(config.defaultEssential);
  const [extra, setExtra] = useState(config.defaultExtra);
  const [method, setMethod] = useState<PayoffMethod>(config.defaultMethod);

  // ── Derived state ──────────────────────────────────────────────────────────

  const validDebts = useMemo(
    () =>
      debtRows
        .map((r, i) => toDebt(r, i, config.debtCategory))
        .filter((d): d is Debt => d !== null),
    [config.debtCategory, debtRows],
  );

  const takeHomeNum = parseFloat(takeHome) || 0;
  const essentialNum = parseFloat(essential) || 0;
  const totalMinPayments = validDebts.reduce((s, d) => s + d.minimumPayment, 0);
  const availableForDebt = Math.max(
    0,
    takeHomeNum - essentialNum - totalMinPayments,
  );
  const extraNum = Math.min(parseFloat(extra) || 0, availableForDebt);

  const planResult = useMemo(() => {
    if (validDebts.length === 0 || takeHomeNum <= 0) return null;
    const calc =
      method === "avalanche" ? calculateDebtAvalanche : calculateDebtSnowball;
    const adjustedExtra = extraNum - availableForDebt;
    return calc(validDebts, takeHomeNum, essentialNum, 0, adjustedExtra);
  }, [
    validDebts,
    takeHomeNum,
    essentialNum,
    extraNum,
    availableForDebt,
    method,
  ]);

  const minimumsResult = useMemo(() => {
    if (validDebts.length === 0) return null;
    const totalMin = validDebts.reduce((s, d) => s + d.minimumPayment, 0);
    return calculateDebtSnowball(validDebts, totalMin, 0, 0, 0);
  }, [validDebts]);

  const balanceChartData = useMemo((): ChartEntry[] => {
    if (!planResult || !minimumsResult) return [];
    const projMap = new Map(
      planResult.monthlyBalances.map((mb) => [mb.date, mb.totalBalance]),
    );
    const minMap = new Map(
      minimumsResult.monthlyBalances.map((mb) => [mb.date, mb.totalBalance]),
    );
    const base =
      minimumsResult.months >= planResult.months
        ? minimumsResult.monthlyBalances
        : planResult.monthlyBalances;
    return base.map((mb) => ({
      date: mb.date,
      month: mb.month,
      totalBalance: projMap.get(mb.date),
      minimumsBalance: minMap.get(mb.date),
      actualBalance: undefined,
      avalancheBalance: undefined,
    }));
  }, [planResult, minimumsResult]);

  const effectiveAccel = planResult
    ? planResult.monthlyPayment - totalMinPayments
    : 0;
  const interestSaved =
    planResult && minimumsResult
      ? Math.max(
          0,
          minimumsResult.totalInterestPaid - planResult.totalInterestPaid,
        )
      : 0;
  const showMinimumsLine = effectiveAccel > 0;

  const timeStr = planResult ? formatMonths(planResult.months) : null;

  // ── Handlers ───────────────────────────────────────────────────────────────

  const updateRow = (id: string, field: keyof DebtRow, val: string) =>
    setDebtRows((prev) =>
      prev.map((r) => (r.id === id ? { ...r, [field]: val } : r)),
    );

  const removeRow = (id: string) =>
    setDebtRows((prev) => prev.filter((r) => r.id !== id));

  const loadExample = () => {
    setDebtRows(cloneSeedRows(config.seedDebts));
    setTakeHome(config.defaultTakeHome);
    setEssential(config.defaultEssential);
    setExtra(config.defaultExtra);
    setMethod(config.defaultMethod);
  };

  // Every debt with a balance, in table order — this is what survives the
  // signup round trip, so a 4-debt session stays a 4-debt plan.
  const calculatorState = {
    method,
    monthlyIncome: takeHome,
    essentialExpenses: essential,
    extraPayment: extra,
    debtCategory: config.debtCategory,
    debts: debtRows
      .filter((r) => (parseFloat(r.balance) || 0) > 0)
      .map((r, i) => ({
        name: r.name.trim() || `Debt ${i + 1}`,
        balance: r.balance,
        rate: r.rate,
        minimum: r.minimum,
      })),
  };

  // Signup CTAs outside the results panel must not discard the session:
  // stash whatever the user has entered before navigating to Auth0.
  const persistSessionForSignup = () => {
    if (calculatorState.debts.length === 0) return;
    saveCalculatorDraft(calculatorState);
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div
      className="min-h-screen text-txt"
      style={{
        background:
          "linear-gradient(180deg, #fbfdff 0%, #f4f7fb 46%, #eef3f8 100%)",
        color: "#0b1220",
      }}
    >
      {/* Nav */}
      <nav
        style={{
          borderBottom: "1px solid rgba(15,23,42,0.08)",
          background: "rgba(255,255,255,0.78)",
          backdropFilter: "blur(18px) saturate(140%)",
          WebkitBackdropFilter: "blur(18px) saturate(140%)",
          boxShadow: "0 18px 44px rgba(15,23,42,0.06)",
        }}
      >
        <div className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/">
            <Image
              src="/logo-dark.svg"
              alt="SnowballPay"
              width={148}
              height={28}
              priority
            />
          </Link>
          <div className="flex items-center gap-3">
            <a
              href={LOGIN_URL}
              className="hidden sm:block text-sm px-4 py-2 rounded-full"
              style={{
                color: "#536078",
                border: "1px solid rgba(15,23,42,0.11)",
                background: "rgba(255,255,255,0.72)",
                transition:
                  "transform 0.2s ease-out, border-color 0.2s ease-out",
              }}
            >
              Sign In
            </a>
            <a
              href={SIGNUP_URL}
              onClick={persistSessionForSignup}
              className="text-sm px-5 py-2 rounded-full font-semibold"
              style={{
                background: "#0b1220",
                color: "#fff",
                boxShadow:
                  "0 14px 32px rgba(15,23,42,0.22), inset 0 1px 0 rgba(255,255,255,0.16)",
                transition: "transform 0.2s ease-out, box-shadow 0.2s ease-out",
              }}
            >
              Get Started Free
            </a>
          </div>
        </div>
      </nav>

      <main className="max-w-6xl mx-auto px-6 py-14">
        {/* Hero */}
        <div className="text-center mb-12">
          <div className="lp-section-tag" style={{ marginBottom: "18px" }}>
            <span
              style={{
                width: 7,
                height: 7,
                borderRadius: "50%",
                background: "#2563eb",
              }}
            />
            Free calculator
          </div>
          <h1 className="text-4xl sm:text-5xl font-black mb-4 tracking-[-0.04em]">
            {config.heroTitle}
          </h1>
          <p
            className="text-base max-w-xl mx-auto"
            style={{ color: "#536078", lineHeight: 1.72 }}
          >
            {config.heroDescription}
          </p>
          <button
            onClick={loadExample}
            className="mt-5 text-sm px-4 py-2 rounded-full"
            style={{
              background: "rgba(255,255,255,0.78)",
              color: "#0b1220",
              border: "1px solid rgba(15,23,42,0.10)",
              boxShadow: "inset 0 1px 0 rgba(255,255,255,0.86)",
              cursor: "pointer",
              transition: "border-color 0.15s",
            }}
          >
            Load sample numbers
          </button>
          {/* Deferred-signup reassurance: tell repeat-intent users upfront
              that a save option comes at the end, so nobody hunts for one. */}
          <p className="mt-4 text-xs" style={{ color: "#8b96a9" }}>
            No account needed to calculate — you can save your plan at the end.
          </p>
        </div>

        {/* Calculator grid — the tool comes first */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
          {/* Left: Inputs */}
          <div className="space-y-5">
            <DebtTable
              rows={debtRows}
              onRowChange={updateRow}
              onRowRemove={removeRow}
              onRowAdd={() => setDebtRows((p) => [...p, newRow()])}
            />
            <BudgetPanel
              takeHome={takeHome}
              essential={essential}
              extra={extra}
              takeHomeNum={takeHomeNum}
              essentialNum={essentialNum}
              totalMinPayments={totalMinPayments}
              availableForDebt={availableForDebt}
              extraNum={extraNum}
              onTakeHomeChange={setTakeHome}
              onEssentialChange={setEssential}
              onExtraChange={setExtra}
            />

            {/* Strategy */}
            <div
              className="lp-calculator-shell"
              style={{ boxShadow: "0 18px 48px rgba(15,23,42,0.08)" }}
            >
              <div className="lp-calculator-core p-5">
                <h2 className="font-black text-base mb-3 tracking-[-0.02em]">
                  Payoff Strategy
                </h2>
                <div className="grid grid-cols-2 gap-2">
                  {(["snowball", "avalanche"] as const).map((m) => (
                    <button
                      key={m}
                      onClick={() => setMethod(m)}
                      className="p-3 rounded-2xl text-sm font-bold cursor-pointer"
                      style={{
                        border: `1px solid ${method === m ? "rgba(15,23,42,0.18)" : "rgba(15,23,42,0.08)"}`,
                        background: method === m ? "#0b1220" : "#f8fafc",
                        color: method === m ? "#ffffff" : "#344054",
                        boxShadow:
                          method === m
                            ? "0 16px 34px rgba(15,23,42,0.20), inset 0 1px 0 rgba(255,255,255,0.14)"
                            : "inset 0 1px 0 rgba(255,255,255,0.86)",
                        transition:
                          "background-color 0.15s, border-color 0.15s",
                      }}
                    >
                      {m === "snowball" ? "Snowball" : "Avalanche"}
                      <div
                        className="text-xs font-normal mt-0.5"
                        style={{
                          color:
                            method === m ? "rgba(255,255,255,0.72)" : "#667085",
                        }}
                      >
                        {m === "snowball"
                          ? "Smallest balance first"
                          : "Highest interest first"}
                      </div>
                    </button>
                  ))}
                </div>
                <p className="text-xs mt-3" style={{ color: "#667085" }}>
                  {method === "snowball"
                    ? "Snowball builds momentum: pay off the smallest debt first to stay motivated."
                    : "Avalanche minimizes total interest: attack the highest-rate debt first."}
                </p>
              </div>
            </div>
          </div>

          {/* Right: Results */}
          <ResultsPanel
            planResult={planResult}
            balanceChartData={balanceChartData}
            interestSaved={interestSaved}
            effectiveAccel={effectiveAccel}
            showMinimumsLine={showMinimumsLine}
            timeStr={timeStr}
            method={method}
            savePlanLabel={config.ctaLabel}
            savePlanHelperText={config.ctaHelperText}
            calculatorState={calculatorState}
          />
        </div>
      </main>

      {/* Below-fold: content, CTA, FAQ, related */}
      <div
        style={{
          background: "#ffffff",
          borderTop: "1px solid rgba(15,23,42,0.07)",
        }}
      >
        {/* Explainer sections */}
        <section className="max-w-3xl mx-auto px-6 py-16">
          <div style={{ marginBottom: "36px" }}>
            <p
              style={{
                fontSize: "11px",
                fontWeight: 800,
                letterSpacing: "0.13em",
                textTransform: "uppercase",
                color: "#94a3b8",
                marginBottom: "8px",
              }}
            >
              How it works
            </p>
            <h2
              style={{
                fontSize: "clamp(1.4rem, 3vw, 1.9rem)",
                fontWeight: 900,
                letterSpacing: "-0.035em",
                color: "#0f172a",
                lineHeight: 1.15,
                margin: 0,
              }}
            >
              {config.contentIntroTitle}
            </h2>
          </div>

          <div>
            {config.contentSections.map((section, i) => (
              <div
                key={section.title}
                style={{
                  display: "grid",
                  gridTemplateColumns: "minmax(160px, 1fr) 1.8fr",
                  gap: "28px 40px",
                  alignItems: "start",
                  padding: "24px 0",
                  borderBottom:
                    i < config.contentSections.length - 1
                      ? "1px solid rgba(15,23,42,0.07)"
                      : "none",
                }}
              >
                <h3
                  style={{
                    fontSize: "13px",
                    fontWeight: 800,
                    color: "#0f172a",
                    lineHeight: 1.45,
                    margin: 0,
                  }}
                >
                  {section.title}
                </h3>
                <p
                  style={{
                    fontSize: "14px",
                    color: "#475569",
                    lineHeight: 1.75,
                    margin: 0,
                  }}
                  dangerouslySetInnerHTML={{ __html: section.body }}
                />
              </div>
            ))}
          </div>
        </section>

        {/* Mid-page CTA strip */}
        <div
          style={{
            borderTop: "1px solid rgba(15,23,42,0.07)",
            borderBottom: "1px solid rgba(15,23,42,0.07)",
            background: "#f8fafc",
          }}
        >
          <div
            className="max-w-3xl mx-auto px-6 py-10"
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: "24px",
              flexWrap: "wrap",
            }}
          >
            <div>
              <p
                style={{
                  fontSize: "16px",
                  fontWeight: 800,
                  color: "#0f172a",
                  letterSpacing: "-0.02em",
                  marginBottom: "4px",
                }}
              >
                Ready to track real progress?
              </p>
              <p style={{ fontSize: "13px", color: "#64748b", margin: 0 }}>
                Save your plan, log payments monthly, and watch your debt-free
                date get closer. Free account — no card required.
              </p>
            </div>
            <a
              href={SIGNUP_URL}
              onClick={persistSessionForSignup}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                padding: "11px 22px",
                borderRadius: "8px",
                background: "#2563eb",
                color: "#ffffff",
                fontSize: "14px",
                fontWeight: 700,
                textDecoration: "none",
                whiteSpace: "nowrap",
                flexShrink: 0,
              }}
            >
              Create Free Account →
            </a>
          </div>
        </div>

        {/* FAQ accordion */}
        <section className="max-w-3xl mx-auto px-6 py-16">
          <div style={{ marginBottom: "28px" }}>
            <p
              style={{
                fontSize: "11px",
                fontWeight: 800,
                letterSpacing: "0.13em",
                textTransform: "uppercase",
                color: "#94a3b8",
                marginBottom: "8px",
              }}
            >
              Common questions
            </p>
            <h2
              style={{
                fontSize: "clamp(1.4rem, 3vw, 1.9rem)",
                fontWeight: 900,
                letterSpacing: "-0.035em",
                color: "#0f172a",
                lineHeight: 1.15,
                margin: 0,
              }}
            >
              Frequently asked questions
            </h2>
          </div>
          <FAQAccordion items={config.faqItems} />
        </section>

        {/* Related calculators */}
        <div
          style={{
            borderTop: "1px solid rgba(15,23,42,0.07)",
            background: "#f8fafc",
          }}
        >
          <div className="max-w-3xl mx-auto px-6 py-14">
            <p
              style={{
                fontSize: "11px",
                fontWeight: 800,
                letterSpacing: "0.13em",
                textTransform: "uppercase",
                color: "#94a3b8",
                marginBottom: "8px",
              }}
            >
              More tools
            </p>
            <h2
              style={{
                fontSize: "clamp(1.4rem, 3vw, 1.9rem)",
                fontWeight: 900,
                letterSpacing: "-0.035em",
                color: "#0f172a",
                lineHeight: 1.15,
                marginBottom: "20px",
              }}
            >
              Related calculators
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {config.relatedCalculators.map((calc) => (
                <Link
                  key={calc.slug}
                  href={`/calculators/${calc.slug}` as Route}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "14px 18px",
                    borderRadius: "12px",
                    background: "#ffffff",
                    border: "1px solid rgba(15,23,42,0.08)",
                    textDecoration: "none",
                    transition: "border-color 0.15s",
                  }}
                >
                  <span
                    style={{
                      fontSize: "14px",
                      fontWeight: 700,
                      color: "#0f172a",
                    }}
                  >
                    {calc.title}
                  </span>
                  <span style={{ fontSize: "14px", color: "#94a3b8" }}>→</span>
                </Link>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <footer
          style={{
            borderTop: "1px solid rgba(15,23,42,0.07)",
            padding: "20px 24px",
            textAlign: "center",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              gap: "24px",
              fontSize: "13px",
            }}
          >
            {[
              { href: "/" as const satisfies Route, label: "Home" },
              { href: "/privacy" as const satisfies Route, label: "Privacy" },
              { href: "/terms" as const satisfies Route, label: "Terms" },
            ].map((link) => (
              <Link
                key={link.href}
                href={link.href}
                style={{ color: "#94a3b8", textDecoration: "none" }}
              >
                {link.label}
              </Link>
            ))}
          </div>
        </footer>
      </div>
    </div>
  );
}
