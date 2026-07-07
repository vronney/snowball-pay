"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import {
  useDebts,
  useIncome,
  useExpenses,
  useUserSettings,
  usePaymentRecords,
  useMarkPaid,
  useStartCheckout,
} from "@/lib/hooks";
import { useQueryClient } from "@tanstack/react-query";
import ThisMonthTab from "@/components/tabs/ThisMonthTab";
import DebtTab from "@/components/tabs/DebtTab";
import IncomeTab from "@/components/tabs/IncomeTab";
import PayoffTab from "@/components/tabs/PayoffTab";
import ProgressTab from "@/components/tabs/ProgressTab";
import SettingsTab from "@/components/tabs/SettingsTab";
import UpgradeModal from "@/components/billing/UpgradeModal";
import ToastNotifications from "@/components/ToastNotifications";
import DashboardSidebar from "@/components/dashboard/DashboardSidebar";
import { useNotifications } from "@/components/dashboard/useNotifications";
import DashboardHeader from "@/components/dashboard/DashboardHeader";
import { MilestoneWidget } from "@/components/dashboard/MilestoneWidget";
import DashboardLoadingScreen from "@/components/dashboard/DashboardLoadingScreen";
import { type Tab } from "@/components/dashboard/types";
import IntelligenceTab from "@/components/tabs/IntelligenceTab";
import { upgradeEvents } from "@/lib/upgradeEvents";
import { SKIPPED_DEBTS_FLAG } from "@/lib/calculatorDraft";
import { calculateMinimumsOnlyResult, calculatePlanMetrics } from "@/lib/payoffPlan";
import { shouldStartOnboarding } from "@/lib/onboardingGate";
import TrialCountdownBanner from "@/components/dashboard/TrialCountdownBanner";
import { useSubscription } from "@/lib/hooks";
import { track, Events } from "@/lib/analytics";
import { useIdleTimeout } from "@/lib/hooks/useIdleTimeout";

type UserInfo = {
  name?: string | null;
  email?: string | null;
  picture?: string | null;
};

const tabLabels: Record<Tab, string> = {
  "this-month": "This Month",
  debts: "My Debts",
  income: "Income & Budget",
  plan: "My Plan",
  progress: "Progress",
  intelligence: "Intelligence",
  settings: "Settings",
};

function isValidTab(value: string | null): value is Tab {
  return !!value && Object.prototype.hasOwnProperty.call(tabLabels, value);
}


