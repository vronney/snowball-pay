"use client";

import { useState } from "react";
import { Calculator, ArrowRight } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import BalanceOverTimeChart, {
  type ChartEntry,
} from "@/components/payoff/BalanceOverTimeChart";
import type { PayoffResult } from "@/lib/snowball";
import SavePlanModal from "./SavePlanModal";
import { track, Events } from "@/lib/analytics";

interface OnboardingPrefill {
  method: string;
  monthlyIncome: string;
  essentialExpenses: string;
  extraPayment: string;
  debtName: string;
  debtBalance: string;
  debtApr: string;
  debtMin: string;
  debtCategory: string;
}

interface ResultsPanelProps {
  planResult: PayoffResult | null;
  balanceChartData: ChartEntry[];
  interestSaved: number;
  effectiveAccel: number;
  showMinimumsLine: boolean;
  timeStr: string | null;
  savePlanLabel?: string;
  savePlanHelperText?: string;
  onboardingPrefill?: OnboardingPrefill;
}

export default function ResultsPanel({
  planResult,
  balanceChartData,
  interestSaved,
  effectiveAccel,
  showMinimumsLine,
  timeStr,
  savePlanLabel = "Save My Plan - It\'s Free",
  savePlanHelperText = "No credit card - Takes 30 seconds",
  onboardingPrefill,
}: ResultsPanelProps) {
  const [modalOpen, setModalOpen] = useState(false);

  if (!planResult) {
    return (
      <div
        className="rounded-2xl p-10 text-center"
        style={{
          background: "#ffffff",
          border: "1px solid rgba(15,23,42,0.08)",
          boxShadow: "0 1px 4px rgba(15,23,42,0.06)",
          color: "#64748b",
        }}
      >
        <Calculator
          size={44}
          className="mx-auto mb-3"
          style={{ opacity: 0.4 }}
        />
        <p className="text-sm">
          Fill in your debts and income to see your payoff plan.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Primary stat */}
      <div
        className="rounded-2xl p-5"
        style={{
          background: "#ffffff",
          border: "1px solid rgba(15,23,42,0.08)",
          boxShadow: "0 1px 4px rgba(15,23,42,0.06)",
        }}
      >
        <div
          className="text-center mb-5 pb-5"
          style={{ borderBottom: "1px solid rgba(15,23,42,0.08)" }}
        >
          <div className="text-xs mb-1" style={{ color: "#64748b" }}>
            Debt-Free In
          </div>
          <div className="text-5xl font-bold mb-1" style={{ color: "#3b82f6" }}>
            {timeStr}
          </div>
          <div className="text-sm" style={{ color: "#64748b" }}>
            Est.&nbsp;
            {planResult.debtFreeDate.toLocaleDateString("en-US", {
              month: "long",
              year: "numeric",
            })}
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div
            className="text-center p-3 rounded-xl"
            style={{
              background: "#f8fafc",
              border: "1px solid rgba(15,23,42,0.08)",
            }}
          >
            <div className="text-xs mb-1" style={{ color: "#64748b" }}>
              Total Interest
            </div>
            <div className="font-semibold text-sm" style={{ color: "#f59e0b" }}>
              {formatCurrency(planResult.totalInterestPaid)}
            </div>
          </div>
          <div
            className="text-center p-3 rounded-xl"
            style={{
              background: "#f8fafc",
              border: "1px solid rgba(15,23,42,0.08)",
            }}
          >
            <div className="text-xs mb-1" style={{ color: "#64748b" }}>
              vs Minimums
            </div>
            <div className="font-semibold text-sm" style={{ color: "#22c55e" }}>
              {interestSaved > 0 ? `−${formatCurrency(interestSaved)}` : "—"}
            </div>
          </div>
          <div
            className="text-center p-3 rounded-xl"
            style={{
              background: "#f8fafc",
              border: "1px solid rgba(15,23,42,0.08)",
            }}
          >
            <div className="text-xs mb-1" style={{ color: "#64748b" }}>
              Monthly Pmt
            </div>
            <div className="font-semibold text-sm">
              {formatCurrency(planResult.monthlyPayment)}
            </div>
          </div>
        </div>

        {/* Inline CTA — capture while dopamine is high */}
        <button
          onClick={() => {
            track(Events.CALCULATOR_USED, { months: planResult.months });
            setModalOpen(true);
          }}
          className="w-full mt-4 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold transition"
          style={{
            background: "#3b82f6",
            color: "#fff",
            border: "none",
            cursor: "pointer",
          }}
        >
          {savePlanLabel}
          <ArrowRight size={14} />
        </button>
        <p className="text-xs text-center mt-1.5" style={{ color: "#94a3b8" }}>
          {savePlanHelperText}
        </p>
      </div>

      {/* Chart */}
      <BalanceOverTimeChart
        data={balanceChartData}
        effectiveAcceleration={effectiveAccel}
        showMinimumsLine={showMinimumsLine}
        hasRealSnapshots={false}
      />

      {/* Payoff order */}
      <div
        className="rounded-2xl p-5"
        style={{
          background: "#ffffff",
          border: "1px solid rgba(15,23,42,0.08)",
          boxShadow: "0 1px 4px rgba(15,23,42,0.06)",
        }}
      >
        <h2 className="font-semibold text-base mb-3">Payoff Order</h2>
        <div className="space-y-2">
          {planResult.payoffSchedule.map((item) => (
            <div
              key={item.debtId}
              className="flex items-center justify-between"
            >
              <div className="flex items-center gap-2">
                <span
                  className="w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                  style={{
                    background: "rgba(59,130,246,0.18)",
                    color: "#2563eb",
                  }}
                >
                  {item.orderInPayoff}
                </span>
                <span className="text-sm">{item.debtName}</span>
              </div>
              <span className="text-xs" style={{ color: "#64748b" }}>
                Month {item.monthPaidOff} · {formatCurrency(item.interestPaid)}{" "}
                interest
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* CTA */}
      <div
        className="rounded-2xl p-6 text-center"
        style={{
          background:
            "linear-gradient(135deg, rgba(59,130,246,0.12), rgba(29,78,216,0.08))",
          border: "1px solid rgba(59,130,246,0.25)",
        }}
      >
        <div className="text-lg font-semibold mb-1">
          Ready to follow your plan?
        </div>
        <p className="text-sm mb-5" style={{ color: "#475569" }}>
          Create a free account to track payments, log your actual balance each
          month, and watch your real progress vs the plan.
        </p>
        <button
          onClick={() => {
            track(Events.CALCULATOR_USED, { months: planResult.months });
            setModalOpen(true);
          }}
          className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold transition"
          style={{
            background: "#3b82f6",
            color: "#fff",
            border: "none",
            cursor: "pointer",
          }}
        >
          {savePlanLabel}
          <ArrowRight size={15} />
        </button>
      </div>

      {modalOpen && (
        <SavePlanModal
          onClose={() => setModalOpen(false)}
          debtFreeDate={planResult.debtFreeDate.toLocaleDateString("en-US", {
            month: "long",
            year: "numeric",
          })}
          interestSaved={Math.round(interestSaved)}
          onboardingPrefill={onboardingPrefill}
        />
      )}
    </div>
  );
}
