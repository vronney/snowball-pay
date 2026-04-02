"use client";

import { useMemo } from "react";
import { Debt, Income, BalanceSnapshot } from "@/types";
import { useAllSnapshots } from "@/lib/hooks";
import { formatCurrency } from "@/lib/utils";
import { TrendingDown, CheckCircle2, Flame, Calendar } from "lucide-react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import { Skeleton } from "@/components/ui/skeleton";

interface ProgressTabProps {
  debts: Debt[];
  income: Income | null | undefined;
  isLoading: boolean;
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
}

function buildChartData(snapshots: BalanceSnapshot[]): ChartPoint[] {
  // Aggregate total balance per month across all debts
  const byMonth = new Map<string, number>();
  for (const s of snapshots) {
    const key = s.recordedAt.slice(0, 7); // "YYYY-MM"
    byMonth.set(key, (byMonth.get(key) ?? 0) + s.balance);
  }
  return Array.from(byMonth.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, balance]) => ({
      month: new Date(key + "-01").toLocaleDateString("en-US", {
        month: "short",
        year: "2-digit",
      }),
      balance,
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
  emoji,
  label,
  achieved,
}: {
  emoji: string;
  label: string;
  achieved: boolean;
}) {
  return (
    <div
      className="flex items-center gap-3 rounded-xl px-4 py-3"
      style={{
        background: achieved
          ? "rgba(39,174,96,0.07)"
          : "rgba(15,23,42,0.03)",
        border: achieved
          ? "1px solid rgba(39,174,96,0.18)"
          : "1px solid rgba(15,23,42,0.07)",
        opacity: achieved ? 1 : 0.55,
      }}
    >
      <span style={{ fontSize: 20 }}>{emoji}</span>
      <span
        className="text-sm flex-1"
        style={{ color: achieved ? "#111827" : "#6B7280", fontWeight: achieved ? 600 : 400 }}
      >
        {label}
      </span>
      {achieved && (
        <CheckCircle2 size={16} style={{ color: "#27AE60", flexShrink: 0 }} />
      )}
    </div>
  );
}

export default function ProgressTab({ debts, income, isLoading }: ProgressTabProps) {
  const { data: snapshotData, isLoading: snapsLoading } = useAllSnapshots();
  const snapshots = useMemo(
    () => snapshotData?.snapshots ?? [],
    [snapshotData]
  );

  const chartData = useMemo(() => buildChartData(snapshots), [snapshots]);

  // Stats derived from snapshots and current state
  const stats = useMemo(() => {
    const startingBalance = snapshots.length
      ? Math.max(...snapshots.map((s) => s.balance))
      : 0;
    // Sum all-time balance reductions per debt
    const paidByDebt = new Map<string, { earliest: number; latest: number }>();
    for (const s of snapshots) {
      const existing = paidByDebt.get(s.debtId);
      const bal = s.balance;
      const ts = s.recordedAt;
      if (!existing) {
        paidByDebt.set(s.debtId, { earliest: bal, latest: bal });
      } else {
        if (ts < s.recordedAt) existing.earliest = bal;
        if (ts > s.recordedAt) existing.latest = bal;
      }
    }

    const currentTotal = debts.reduce((s, d) => s + d.balance, 0);
    const originalTotal = debts.reduce(
      (s, d) => s + (d.originalBalance || d.balance),
      0
    );
    const totalPaid = Math.max(0, originalTotal - currentTotal);
    const paidOffCount = debts.filter((d) => d.balance <= 0).length;

    // Consecutive months with snapshots recorded
    const monthKeys = Array.from(
      new Set(snapshots.map((s) => s.recordedAt.slice(0, 7)))
    ).sort();
    let streak = 0;
    if (monthKeys.length) {
      streak = 1;
      for (let i = monthKeys.length - 1; i > 0; i--) {
        const cur = new Date(monthKeys[i] + "-01");
        const prev = new Date(monthKeys[i - 1] + "-01");
        const diffMonths =
          (cur.getFullYear() - prev.getFullYear()) * 12 +
          cur.getMonth() -
          prev.getMonth();
        if (diffMonths === 1) streak++;
        else break;
      }
    }

    return { currentTotal, totalPaid, paidOffCount, streak, originalTotal };
  }, [snapshots, debts]);

  // Milestone achievements
  const milestones = useMemo(() => {
    const { currentTotal, originalTotal } = stats;
    const pctPaid = originalTotal > 0 ? (stats.totalPaid / originalTotal) * 100 : 0;
    return [
      { emoji: "🎯", label: "First payment recorded",   achieved: snapshots.length > 0 },
      { emoji: "💪", label: "25% of total debt paid",   achieved: pctPaid >= 25 },
      { emoji: "🔥", label: "50% of total debt paid",   achieved: pctPaid >= 50 },
      { emoji: "🚀", label: "75% of total debt paid",   achieved: pctPaid >= 75 },
      { emoji: "🏆", label: "Debt Free!",                achieved: currentTotal <= 0 && debts.length > 0 },
    ];
  }, [stats, snapshots.length, debts.length]);

  if (isLoading || snapsLoading) {
    return (
      <section className="space-y-5">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-20 rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-64 rounded-xl" />
      </section>
    );
  }

  const hasData = snapshots.length > 0;

  return (
    <section className="space-y-5">
      {/* Stat cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard
          label="Total Paid"
          value={formatCurrency(stats.totalPaid)}
          sub="vs original balances"
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
          sub="consecutive months"
          color="#7c3aed"
        />
      </div>

      {/* Balance over time chart */}
      <div
        className="rounded-xl p-5"
        style={{ background: "#ffffff", border: "1px solid rgba(15,23,42,0.08)" }}
      >
        <div className="flex items-center gap-2 mb-4">
          <TrendingDown size={15} style={{ color: "#2563eb" }} />
          <span className="font-semibold text-sm" style={{ color: "#111827" }}>
            Balance over time
          </span>
        </div>

        {hasData && chartData.length > 1 ? (
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={chartData} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(15,23,42,0.06)" />
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
              />
              <Tooltip content={<ChartTooltip />} />
              <Line
                type="monotone"
                dataKey="balance"
                stroke="#2563eb"
                strokeWidth={2.5}
                dot={{ r: 3, fill: "#2563eb", strokeWidth: 0 }}
                activeDot={{ r: 5, strokeWidth: 0 }}
              />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div
            className="flex flex-col items-center justify-center h-40 rounded-xl"
            style={{ background: "#F8FAFC", border: "1px dashed rgba(15,23,42,0.1)" }}
          >
            <Calendar size={28} style={{ color: "#cbd5e1", marginBottom: 8 }} />
            <p className="text-sm" style={{ color: "#94a3b8" }}>
              Log a payment or update a balance to start tracking progress.
            </p>
          </div>
        )}
      </div>

      {/* Milestones */}
      <div
        className="rounded-xl p-5"
        style={{ background: "#ffffff", border: "1px solid rgba(15,23,42,0.08)" }}
      >
        <div className="flex items-center gap-2 mb-4">
          <Flame size={15} style={{ color: "#F59E0B" }} />
          <span className="font-semibold text-sm" style={{ color: "#111827" }}>
            Milestones
          </span>
        </div>
        <div className="space-y-2">
          {milestones.map((m) => (
            <MilestoneRow key={m.label} {...m} />
          ))}
        </div>
      </div>
    </section>
  );
}