export default function DashboardClient({
  user,
  plaidTestAccess = false,
}: {
  user: UserInfo | null;
  plaidTestAccess?: boolean;
}) {
  const [activeTab, setActiveTab] = useState<Tab>("this-month");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [openPaymentDebtId, setOpenPaymentDebtId] = useState<string | null>(null);
  const [fabAddDebtRequest, setFabAddDebtRequest] = useState(false);
  const [upgradeModal, setUpgradeModal] = useState<{
    open: boolean;
    feature?: string;
  }>({ open: false });

  const searchParams = useSearchParams();
  const router = useRouter();
  const startCheckout = useStartCheckout();
  const queryClient = useQueryClient();
  const { warning, countdown, stayLoggedIn, logout } = useIdleTimeout();

  useEffect(() => {
    const handlePageShow = (event: PageTransitionEvent) => {
      if (event.persisted) window.location.reload();
    };
    window.addEventListener("pageshow", handlePageShow);
    return () => window.removeEventListener("pageshow", handlePageShow);
  }, []);

  useEffect(() => {
    fetch("/api/email/lifecycle", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "day0" }),
    }).catch(() => { /* silent */ });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (searchParams.get("checkout") === "pro") {
      track(Events.CHECKOUT_STARTED, { source: "pricing_page" });
      startCheckout.mutate('monthly');
      const url = new URL(window.location.href);
      url.searchParams.delete("checkout");
      window.history.replaceState({}, "", url.toString());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Tab switches are client-side state, not real navigations — reset the
  // scroll position so each "page" starts at the top like a normal link.
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0 });
  }, [activeTab]);

  useEffect(() => {
    const tab = searchParams.get("tab");
    if (!isValidTab(tab)) return;
    setActiveTab(tab);
    const url = new URL(window.location.href);
    url.searchParams.delete("tab");
    window.history.replaceState({}, "", url.toString());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (searchParams.get("upgrade") !== "success") return;
    const url = new URL(window.location.href);
    url.searchParams.delete("upgrade");
    window.history.replaceState({}, "", url.toString());
    setActiveTab("settings");
    let attempts = 0;
    const interval = setInterval(async () => {
      await queryClient.invalidateQueries({ queryKey: ["subscription"] });
      attempts++;
      if (attempts >= 10) clearInterval(interval);
    }, 2000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    return upgradeEvents.subscribe((feature) => {
      setUpgradeModal({ open: true, feature });
    });
  }, []);

  // Onboarding committed what the free tier allows but had to skip some
  // calculator debts — surface the upgrade path instead of staying silent
  // about the debts that didn't make it in.
  useEffect(() => {
    try {
      const skipped = sessionStorage.getItem(SKIPPED_DEBTS_FLAG);
      if (!skipped) return;
      sessionStorage.removeItem(SKIPPED_DEBTS_FLAG);
      setUpgradeModal({ open: true, feature: "Unlimited debts" });
    } catch {
      // ignore
    }
  }, []);

  const { data: debtsData, isLoading: debtsLoading, isFetching: debtsFetching, isError: debtsError } = useDebts();
  const { data: incomeData, isLoading: incomeLoading, isFetching: incomeFetching, isError: incomeError } = useIncome();
  const { data: expensesData, isLoading: expensesLoading } = useExpenses();
  const { data: settingsData } = useUserSettings();
  // Evaluated per render so a session left open across midnight / a month
  // boundary doesn't query payment records for a stale month.
  const today = new Date();
  const { data: paymentsData } = usePaymentRecords(today.getFullYear(), today.getMonth());
  const markPaid = useMarkPaid();
  const { data: subData } = useSubscription();
  // Real gate: allowlisted testers/loyal customers OR an active Pro subscriber.
  // Mirrors canUsePlaid() server-side — keep both in sync if the gate changes.
  const plaidEnabled = plaidTestAccess || subData?.paidTier === "pro";

  const debts = useMemo(() => debtsData?.debts ?? [], [debtsData?.debts]);
  const income = incomeData?.income;
  const expenses = useMemo(() => expensesData?.expenses ?? [], [expensesData?.expenses]);

  const onboardingCheckedRef = useRef(false);
  useEffect(() => {
    if (onboardingCheckedRef.current) return;
    if (debtsLoading || incomeLoading) return;
    if (debtsFetching || incomeFetching) return;
    onboardingCheckedRef.current = true;
    try {
      if (sessionStorage.getItem("sp_onboarding_skipped")) {
        sessionStorage.removeItem("sp_onboarding_skipped");
        return;
      }
    } catch { /* ignore */ }
    if (
      shouldStartOnboarding({
        hasIncome: !!income,
        debtCount: debts.length,
        hadError: debtsError || incomeError,
      })
    ) {
      router.replace("/onboarding");
    }
  }, [debtsLoading, incomeLoading, debtsFetching, incomeFetching, income, debts.length, debtsError, incomeError, router]);

  // Real interest reclaimed vs minimums-only, for loss framing in the upgrade
  // modal. Only computed while the modal is open — plan simulation is not free.
  const interestAtStake = useMemo(() => {
    if (!upgradeModal.open || !debts.length || !income) return 0;
    try {
      const method =
        (income.payoffMethod as "snowball" | "avalanche" | "custom") ?? "snowball";
      const plan = calculatePlanMetrics(debts, income, expenses, { method });
      const minimums = calculateMinimumsOnlyResult(debts);
      if (!plan || !minimums) return 0;
      return Math.max(
        0,
        minimums.totalInterestPaid - plan.result.totalInterestPaid,
      );
    } catch {
      return 0;
    }
  }, [upgradeModal.open, debts, income, expenses]);

  const paidThisMonth = useMemo(() => {
    const map = new Map<string, string>();
    for (const r of paymentsData?.records ?? []) map.set(r.debtId, r.id);
    return map;
  }, [paymentsData]);

  const actionChecks = settingsData?.preferences?.actionChecks ?? {};

  const { notifications } = useNotifications({
    debts,
    income,
    expenses,
    debtsLoading,
    incomeLoading,
    paidThisMonth,
    notifyDueDates: settingsData?.preferences?.notifyDueDates ?? true,
    notifyLowBuffer: settingsData?.preferences?.notifyLowBuffer ?? true,
    notifyMilestones: actionChecks.milestones ?? true,
    notifyBudgetChanges: actionChecks.budgetChanges ?? false,
  });

  const initials = user
    ? (user.name || user.email || "U").slice(0, 2).toUpperCase()
    : "U";

  if (debtsLoading || incomeLoading || expensesLoading) {
    let loadingLabel = "Preparing your dashboard...";
    if (debtsLoading && incomeLoading) loadingLabel = "Loading your debt profile...";
    else if (debtsLoading) loadingLabel = "Loading debts...";
    else if (incomeLoading || expensesLoading) loadingLabel = "Loading your budget...";
    return <DashboardLoadingScreen label={loadingLabel} />;
  }

  // Session exists but the account can't be loaded (every core query failed).
  // The most common cause: the signup email is already registered under a
  // different sign-in method, so the account can't be linked until the email
  // is verified. Show a way out instead of a dead dashboard.
  if (debtsError && incomeError) {
    return (
      <div
        style={{
          minHeight: "100dvh", background: "#f8fafc",
          display: "flex", alignItems: "center", justifyContent: "center",
          padding: "24px",
        }}
      >
        <div
          style={{
            background: "#ffffff", borderRadius: 12, padding: "40px 36px",
            maxWidth: 440, width: "100%", textAlign: "center",
            border: "1px solid rgba(15,23,42,0.08)",
            boxShadow: "0 8px 24px rgba(17,24,39,0.08)",
          }}
        >
          <p style={{ fontSize: 40, margin: "0 0 12px" }}>🔒</p>
          <h1 style={{ fontSize: 20, fontWeight: 800, color: "#0f172a", margin: "0 0 10px" }}>
            We couldn&apos;t load your account
          </h1>
          <p style={{ fontSize: 14, color: "#475569", lineHeight: 1.65, margin: "0 0 24px" }}>
            This usually means the email you signed up with is already
            registered under a different sign-in method (like Google). Sign
            out and log in with the method you used originally — or, if this
            is a new account, verify your email first and log in again.
          </p>
          <a
            href="/auth/logout"
            style={{
              display: "inline-block", background: "#2563eb", color: "#ffffff",
              borderRadius: 8, padding: "12px 24px", fontSize: 14,
              fontWeight: 600, textDecoration: "none", marginBottom: 12,
            }}
          >
            Sign Out
          </a>
          <p style={{ fontSize: 12, color: "#94a3b8", margin: 0 }}>
            Still stuck?{" "}
            <a href="/support" style={{ color: "#64748b" }}>Contact support</a>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", minHeight: "100dvh", background: "#f8fafc" }}>
      <DashboardSidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        sidebarOpen={sidebarOpen}
        setSidebarOpen={setSidebarOpen}
      />

      <div
        style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}
        className="db-main"
      >
        <DashboardHeader
          activeTab={activeTab}
          tabLabels={tabLabels}
          sidebarOpen={sidebarOpen}
          setSidebarOpen={setSidebarOpen}
          notifications={notifications}
          onNavigate={(tab, debtId) => {
            setActiveTab(tab);
            if (debtId) setOpenPaymentDebtId(debtId);
          }}
          onMarkPaid={(debtId, amount, year, month) =>
            markPaid.mutate({ debtId, amount, dueYear: year, dueMonth: month })
          }
          user={user}
          initials={initials}
          plaidEnabled={plaidEnabled}
        />

        <TrialCountdownBanner
          sub={subData}
          hasLinkedBankDebt={debts.some((d) => d.isLinked)}
        />
        <main style={{ flex: 1, padding: "32px", width: "100%" }} className="db-content">
          {activeTab === "progress" && debts.length > 0 && (
            <div className="mb-4">
              <MilestoneWidget debts={debts} />
            </div>
          )}
          <div key={activeTab} className="tab-fade-in">
            {activeTab === "this-month" && (
              <ThisMonthTab
                debts={debts}
                income={income}
                expenses={expenses}
                isLoading={debtsLoading || incomeLoading}
                userName={user?.name}
                onNavigate={(tab) => setActiveTab(tab)}
              />
            )}
            {activeTab === "debts" && (
              <DebtTab
                debts={debts}
                isLoading={debtsLoading}
                openPaymentDebtId={openPaymentDebtId}
                onPaymentPanelOpened={() => setOpenPaymentDebtId(null)}
                requestAddDebt={fabAddDebtRequest}
                onAddDebtHandled={() => setFabAddDebtRequest(false)}
              />
            )}
            {activeTab === "income" && (
              <IncomeTab
                income={income}
                expenses={expenses}
                debts={debts}
                isLoading={incomeLoading || expensesLoading}
              />
            )}
            {activeTab === "plan" && (
              <PayoffTab
                debts={debts}
                income={income}
                expenses={expenses}
                isLoading={debtsLoading || incomeLoading}
                onNavigate={(tab) => setActiveTab(tab)}
              />
            )}
            {activeTab === "progress" && (
              <ProgressTab
                debts={debts}
                income={income}
                expenses={expenses}
                isLoading={debtsLoading || incomeLoading}
                onNavigate={(tab) => setActiveTab(tab)}
              />
            )}
            {activeTab === "intelligence" && (
              <IntelligenceTab
                debts={debts}
                income={income}
                expenses={expenses}
                isLoading={debtsLoading || incomeLoading}
              />
            )}
            {activeTab === "settings" && <SettingsTab user={user} />}
          </div>
        </main>
      </div>

      <ToastNotifications debts={debts} />

      {upgradeModal.open && (
        <UpgradeModal
          feature={upgradeModal.feature}
          interestAtStake={interestAtStake}
          onClose={() => setUpgradeModal({ open: false })}
        />
      )}

      {warning && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="idle-title"
          style={{
            position: "fixed", inset: 0, zIndex: 9999,
            display: "flex", alignItems: "center", justifyContent: "center",
            background: "rgba(15,23,42,0.5)",
          }}
        >
          <div style={{
            background: "#ffffff", borderRadius: 12, padding: "28px 32px",
            maxWidth: 360, width: "calc(100% - 32px)",
            boxShadow: "0 8px 32px rgba(15,23,42,0.18)",
            textAlign: "center",
          }}>
            <p id="idle-title" style={{ fontWeight: 700, fontSize: 16, color: "#0f172a", marginBottom: 8 }}>
              Still there?
            </p>
            <p style={{ fontSize: 14, color: "#64748b", marginBottom: 20, lineHeight: 1.5 }}>
              You&apos;ll be logged out in{" "}
              <span className="mono" style={{ color: "#2563eb", fontWeight: 600 }}>
                {countdown}s
              </span>{" "}
              due to inactivity.
            </p>
            <button
              onClick={stayLoggedIn}
              style={{
                width: "100%", padding: "10px 0", borderRadius: 8, border: "none",
                background: "#2563eb", color: "#ffffff", fontWeight: 600,
                fontSize: 14, cursor: "pointer", marginBottom: 10, fontFamily: "inherit",
              }}
            >
              Stay logged in
            </button>
            <button
              onClick={logout}
              style={{
                background: "none", border: "none", color: "#64748b",
                fontSize: 13, cursor: "pointer", fontFamily: "inherit",
              }}
            >
              Log out now
            </button>
          </div>
        </div>
      )}

      <style>{`
        .db-main { margin-left: 220px; }
        .plaid-link-btn { gap: 7px; padding: 8px 14px; }
        .plaid-link-label { display: inline; }
        @media (max-width: 768px) {
          .db-main { margin-left: 0 !important; }
          .db-sidebar { transform: translateX(-100%); box-shadow: 24px 0 64px rgba(15,23,42,0.16); }
          .db-hamburger { display: flex !important; }
          .db-mobile-logo { display: block !important; }
          .db-page-title { display: none !important; }
          .db-username { display: none !important; }
          .db-content { padding: 16px 16px 80px !important; }
          .plaid-link-btn { padding: 10px; border-radius: 999px; gap: 0; }
          .plaid-link-label { display: none !important; }
        }
      `}</style>
    </div>
  );
}
