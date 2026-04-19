"use client";

import { useMemo } from "react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import {
  Sparkles,
  TrendingDown,
  BarChart2,
  Bell,
  ChevronRight,
  CreditCard,
} from "lucide-react";
import { Debt, Income, Expense } from "@/types";
import { type Notification, type Tab } from "@/components/dashboard/types";
import {
  calculateDebtSnowball,
  calculateDebtAvalanche,
  calculateDebtCustom,
} from "@/lib/snowball";
import { formatCurrency } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";

interface HomeTabProps {
  debts: Debt[];
  income: Income | null | undefined;
  expenses: Expense[];
  isLoading: boolean;
  userName: string | null | undefined;
  notifications: Notification[];
  onNavigate: (tab: Tab) => void;
}

function LoadingSkeleton() {
  return (
    <div className="space-y-5">
      <Skeleton className="h-20 w-full rounded-2xl" />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <Skeleton className="h-64 w-full rounded-2xl" />
        <Skeleton className="h-64 w-full rounded-2xl" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Skeleton className="h-36 w-full rounded-2xl" />
        <Skeleton className="h-36 w-full rounded-2xl" />
        <Skeleton className="h-36 w-full rounded-2xl" />
      </div>
    </div>
  );
}

const PIE_COLORS = ["#2563eb", "#f59e0b"];

function PaymentBreakdownChart({
  totalPrincipal,
  totalInterest,
}: {
  totalPrincipal: number;
  totalInterest: number;
}) {
  const total = totalPrincipal + totalInterest;
  const interestPct = total > 0 ? Math.round((totalInterest / total) * 100) : 0;
  const principalPct = 100 - interestPct;

  const data = [
    { name: "Principal", value: totalPrincipal },
    { name: "Interest", value: totalInterest },
  ];

  return (
    <div
      className="rounded-2xl p-5 h-full"
      style={{
        background: "#ffffff",
        border: "1px solid rgba(15,23,42,0.08)",
        boxShadow: "0 1px 4px rgba(15,23,42,0.06)",
      }}
    >
      <h3 className="font-semibold text-sm mb-1" style={{ color: "#0f172a" }}>
        Payment Breakdown
      </h3>
      <p className="text-xs mb-3" style={{ color: "#64748b" }}>
        Of your total payments, {principalPct}% goes to principal.
      </p>
      <div className="h-48">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={52}
              outerRadius={80}
              paddingAngle={3}
              dataKey="value"
            >
              {data.map((_, i) => (
                <Cell key={i} fill={PIE_COLORS[i]} />
              ))}
            </Pie>
            <Tooltip
              formatter={(value: number) => [formatCurrency(value)]}
              contentStyle={{
                background: "#ffffff",
                border: "1px solid rgba(15,23,42,0.12)",
                borderRadius: 10,
                fontSize: 12,
              }}
            />
            <Legend
              formatter={(value) => (
                <span style={{ fontSize: 11, color: "#64748b" }}>{value}</span>
              )}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <div className="flex justify-around mt-1">
        <div className="text-center">
          <p className="text-xs" style={{ color: "#64748b" }}>
            Interest
          </p>
          <p className="font-bold text-base" style={{ color: "#f59e0b" }}>
            {interestPct}%
          </p>
        </div>
        <div className="text-center">
          <p className="text-xs" style={{ color: "#64748b" }}>
            Principal
          </p>
          <p className="font-bold text-base" style={{ color: "#2563eb" }}>
            {principalPct}%
          </p>
        </div>
      </div>
    </div>
  );
}

