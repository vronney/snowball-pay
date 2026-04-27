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
import HomeTab from "@/components/tabs/HomeTab";
import DebtTab from "@/components/tabs/DebtTab";
import IncomeTab from "@/components/tabs/IncomeTab";
import PayoffTab from "@/components/tabs/PayoffTab";
import ProgressTab from "@/components/tabs/ProgressTab";
import IntelligenceTab from "@/components/tabs/IntelligenceTab";
import SettingsTab from "@/components/tabs/SettingsTab";
import HelpTab from "@/components/tabs/HelpTab";
import UpgradeModal from "@/components/billing/UpgradeModal";
import ToastNotifications from "@/components/ToastNotifications";
import DashboardSidebar from "@/components/dashboard/DashboardSidebar";
import AccelerationTracker from "@/components/AccelerationTracker";
import { useNotifications } from "@/components/dashboard/useNotifications";
import DashboardHeader from "@/components/dashboard/DashboardHeader";
import { MilestoneWidget } from "@/components/dashboard/MilestoneWidget";
import { MobileFAB } from "@/components/dashboard/MobileFAB";
import DashboardLoadingScreen from "@/components/dashboard/DashboardLoadingScreen";
import { type Tab } from "@/components/dashboard/types";
import { upgradeEvents } from "@/lib/upgradeEvents";

type UserInfo = {
  name?: string | null;
  email?: string | null;
  picture?: string | null;
};

const today = new Date();

const tabLabels: Record<Tab, string> = {
  home: "Home",
  debts: "My Debts",
  income: "Income & Budget",
  plan: "Payoff Plan",
  progress: "Progress",
  intelligence: "Planner Intelligence",
  help: "Help & Education",
  settings: "Settings",
};

function isValidTab(value: string | null): value is Tab {
  return !!value && Object.prototype.hasOwnProperty.call(tabLabels, value);
}

