import { notFound } from "next/navigation";
import { verifyShareToken } from "@/lib/shareToken";
import { prisma } from "@/lib/prisma";
import { calculatePlanMetrics } from "@/lib/payoffPlan";
import { formatCurrency } from "@/lib/utils";
import type { Debt } from "@/types";
import Image from "next/image";

interface Props {
  params: { token: string };
}

export default async function SharedPlanPage({ params }: Props) {
  const userId = verifyShareToken(params.token);
  if (!userId) notFound();

  const [rawDebts, income, expenses] = await Promise.all([
    prisma.debt.findMany({ where: { userId } }),
    prisma.income.findUnique({ where: { userId } }),
    prisma.expense.findMany({ where: { userId } }),
  ]);

  if (!income || rawDebts.length === 0) notFound();

  const debts: Debt[] = rawDebts.map((d) => ({
    id: d.id, userId: d.userId, name: d.name,
    category: (d.category ?? "Other") as Debt["category"],
    balance: d.balance,
    originalBalance: d.originalBalance,
    interestRate: d.interestRate, minimumPayment: d.minimumPayment,
    creditLimit: d.creditLimit ?? 0,
    dueDate: d.dueDate ?? undefined,
    priorityOrder: d.priorityOrder ?? undefined,
    createdAt: d.createdAt, updatedAt: d.updatedAt,
  }));

  const normalIncome = {
    id: income.id, userId: income.userId,
    monthlyTakeHome: income.monthlyTakeHome,
    essentialExpenses: income.essentialExpenses,
    extraPayment: income.extraPayment ?? 0,
    payoffMethod: income.payoffMethod ?? "snowball",
    accelerationAmount: income.accelerationAmount ?? null,
    createdAt: income.createdAt, updatedAt: income.updatedAt,
  };

  const metrics = calculatePlanMetrics(debts, normalIncome, expenses as any);
  if (!metrics) notFound();

  const { result } = metrics;
  const debtFreeDate = result.debtFreeDate.toLocaleDateString("en-US", {
    month: "long", year: "numeric",
  });
  const totalDebt = debts.reduce((s, d) => s + d.balance, 0);
  const totalInterest = Math.round(result.totalInterestPaid);
  const months = result.months;
  const years = Math.floor(months / 12);
  const mo = months % 12;
  const timeStr = years > 0 ? `${years}y ${mo}m` : `${mo}m`;

  return (
    <div style={{
      minHeight: "100dvh", background: "#f8fafc",
      display: "flex", flexDirection: "column", alignItems: "center",
      padding: "40px 20px", fontFamily: "DM Sans, sans-serif",
    }}>
      <div style={{ width: "100%", maxWidth: "520px" }}>
        {/* Logo */}
        <div style={{ marginBottom: "32px" }}>
          <Image src="/logo-dark.svg" alt="SnowballPay" width={130} height={26} />
        </div>

        {/* Header card */}
        <div style={{
          background: "#ffffff", borderRadius: "16px",
          border: "1px solid rgba(15,23,42,0.08)",
          padding: "28px", marginBottom: "16px",
          boxShadow: "0 4px 16px rgba(15,23,42,0.06)",
        }}>
          <p style={{ fontSize: "13px", color: "#64748b", margin: "0 0 6px", fontWeight: 600, letterSpacing: "0.05em", textTransform: "uppercase" }}>
            Debt-Free Date
          </p>
          <h1 style={{ fontSize: "36px", fontWeight: 900, color: "#0f172a", margin: "0 0 4px", letterSpacing: "-0.03em" }}>
            {debtFreeDate}
          </h1>
          <p style={{ fontSize: "14px", color: "#64748b", margin: 0 }}>
            {timeStr} from now · {debts.length} debt{debts.length !== 1 ? "s" : ""}
          </p>
        </div>

        {/* Stats row */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "16px" }}>
          {[
            { label: "Total debt", value: formatCurrency(totalDebt) },
            { label: "Total interest", value: formatCurrency(totalInterest) },
          ].map(({ label, value }) => (
            <div key={label} style={{
              background: "#ffffff", borderRadius: "12px",
              border: "1px solid rgba(15,23,42,0.08)", padding: "16px 20px",
            }}>
              <p style={{ fontSize: "11px", color: "#94a3b8", margin: "0 0 4px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>{label}</p>
              <p style={{ fontSize: "22px", fontWeight: 800, color: "#0f172a", margin: 0, fontVariantNumeric: "tabular-nums" }}>{value}</p>
            </div>
          ))}
        </div>

        {/* Payoff order */}
        <div style={{
          background: "#ffffff", borderRadius: "12px",
          border: "1px solid rgba(15,23,42,0.08)", padding: "20px",
          marginBottom: "24px",
        }}>
          <p style={{ fontSize: "12px", fontWeight: 700, color: "#64748b", margin: "0 0 14px", textTransform: "uppercase", letterSpacing: "0.05em" }}>
            Payoff order
          </p>
          {[...result.payoffSchedule]
          .sort((a, b) => a.orderInPayoff - b.orderInPayoff)
          .map((s, i, arr) => (
            <div key={s.debtId} style={{
              display: "flex", alignItems: "center", gap: "10px",
              padding: "8px 0",
              borderBottom: i < arr.length - 1 ? "1px solid #f1f5f9" : "none",
            }}>
              <span style={{
                width: "22px", height: "22px", borderRadius: "50%",
                background: i === 0 ? "#2563eb" : "#f1f5f9",
                color: i === 0 ? "#fff" : "#64748b",
                fontSize: "11px", fontWeight: 700,
                display: "flex", alignItems: "center", justifyContent: "center",
                flexShrink: 0,
              }}>{i + 1}</span>
              <span style={{ fontSize: "14px", color: "#0f172a", fontWeight: i === 0 ? 700 : 500 }}>{s.debtName}</span>
              {i === 0 && (
                <span style={{ marginLeft: "auto", fontSize: "11px", color: "#2563eb", fontWeight: 700 }}>Focus debt</span>
              )}
            </div>
          ))}
        </div>

        {/* CTA */}
        <div style={{ textAlign: "center" }}>
          <p style={{ fontSize: "13px", color: "#64748b", margin: "0 0 12px" }}>
            Build your own debt-free plan with SnowballPay
          </p>
          <a
            href="https://getsnowballpay.com"
            style={{
              display: "inline-flex", alignItems: "center", gap: "6px",
              padding: "11px 24px", borderRadius: "10px",
              background: "#2563eb", color: "#fff",
              textDecoration: "none", fontSize: "14px", fontWeight: 700,
            }}
          >
            Get my free plan →
          </a>
        </div>
      </div>
    </div>
  );
}