function DebtProgressChart({
  balances,
}: {
  balances: { date: string; totalBalance: number }[];
}) {
  return (
    <div
      className="rounded-2xl p-5 h-full"
      style={{
        background: "#ffffff",
        border: "1px solid rgba(15,23,42,0.08)",
        boxShadow: "0 1px 4px rgba(15,23,42,0.06)",
      }}
    >
      <h3 className="font-semibold text-sm mb-1" style={{ color: "#0f172a" }}>
        Debt Progress
      </h3>
      <p className="text-xs mb-3" style={{ color: "#64748b" }}>
        Projected balance declining to zero over your payoff plan.
      </p>
      <div className="h-56">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={balances}
            margin={{ top: 4, right: 10, left: 4, bottom: 4 }}
          >
            <defs>
              <linearGradient id="balanceGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#2563eb" stopOpacity={0.15} />
                <stop offset="100%" stopColor="#2563eb" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke="rgba(15,23,42,0.07)" strokeDasharray="4 4" />
            <XAxis
              dataKey="date"
              tick={{ fill: "#94a3b8", fontSize: 10 }}
              tickLine={false}
              axisLine={false}
              minTickGap={32}
            />
            <YAxis
              tick={{ fill: "#94a3b8", fontSize: 10 }}
              tickLine={false}
              axisLine={false}
              tickFormatter={(v: number) =>
                v >= 1000 ? `$${Math.round(v / 1000)}k` : `$${v}`
              }
              width={40}
            />
            <Tooltip
              formatter={(value: number) => [
                formatCurrency(value),
                "Remaining Balance",
              ]}
              labelFormatter={(l) => `Month: ${String(l)}`}
              contentStyle={{
                background: "#ffffff",
                border: "1px solid rgba(15,23,42,0.12)",
                borderRadius: 10,
                fontSize: 12,
              }}
            />
            <Line
              type="monotone"
              dataKey="totalBalance"
              stroke="#2563eb"
              strokeWidth={2.5}
              dot={false}
              activeDot={{ r: 5, fill: "#2563eb" }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function InfoCard({
  icon,
  iconColor,
  iconBg,
  title,
  children,
}: {
  icon: React.ReactNode;
  iconColor: string;
  iconBg: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className="rounded-2xl p-5 flex flex-col gap-3"
      style={{
        background: "#ffffff",
        border: "1px solid rgba(15,23,42,0.08)",
        boxShadow: "0 1px 4px rgba(15,23,42,0.06)",
      }}
    >
      <div className="flex items-center gap-2">
        <div
          className="flex items-center justify-center rounded-xl"
          style={{
            width: 32,
            height: 32,
            background: iconBg,
            color: iconColor,
            flexShrink: 0,
          }}
        >
          {icon}
        </div>
        <span className="font-semibold text-sm" style={{ color: "#0f172a" }}>
          {title}
        </span>
      </div>
      <div className="text-sm leading-relaxed" style={{ color: "#475569" }}>
        {children}
      </div>
    </div>
  );
}

function ActionButton({
  icon,
  label,
  description,
  color,
  bg,
  border,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  description: string;
  color: string;
  bg: string;
  border: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="rounded-2xl p-4 text-left w-full transition-all hover:scale-[1.02] hover:shadow-md"
      style={{
        background: bg,
        border: `1px solid ${border}`,
        cursor: "pointer",
        fontFamily: "inherit",
      }}
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2" style={{ color }}>
          {icon}
          <span className="font-semibold text-sm">{label}</span>
        </div>
        <ChevronRight size={14} style={{ color, opacity: 0.7 }} />
      </div>
      <p className="text-xs" style={{ color: "#64748b" }}>
        {description}
      </p>
    </button>
  );
}

export default function HomeTab({
  debts,
  income,
  expenses,
  isLoading,
  userName,
  notifications,
  onNavigate,
}: HomeTabProps) {
  const firstName = useMemo(() => {
    if (!userName) return null;
    return userName.split(" ")[0];
  }, [userName]);

  const payoffResult = useMemo(() => {
    if (!income || debts.length === 0) return null;
    const recurring = expenses.reduce((s, e) => s + e.amount, 0);
    const essential = income.essentialExpenses ?? 0;
    const totalMin = debts.reduce((s, d) => s + d.minimumPayment, 0);
    const naturalSurplus = Math.max(
      0,
      income.monthlyTakeHome - essential - recurring - totalMin,
    );
    const maxAccel = naturalSurplus + (income.extraPayment ?? 0);
    const targetAccel =
      income.accelerationAmount !== null &&
      income.accelerationAmount !== undefined
        ? Math.min(income.accelerationAmount, maxAccel)
        : maxAccel;
    const adjustedExtra = targetAccel - naturalSurplus;
    try {
      const method = income.payoffMethod ?? "snowball";
      const calc =
        method === "avalanche"
          ? calculateDebtAvalanche
          : method === "custom"
            ? calculateDebtCustom
            : calculateDebtSnowball;
      return calc(
        debts,
        income.monthlyTakeHome,
        essential,
        recurring,
        adjustedExtra,
      );
    } catch {
      return null;
    }
  }, [debts, income, expenses]);

  const totalDebt = useMemo(
    () => debts.reduce((s, d) => s + d.balance, 0),
    [debts],
  );
  const monthlyMin = useMemo(
    () => debts.reduce((s, d) => s + d.minimumPayment, 0),
    [debts],
  );

  const balances = useMemo(() => {
    if (!payoffResult) return [];
    return payoffResult.monthlyBalances.map((mb) => ({
      date: mb.date,
      totalBalance: mb.totalBalance,
    }));
  }, [payoffResult]);

  // First urgent notification for the alert card
  const topAlert = useMemo(
    () =>
      notifications.find((n) => n.type === "urgent" || n.type === "warning") ??
      notifications[0] ??
      null,
    [notifications],
  );

  const payoffMethod = income?.payoffMethod ?? "snowball";
  const methodLabel =
    payoffMethod === "avalanche"
      ? "Avalanche"
      : payoffMethod === "custom"
        ? "Custom"
        : "Snowball";

  const debtFreeLabel = payoffResult
    ? payoffResult.debtFreeDate.toLocaleDateString("en-US", {
        month: "short",
        year: "numeric",
      })
    : "—";

  const monthlyPayment = payoffResult
    ? formatCurrency(payoffResult.monthlyPayment)
    : formatCurrency(monthlyMin);

  if (isLoading) return <LoadingSkeleton />;

  const noData = debts.length === 0 || !income;

  return (
    <section className="space-y-5">
      {/* Greeting */}
      <div>
        <h1 className="text-2xl font-bold" style={{ color: "#0f172a" }}>
          {firstName
            ? `Hello ${firstName}, Let's Crush Your Debt!`
            : "Let's Crush Your Debt!"}
        </h1>
        <p className="text-sm mt-1" style={{ color: "#64748b" }}>
          Here&apos;s your debt payoff overview at a glance.
        </p>
      </div>

      {/* Hero stat banner */}
      <div
        className="rounded-2xl px-6 py-5 flex flex-wrap items-center gap-6"
        style={{
          background:
            "linear-gradient(135deg, #1d4ed8 0%, #2563eb 60%, #3b82f6 100%)",
          boxShadow: "0 4px 24px rgba(37,99,235,0.25)",
        }}
      >
        {payoffResult ? (
          <>
            <div>
              <p
                className="text-xs font-semibold uppercase tracking-widest"
                style={{ color: "rgba(255,255,255,0.7)" }}
              >
                Debt-Free
              </p>
              <p className="text-3xl font-bold mt-1" style={{ color: "#ffffff" }}>
                {debtFreeLabel}
              </p>
            </div>
            <div
              style={{ height: 40, width: 1, background: "rgba(255,255,255,0.2)" }}
              className="hidden sm:block"
            />
            <div>
              <p
                className="text-xs font-semibold uppercase tracking-widest"
                style={{ color: "rgba(255,255,255,0.7)" }}
              >
                Remaining
              </p>
              <p className="text-xl font-bold mt-1" style={{ color: "#ffffff" }}>
                {formatCurrency(totalDebt)}
              </p>
            </div>
            <div
              style={{ height: 40, width: 1, background: "rgba(255,255,255,0.2)" }}
              className="hidden sm:block"
            />
            <div>
              <p
                className="text-xs font-semibold uppercase tracking-widest"
                style={{ color: "rgba(255,255,255,0.7)" }}
              >
                Monthly Payment
              </p>
              <p className="text-xl font-bold mt-1" style={{ color: "#ffffff" }}>
                {monthlyPayment}
              </p>
            </div>
            <div
              style={{ height: 40, width: 1, background: "rgba(255,255,255,0.2)" }}
              className="hidden sm:block"
            />
            <div>
              <p
                className="text-xs font-semibold uppercase tracking-widest"
                style={{ color: "rgba(255,255,255,0.7)" }}
              >
                Strategy
              </p>
              <p className="text-xl font-bold mt-1" style={{ color: "#ffffff" }}>
                {methodLabel}
              </p>
            </div>
          </>
        ) : (
          <div>
            <p
              className="text-xs font-semibold uppercase tracking-widest"
              style={{ color: "rgba(255,255,255,0.7)" }}
            >
              Total Debt
            </p>
            <p className="text-3xl font-bold mt-1" style={{ color: "#ffffff" }}>
              {formatCurrency(totalDebt)}
            </p>
            <p className="text-sm mt-2" style={{ color: "rgba(255,255,255,0.7)" }}>
              Add income to see your payoff date
            </p>
          </div>
        )}
      </div>

      {noData ? (
        /* Empty state nudge */
        <div
          className="rounded-2xl p-8 text-center"
          style={{
            background: "#ffffff",
            border: "1px solid rgba(15,23,42,0.08)",
          }}
        >
          <CreditCard
            size={36}
            style={{ color: "#2563eb", margin: "0 auto 12px" }}
          />
          <p
            className="font-semibold text-base mb-2"
            style={{ color: "#0f172a" }}
          >
            Add your debts to get started
          </p>
          <p className="text-sm mb-4" style={{ color: "#64748b" }}>
            Once you add debts and set up your income, your full payoff plan
            will appear here.
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
      ) : (
        <>
          {/* Charts row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <DebtProgressChart balances={balances} />
            <PaymentBreakdownChart
              totalPrincipal={totalDebt}
              totalInterest={payoffResult?.totalInterestPaid ?? 0}
            />
          </div>

          {/* Info cards row */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <InfoCard
              icon={<Sparkles size={16} />}
              iconColor="#8b5cf6"
              iconBg="rgba(139,92,246,0.1)"
              title="Smart AI Tips"
            >
              {payoffResult && payoffResult.totalInterestPaid > 0 ? (
                <>
                  Adding{" "}
                  <span className="font-semibold" style={{ color: "#0f172a" }}>
                    {formatCurrency(50)}/mo extra
                  </span>{" "}
                  could save{" "}
                  <span className="font-semibold" style={{ color: "#059669" }}>
                    months
                  </span>{" "}
                  off your payoff date. Visit{" "}
                  <button
                    onClick={() => onNavigate("intelligence")}
                    className="underline font-medium"
                    style={{
                      color: "#8b5cf6",
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      padding: 0,
                      fontFamily: "inherit",
                      fontSize: "inherit",
                    }}
                  >
                    Planner Intelligence
                  </button>{" "}
                  for personalized advice.
                </>
              ) : (
                <>
                  Go to{" "}
                  <button
                    onClick={() => onNavigate("intelligence")}
                    className="underline font-medium"
                    style={{
                      color: "#8b5cf6",
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      padding: 0,
                      fontFamily: "inherit",
                      fontSize: "inherit",
                    }}
                  >
                    Planner Intelligence
                  </button>{" "}
                  to get AI-powered recommendations tailored to your debts.
                </>
              )}
            </InfoCard>

            <InfoCard
              icon={<TrendingDown size={16} />}
              iconColor="#2563eb"
              iconBg="rgba(37,99,235,0.1)"
              title="Optimal Payment Plan"
            >
              <div className="space-y-1">
                <div className="flex justify-between">
                  <span style={{ color: "#64748b" }}>Monthly Payment</span>
                  <span className="font-semibold" style={{ color: "#0f172a" }}>
                    {monthlyPayment}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span style={{ color: "#64748b" }}>Payoff Strategy</span>
                  <span className="font-semibold" style={{ color: "#0f172a" }}>
                    {methodLabel} Method
                  </span>
                </div>
                {payoffResult && (
                  <div className="flex justify-between">
                    <span style={{ color: "#64748b" }}>Interest Cost</span>
                    <span
                      className="font-semibold"
                      style={{ color: "#f59e0b" }}
                    >
                      {formatCurrency(payoffResult.totalInterestPaid)}
                    </span>
                  </div>
                )}
              </div>
            </InfoCard>

            <InfoCard
              icon={<Bell size={16} />}
              iconColor="#ef4444"
              iconBg="rgba(239,68,68,0.1)"
              title="Alerts & Reminders"
            >
              {topAlert ? (
                <div>
                  <p
                    className="font-medium text-xs mb-1"
                    style={{ color: "#0f172a" }}
                  >
                    {topAlert.title}
                  </p>
                  <p
                    className="text-xs leading-relaxed"
                    style={{ color: "#64748b" }}
                  >
                    {topAlert.body}
                  </p>
                </div>
              ) : (
                <p className="text-xs" style={{ color: "#64748b" }}>
                  No urgent alerts right now. Stay on track and keep making
                  payments!
                </p>
              )}
            </InfoCard>
          </div>

          {/* Action buttons row */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <ActionButton
              icon={<TrendingDown size={15} />}
              label="Snowball Strategy"
              description="Pay smallest balances first for quick wins and momentum."
              color="#2563eb"
              bg="rgba(37,99,235,0.05)"
              border="rgba(37,99,235,0.2)"
              onClick={() => onNavigate("plan")}
            />
            <ActionButton
              icon={<Sparkles size={15} />}
              label="Avalanche Strategy"
              description="Target highest interest rates first to minimize total interest paid."
              color="#059669"
              bg="rgba(5,150,105,0.05)"
              border="rgba(5,150,105,0.2)"
              onClick={() => onNavigate("plan")}
            />
            <ActionButton
              icon={<BarChart2 size={15} />}
              label="Progress Reports"
              description="Track your payment history, streaks, and milestones over time."
              color="#7c3aed"
              bg="rgba(124,58,237,0.05)"
              border="rgba(124,58,237,0.2)"
              onClick={() => onNavigate("progress")}
            />
          </div>
        </>
      )}
    </section>
  );
}
