"use client";

import { useMemo, useState } from "react";
import { BalanceSnapshot, Debt, Expense, Income } from "@/types";
import { type Tab } from "@/components/dashboard/types";
import { useAllSnapshots } from "@/lib/hooks";
import { formatCurrency } from "@/lib/utils";
import {
  BadgeCheck,
  BadgeDollarSign,
  Calendar,
  CheckCircle2,
  ChevronRight,
  Flame,
  Percent,
  Target,
  TrendingDown,
  TrendingUp,
  Trophy,
  Zap,
  type LucideIcon,
} from "lucide-react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Skeleton } from "@/components/ui/skeleton";
import DataInsights from "@/components/progress/DataInsights";

interface ProgressTabProps {
  debts: Debt[];
  income: Income | null | undefined;
  expenses: Expense[];
  isLoading: boolean;
  onNavigate: (tab: Tab) => void;
}

function StatCard({
  label,
  value,
  sub,
  color,
}: {
  label: string;
  value: string;
  sub?: string;
  color?: string;
}) {
  return (
    <div
      className="rounded-xl p-4 flex flex-col gap-1"
      style={{ background: "#ffffff", border: "1px solid rgba(15,23,42,0.08)" }}
    >
      <span className="text-xs" style={{ color: "#6B7280" }}>
        {label}
      </span>
      <span
        className="mono font-bold text-xl"
        style={{ color: color ?? "#111827" }}
      >
        {value}
      </span>
      {sub && (
        <span className="text-xs" style={{ color: "#94a3b8" }}>
          {sub}
        </span>
      )}
    </div>
  );
}

interface ChartPoint {
  month: string;
  balance: number;
  paid: number;
}

function buildChartData(snapshots: BalanceSnapshot[]): ChartPoint[] {
  const byMonth = new Map<string, number>();

  for (const snapshot of snapshots) {
    const key = snapshot.recordedAt.slice(0, 7);
    byMonth.set(key, (byMonth.get(key) ?? 0) + snapshot.balance);
  }

  const sorted = Array.from(byMonth.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, balance]) => ({
      month: new Date(`${key}-01`).toLocaleDateString("en-US", {
        month: "short",
        year: "2-digit",
      }),
      balance,
      paid: 0,
    }));

  const startBalance = sorted[0]?.balance ?? 0;
  return sorted.map((point) => ({
    ...point,
    paid: Math.max(0, startBalance - point.balance),
  }));
}

function currencyTick(value: number) {
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `$${(value / 1_000).toFixed(0)}k`;
  return `$${value}`;
}

interface TooltipPayload {
  value: number;
}

function ChartTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: TooltipPayload[];
  label?: string;
}) {
  if (!active || !payload?.length) return null;

  return (
    <div
      className="rounded-xl px-3 py-2 text-sm"
      style={{
        background: "#ffffff",
        border: "1px solid rgba(15,23,42,0.1)",
        boxShadow: "0 4px 16px rgba(17,24,39,0.1)",
      }}
    >
      <p style={{ color: "#6B7280", marginBottom: 2 }}>{label}</p>
      <p className="font-semibold mono" style={{ color: "#111827" }}>
        {formatCurrency(payload[0].value)}
      </p>
    </div>
  );
}

function MilestoneRow({
  icon: Icon,
  label,
  achieved,
}: {
  icon: LucideIcon;
  label: string;
  achieved: boolean;
}) {
  return (
    <div
      className="flex items-center gap-3 rounded-xl px-4 py-3"
      style={{
        background: achieved ? "rgba(39,174,96,0.07)" : "rgba(15,23,42,0.03)",
        border: achieved
          ? "1px solid rgba(39,174,96,0.18)"
          : "1px solid rgba(15,23,42,0.07)",
        opacity: achieved ? 1 : 0.55,
      }}
    >
      <span
        className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg"
        style={{
          background: achieved
            ? "rgba(39,174,96,0.10)"
            : "rgba(15,23,42,0.04)",
          color: achieved ? "#27AE60" : "#94a3b8",
        }}
      >
        <Icon size={16} />
      </span>
      <span
        className="text-sm flex-1"
        style={{
          color: achieved ? "#111827" : "#6B7280",
          fontWeight: achieved ? 600 : 400,
        }}
      >
        {label}
      </span>
      {achieved && (
        <CheckCircle2 size={16} style={{ color: "#27AE60", flexShrink: 0 }} />
      )}
    </div>
  );
}