export default function DashboardClient({ user }: { user: UserInfo | null }) {
  const [activeTab, setActiveTab] = useState<Tab>("home");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [openPaymentDebtId, setOpenPaymentDebtId] = useState<string | null>(null);
  const [fabAddDebtRequest, setFabAddDebtRequest] = useState(false);
  const [upgradeModal, setUpgradeModal] = useState<{ open: boolean; feature?: string }>({ open: false });

  const searchParams = useSearchParams();
  const router = useRouter();
  const startCheckout = useStartCheckout();
  const queryClient = useQueryClient();

  // When the browser restores this page from bfcache (back button after logout/deletion),
  // event.persisted is true and no new server request is made, so middleware auth
  // checks never fire. Force a reload so the server can redirect unauthenticated users.
  useEffect(() => {
    const handlePageShow = (event: PageTransitionEvent) => {
      if (event.persisted) window.location.reload();
    };
    window.addEventListener('pageshow', handlePageShow);
    return () => window.removeEventListener('pageshow', handlePageShow);
  }, []);

  // Send Day 0 welcome email on first dashboard visit (fire-and-forget, idempotent)
  useEffect(() => {
    fetch('/api/email/lifecycle', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'day0' }),
    }).catch(() => { /* silent — never break the dashboard */ });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Auto-trigger checkout when landing from pricing page
  useEffect(() => {
    if (searchParams.get("checkout") === "pro") {
      startCheckout.mutate();
      const url = new URL(window.location.href);
      url.searchParams.delete("checkout");
      window.history.replaceState({}, "", url.toString());
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Honor explicit tab query params (e.g. Stripe billing portal return_url).
  useEffect(() => {
    const tab = searchParams.get("tab");
    if (!isValidTab(tab)) return;

    setActiveTab(tab);
    const url = new URL(window.location.href);
    url.searchParams.delete("tab");
    window.history.replaceState({}, "", url.toString());
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // After returning from Stripe checkout, refetch subscription until Pro is confirmed
  useEffect(() => {
    if (searchParams.get("upgrade") !== "success") return;
    // Clean the URL
    const url = new URL(window.location.href);
    url.searchParams.delete("upgrade");
    window.history.replaceState({}, "", url.toString());
    // Switch to settings so the user sees the Plan card update
    setActiveTab("settings");
    // Poll subscription every 2s for up to 20s waiting for webhook to land
    let attempts = 0;
    const interval = setInterval(async () => {
      await queryClient.invalidateQueries({ queryKey: ["subscription"] });
      attempts++;
      if (attempts >= 10) clearInterval(interval);
    }, 2000);
    return () => clearInterval(interval);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Listen for upgrade_required events from any child hook/component
  useEffect(() => {
    return upgradeEvents.subscribe((feature) => {
      setUpgradeModal({ open: true, feature });
    });
  }, []);

  const { data: debtsData, isLoading: debtsLoading, isFetching: debtsFetching } = useDebts();
  const { data: incomeData, isLoading: incomeLoading, isFetching: incomeFetching } = useIncome();
  const { data: expensesData, isLoading: expensesLoading } = useExpenses();
  const { data: settingsData } = useUserSettings();
  const { data: paymentsData } = usePaymentRecords(
    today.getFullYear(),
    today.getMonth(),
  );
  const markPaid = useMarkPaid();

  const debts = useMemo(() => debtsData?.debts ?? [], [debtsData?.debts]);

  // Most urgent debt for the FAB "Log Payment" action:
  // prefer the debt with the soonest due date this month, fall back to first in list.
  const focusDebtId = useMemo(() => {
    if (!debts.length) return null;
    const today = new Date().getDate();
    const withDue = debts.filter((d) => d.dueDate != null);
    if (withDue.length) {
      // Soonest upcoming due date (wraps around end of month)
      const sorted = [...withDue].sort((a, b) => {
        const aDays = (a.dueDate! - today + 31) % 31;
        const bDays = (b.dueDate! - today + 31) % 31;
        return aDays - bDays;
      });
      return sorted[0].id;
    }
    return debts[0].id;
  }, [debts]);
  const income = incomeData?.income;
  const expenses = useMemo(
    () => expensesData?.expenses ?? [],
    [expensesData?.expenses],
  );

  // Redirect to onboarding if setup is incomplete after data loads.
  // Only fires once per mount so navigating back from onboarding doesn't loop.
  // Skipped if the user explicitly chose "Skip setup" on the onboarding page.
  const onboardingCheckedRef = useRef(false);
  useEffect(() => {
    if (onboardingCheckedRef.current) return;
    if (debtsLoading || incomeLoading) return;
    if (debtsFetching || incomeFetching) return;
    onboardingCheckedRef.current = true;
    try {
      if (sessionStorage.getItem('sp_onboarding_skipped')) {
        sessionStorage.removeItem('sp_onboarding_skipped');
        return;
      }
    } catch { /* ignore storage access failures */ }
    if (!income && debts.length === 0) {
      router.replace('/onboarding');
    }
  }, [debtsLoading, incomeLoading, debtsFetching, incomeFetching, income, debts.length, router]);

  // Map debtId → paid record for this month (to suppress bell notifications)
  const paidThisMonth = useMemo(() => {
    const map = new Map<string, string>(); // debtId → recordId
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

    if (debtsLoading && incomeLoading) {
      loadingLabel = "Loading your debt profile...";
    } else if (debtsLoading) {
      loadingLabel = "Loading debts...";
    } else if (incomeLoading || expensesLoading) {
      loadingLabel = "Loading your budget...";
    }

    return <DashboardLoadingScreen label={loadingLabel} />;
  }

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "#f5f7fa" }}>
      <DashboardSidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        sidebarOpen={sidebarOpen}
        setSidebarOpen={setSidebarOpen}
      />

      {/* Main content */}
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          minWidth: 0,
        }}
        className="db-main"
      >
        {/* Top header */}
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
        />

        {/* Content */}
        <main
          style={{ flex: 1, padding: "28px", width: "100%" }}
          className="db-content"
        >
          {activeTab !== "home" && activeTab !== "settings" && activeTab !== "progress" && activeTab !== "help" && <AccelerationTracker />}
          {activeTab === "debts" && debts.length > 0 && (
            <div className="mb-4">
              <MilestoneWidget debts={debts} />
            </div>
          )}
          <div key={activeTab} className="tab-fade-in">
            {activeTab === "home" && (
              <HomeTab
                debts={debts}
                income={income}
                expenses={expenses}
                isLoading={debtsLoading || incomeLoading}
                userName={user?.name}
                notifications={notifications}
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
                onNavigate={(tab) => setActiveTab(tab)}
              />
            )}
            {activeTab === "help" && <HelpTab />}
            {activeTab === "settings" && <SettingsTab user={user} />}
          </div>
        </main>
      </div>

      <ToastNotifications debts={debts} />

      <MobileFAB
        focusDebtId={focusDebtId}
        onAddDebt={() => {
          setActiveTab("debts");
          setFabAddDebtRequest(true);
        }}
        onLogPayment={(debtId) => {
          setActiveTab("debts");
          if (debtId) setOpenPaymentDebtId(debtId);
        }}
      />

      {upgradeModal.open && (
        <UpgradeModal
          feature={upgradeModal.feature}
          onClose={() => setUpgradeModal({ open: false })}
        />
      )}

      <style>{`
        .db-main { margin-left: 240px; }
        @media (max-width: 768px) {
          .db-main { margin-left: 0 !important; }
          .db-sidebar { transform: translateX(-100%); box-shadow: 4px 0 24px rgba(15,23,42,0.12); }
          .db-hamburger { display: flex !important; }
          .db-mobile-logo { display: block !important; }
          .db-page-title { display: none !important; }
          .db-username { display: none !important; }
          .db-content { padding: 16px 16px 80px !important; }
          .db-fab { display: flex !important; }
          .db-add-debt-btn { display: none !important; }
        }
      `}</style>
    </div>
  );
}
