"use client";

import { useState, useMemo } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  type PayoffMethod,
  calculateDebtSnowball,
  calculateDebtAvalanche,
} from "@/lib/snowball";
import type { Debt } from "@/types";
import type { ChartEntry } from "@/components/payoff/BalanceOverTimeChart";
import DebtTable from "./DebtTable";
import BudgetPanel from "./BudgetPanel";
import ResultsPanel from "./ResultsPanel";
import {
  defaultCalculatorConfig,
  type CalculatorConfig,
  type DebtRowSeed,
} from "./configs";

const LOGIN_URL = "/auth/login?returnTo=/dashboard";

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

  const years = planResult ? Math.floor(planResult.months / 12) : 0;
  const months = planResult ? planResult.months % 12 : 0;
  const timeStr = planResult
    ? years > 0
      ? `${years}y ${months}m`
      : `${months}m`
    : null;

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
                  "transform 0.44s cubic-bezier(0.32,0.72,0,1), border-color 0.44s cubic-bezier(0.32,0.72,0,1)",
              }}
            >
              Sign In
            </a>
            <a
              href={LOGIN_URL}
              className="text-sm px-5 py-2 rounded-full font-semibold"
              style={{
                background: "#0b1220",
                color: "#fff",
                boxShadow:
                  "0 14px 32px rgba(15,23,42,0.22), inset 0 1px 0 rgba(255,255,255,0.16)",
                transition:
                  "transform 0.44s cubic-bezier(0.32,0.72,0,1), box-shadow 0.44s cubic-bezier(0.32,0.72,0,1)",
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
            <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#2563eb" }} />
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
              transition:
                "transform 0.44s cubic-bezier(0.32,0.72,0,1), border-color 0.44s cubic-bezier(0.32,0.72,0,1)",
            }}
          >
            Load sample numbers
          </button>
        </div>

        {/* SEO Intro Section */}
        <section className="max-w-3xl mx-auto mb-12 lp-calculator-shell">
          <div className="lp-calculator-core p-6">
            <h2 className="text-2xl font-black mb-3 tracking-[-0.03em]">{config.introTitle}</h2>
            <p className="text-base leading-relaxed" style={{ color: "#536078" }}>
              {config.introBody}
            </p>
          </div>
        </section>

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
              style={{
                boxShadow: "0 18px 48px rgba(15,23,42,0.08)",
              }}
            >
              <div className="lp-calculator-core p-5">
              <h2 className="font-black text-base mb-3 tracking-[-0.02em]">Payoff Strategy</h2>
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
                        "transform 0.44s cubic-bezier(0.32,0.72,0,1), background-color 0.44s cubic-bezier(0.32,0.72,0,1), border-color 0.44s cubic-bezier(0.32,0.72,0,1)",
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
            savePlanLabel={config.ctaLabel}
            savePlanHelperText={config.ctaHelperText}
            onboardingPrefill={{
              method,
              monthlyIncome: takeHome,
              essentialExpenses: essential,
              extraPayment: extra,
              debtName:
                debtRows[0]?.name ||
                config.seedDebts[0]?.name ||
                config.debtCategory,
              debtBalance:
                debtRows[0]?.balance || config.seedDebts[0]?.balance || "",
              debtApr: debtRows[0]?.rate || config.seedDebts[0]?.rate || "",
              debtMin:
                debtRows[0]?.minimum || config.seedDebts[0]?.minimum || "",
              debtCategory: config.debtCategory,
            }}
          />
        </div>
      </main>

      {/* SEO content — static, crawlable */}
      <section className="max-w-3xl mx-auto px-6 py-20">
        <h2 className="text-2xl font-black mb-2 text-center tracking-[-0.03em]">
          {config.contentIntroTitle}
        </h2>
        <p className="text-center text-sm mb-12" style={{ color: "#536078" }}>
          {config.contentIntroBody}
        </p>

        <div className="space-y-8">
          {config.contentSections.map((section) => (
            <div key={section.title}>
              <h3 className="text-lg font-black mb-2 tracking-[-0.02em]">{section.title}</h3>
              <p
                className="text-sm leading-relaxed"
                style={{ color: "#536078" }}
                dangerouslySetInnerHTML={{ __html: section.body }}
              />
            </div>
          ))}
        </div>
      </section>

      {/* FAQ Section */}
      <section className="max-w-3xl mx-auto px-6 py-20">
        <h2 className="text-2xl font-black mb-8 text-center tracking-[-0.03em]">Frequently Asked Questions</h2>
        <div className="space-y-6">
          {config.faqItems.map((item) => (
            <div
              key={item.question}
              className="rounded-2xl p-5"
              style={{
                background: "rgba(255,255,255,0.88)",
                border: "1px solid rgba(15,23,42,0.08)",
                boxShadow: "0 16px 42px rgba(15,23,42,0.06), inset 0 1px 0 rgba(255,255,255,0.84)",
              }}
            >
              <h3 className="font-black text-base mb-2" style={{ color: "#0b1220" }}>
                {item.question}
              </h3>
              <p className="text-sm leading-relaxed" style={{ color: "#536078" }}>
                {item.answer}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Related Calculators */}
      <section className="max-w-3xl mx-auto px-6 py-20">
        <h2 className="text-2xl font-black mb-8 text-center tracking-[-0.03em]">Related Calculators</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {config.relatedCalculators.map((calc) => (
            <Link
              key={calc.slug}
              href={`/calculators/${calc.slug}`}
              className="p-5 rounded-2xl"
              style={{
                background: "rgba(255,255,255,0.88)",
                border: "1px solid rgba(15,23,42,0.08)",
                boxShadow: "0 16px 42px rgba(15,23,42,0.06), inset 0 1px 0 rgba(255,255,255,0.84)",
                textDecoration: "none",
                color: "#0b1220",
                transition:
                  "transform 0.44s cubic-bezier(0.32,0.72,0,1), border-color 0.44s cubic-bezier(0.32,0.72,0,1)",
              }}
            >
              <p className="font-black tracking-[-0.02em]">{calc.title}</p>
              <p className="text-sm mt-1" style={{ color: "#536078" }}>
                Calculate your {calc.title.toLowerCase()} &gt;
              </p>
            </Link>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer
        className="mt-16 pb-10 text-center text-xs"
        style={{ color: "#94a3b8" }}
      >
        <Link
          href="/"
          className="hover:opacity-60 transition mr-4"
          style={{ color: "inherit" }}
        >
          Home
        </Link>
        <Link
          href="/privacy"
          className="hover:opacity-60 transition mr-4"
          style={{ color: "inherit" }}
        >
          Privacy
        </Link>
        <Link
          href="/terms"
          className="hover:opacity-60 transition"
          style={{ color: "inherit" }}
        >
          Terms
        </Link>
      </footer>
    </div>
  );
}