export default function ProgressTab({
  debts,
  income,
  expenses,
  isLoading,
  onNavigate,
}: ProgressTabProps) {
  const { data: snapshotData, isLoading: snapsLoading } = useAllSnapshots();
  const snapshots = useMemo(
    () => snapshotData?.snapshots ?? [],
    [snapshotData],
  );

  const chartData = useMemo(() => buildChartData(snapshots), [snapshots]);
  const [chartView, setChartView] = useState<"balance" | "paid">("balance");

  const yDomain = useMemo((): [number, number] | [number, string] => {
    if (chartView === "paid" || chartData.length === 0) return [0, "auto"];

    const balances = chartData.map((point) => point.balance);
    const lo = Math.min(...balances);
    const hi = Math.max(...balances);
    const spread = hi - lo;
    const halfRange = Math.max(spread * 2, hi * 0.025);
    const center = (lo + hi) / 2;
    const domainMin = Math.max(
      0,
      Math.floor((center - halfRange) / 1000) * 1000,
    );
    const domainMax = Math.ceil((center + halfRange) / 1000) * 1000;

    return [domainMin, domainMax];
  }, [chartData, chartView]);

  const stats = useMemo(() => {
    const currentTotal = debts.reduce((sum, debt) => sum + debt.balance, 0);
    const originalTotal = debts.reduce(
      (sum, debt) => sum + (debt.originalBalance || debt.balance),
      0,
    );
    const totalPaid = Math.max(0, originalTotal - currentTotal);
    const paidOffCount = debts.filter((debt) => debt.balance <= 0).length;

    const monthKeys = Array.from(
      new Set(snapshots.map((snapshot) => snapshot.recordedAt.slice(0, 7))),
    ).sort();
    let streak = 0;
    if (monthKeys.length) {
      streak = 1;
      for (let i = monthKeys.length - 1; i > 0; i -= 1) {
        const cur = new Date(`${monthKeys[i]}-01`);
        const prev = new Date(`${monthKeys[i - 1]}-01`);
        const diffMonths =
          (cur.getFullYear() - prev.getFullYear()) * 12 +
          cur.getMonth() -
          prev.getMonth();
        if (diffMonths === 1) streak += 1;
        else break;
      }
    }

    return { currentTotal, totalPaid, paidOffCount, streak, originalTotal };
  }, [snapshots, debts]);

  const milestones = useMemo(() => {
    const pctPaid =
      stats.originalTotal > 0 ? (stats.totalPaid / stats.originalTotal) * 100 : 0;

    return [
      {
        icon: Target,
        label: "First payment recorded",
        achieved: snapshots.length > 0,
      },
      {
        icon: BadgeDollarSign,
        label: "First $1,000 paid",
        achieved: stats.totalPaid >= 1_000,
      },
      {
        icon: Percent,
        label: "First debt under 30% utilization",
        achieved: debts.some(
          (debt) =>
            debt.originalBalance > 0 && debt.balance / debt.originalBalance <= 0.3,
        ),
      },
      {
        icon: Zap,
        label: "3-month payment streak",
        achieved: stats.streak >= 3,
      },
      {
        icon: BadgeCheck,
        label: "25% of total debt paid",
        achieved: pctPaid >= 25,
      },
      {
        icon: Flame,
        label: "50% of total debt paid",
        achieved: pctPaid >= 50,
      },
      {
        icon: TrendingUp,
        label: "75% of total debt paid",
        achieved: pctPaid >= 75,
      },
      {
        icon: Trophy,
        label: "Debt Free",
        achieved: stats.currentTotal <= 0 && debts.length > 0,
      },
    ];
  }, [stats, snapshots.length, debts]);

  if (isLoading || snapsLoading) {
    return (
      <section className="space-y-5">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[0, 1, 2, 3].map((index) => (
            <Skeleton key={index} className="h-20 rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-64 rounded-xl" />
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          <Skeleton className="h-80 rounded-2xl" />
          <Skeleton className="h-80 rounded-2xl" />
        </div>
      </section>
    );
  }

  if (debts.length === 0) {
    return (
      <div
        className="rounded-2xl p-8 text-center"
        style={{
          background: "#ffffff",
          border: "1px solid rgba(15,23,42,0.08)",
        }}
      >
        <TrendingUp
          size={36}
          style={{ color: "#2563eb", margin: "0 auto 12px" }}
        />
        <p
          className="font-semibold text-base mb-2"
          style={{ color: "#0f172a" }}
        >
          Start tracking your progress
        </p>
        <p className="text-sm mb-4" style={{ color: "#64748b" }}>
          Add your debts to see milestones, balance trends, and a running total
          of how much you have paid off over time.
        </p>
        <button
          onClick={() => onNavigate("debts")}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm"
          style={{
            background: "#2563eb",
            color: "#ffffff",
            border: "none",
            cursor: "pointer",
            fontFamily: "inherit",
          }}
        >
          Add My First Debt <ChevronRight size={14} />
        </button>
      </div>
    );
  }

  const hasData = snapshots.length > 0;

  return (
    <section className="space-y-5">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard
          label="Total Paid"
          value={formatCurrency(stats.totalPaid)}
          sub="balance reduced"
          color="#27AE60"
        />
        <StatCard
          label="Remaining"
          value={formatCurrency(stats.currentTotal)}
          color="#ef4444"
        />
        <StatCard
          label="Debts Closed"
          value={String(stats.paidOffCount)}
          sub={`of ${debts.length} total`}
          color="#2563eb"
        />
        <StatCard
          label="Tracking Streak"
          value={`${stats.streak} mo`}
          sub={
            stats.streak < 3
              ? "Next reward at 3 months"
              : stats.streak < 6
                ? "Next reward at 6 months"
                : stats.streak < 12
                  ? "Next reward at 12 months"
                  : "Consistent for a full year"
          }
          color="#7c3aed"
        />
      </div>

      <div
        className="rounded-xl p-5"
        style={{
          background: "#ffffff",
          border: "1px solid rgba(15,23,42,0.08)",
        }}
      >
        <div className="flex items-center gap-2 mb-4">
          {chartView === "balance" ? (
            <TrendingDown size={15} style={{ color: "#2563eb" }} />
          ) : (
            <TrendingUp size={15} style={{ color: "#27AE60" }} />
          )}
          <span
            className="font-semibold text-sm flex-1"
            style={{ color: "#111827" }}
          >
            {chartView === "balance"
              ? "Balance over time"
              : "Cumulative amount paid"}
          </span>
          {hasData && (
            <div
              className="flex rounded-lg overflow-hidden"
              style={{ border: "1px solid rgba(15,23,42,0.1)" }}
            >
              <button
                onClick={() => setChartView("balance")}
                style={{
                  fontSize: 11,
                  fontWeight: 500,
                  padding: "4px 10px",
                  fontFamily: "inherit",
                  background:
                    chartView === "balance" ? "#2563eb" : "transparent",
                  color: chartView === "balance" ? "#ffffff" : "#6B7280",
                  border: "none",
                  cursor: "pointer",
                }}
              >
                Balance
              </button>
              <button
                onClick={() => setChartView("paid")}
                style={{
                  fontSize: 11,
                  fontWeight: 500,
                  padding: "4px 10px",
                  fontFamily: "inherit",
                  background: chartView === "paid" ? "#27AE60" : "transparent",
                  color: chartView === "paid" ? "#ffffff" : "#6B7280",
                  border: "none",
                  cursor: "pointer",
                }}
              >
                Paid Off
              </button>
            </div>
          )}
        </div>

        {hasData && chartData.length > 1 ? (
          <ResponsiveContainer width="100%" height={220}>
            <LineChart
              data={chartData}
              margin={{ top: 4, right: 8, bottom: 0, left: 0 }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="rgba(15,23,42,0.06)"
              />
              <XAxis
                dataKey="month"
                tick={{ fontSize: 11, fill: "#94a3b8" }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tickFormatter={currencyTick}
                tick={{ fontSize: 11, fill: "#94a3b8" }}
                axisLine={false}
                tickLine={false}
                width={52}
                domain={yDomain}
              />
              <Tooltip content={<ChartTooltip />} />
              <Line
                type="monotone"
                dataKey={chartView === "balance" ? "balance" : "paid"}
                stroke={chartView === "balance" ? "#2563eb" : "#27AE60"}
                strokeWidth={2.5}
                dot={{
                  r: 3,
                  fill: chartView === "balance" ? "#2563eb" : "#27AE60",
                  strokeWidth: 0,
                }}
                activeDot={{ r: 5, strokeWidth: 0 }}
              />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div
            className="flex flex-col items-center justify-center h-40 rounded-xl"
            style={{
              background: "#F8FAFC",
              border: "1px dashed rgba(15,23,42,0.1)",
            }}
          >
            <Calendar size={28} style={{ color: "#cbd5e1", marginBottom: 8 }} />
            <p className="text-sm" style={{ color: "#94a3b8" }}>
              Log a payment or update a balance to start tracking progress.
            </p>
          </div>
        )}
      </div>

      <DataInsights
        debts={debts}
        income={income}
        expenses={expenses}
        snapshots={snapshots}
      />

      <div
        className="rounded-xl p-5"
        style={{
          background: "#ffffff",
          border: "1px solid rgba(15,23,42,0.08)",
        }}
      >
        <div className="flex items-center gap-2 mb-4">
          <Flame size={15} style={{ color: "#F59E0B" }} />
          <span className="font-semibold text-sm" style={{ color: "#111827" }}>
            Milestones
          </span>
        </div>
        <div className="space-y-2">
          {milestones.map((milestone) => (
            <MilestoneRow key={milestone.label} {...milestone} />
          ))}
        </div>
      </div>
    </section>
  );
}
