"use client";

import { useState, useMemo } from "react";
import {
  useDebts,
  useIncome,
  useExpenses,
  useUserSettings,
  usePaymentRecords,
  useMarkPaid,
} from "@/lib/hooks";
import DebtTab from "@/components/tabs/DebtTab";
import IncomeTab from "@/components/tabs/IncomeTab";
import PayoffTab from "@/components/tabs/PayoffTab";
import DocumentImport from "@/components/DocumentImport";
import IntelligenceTab from "@/components/tabs/IntelligenceTab";
import SettingsTab from "@/components/tabs/SettingsTab";
import ToastNotifications from "@/components/ToastNotifications";
import DashboardSidebar from "@/components/dashboard/DashboardSidebar";
import AccelerationTracker from "@/components/AccelerationTracker";
import { useNotifications } from "@/components/dashboard/useNotifications";
import DashboardHeader from "@/components/dashboard/DashboardHeader";
import { type Tab } from "@/components/dashboard/types";

type UserInfo = {
  name?: string | null;
  email?: string | null;
  picture?: string | null;
};

const today = new Date();

const tabLabels: Record<Tab, string> = {
  debts: "My Debts",
  income: "Income & Budget",
  plan: "Payoff Plan",
  intelligence: "Planner Intelligence",
  documents: "Import Documents",
  settings: "Settings",
};

export default function DashboardClient({ user }: { user: UserInfo | null }) {
  const [activeTab, setActiveTab] = useState<Tab>("debts");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [openPaymentDebtId, setOpenPaymentDebtId] = useState<string | null>(
    null,
  );

  const { data: debtsData, isLoading: debtsLoading } = useDebts();
  const { data: incomeData, isLoading: incomeLoading } = useIncome();
  const { data: expensesData, isLoading: expensesLoading } = useExpenses();
  const { data: settingsData } = useUserSettings();
  const { data: paymentsData } = usePaymentRecords(
    today.getFullYear(),
    today.getMonth(),
  );
  const markPaid = useMarkPaid();

  const debts = useMemo(() => debtsData?.debts ?? [], [debtsData?.debts]);
  const income = incomeData?.income;
  const expenses = useMemo(
    () => expensesData?.expenses ?? [],
    [expensesData?.expenses],
  );

  // Map debtId → paid record for this month (to suppress bell notifications)
  const paidThisMonth = useMemo(() => {
    const map = new Map<string, string>(); // debtId → recordId
    for (const r of paymentsData?.records ?? []) map.set(r.debtId, r.id);
    return map;
  }, [paymentsData]);

  const { notifications } = useNotifications({
    debts,
    income,
    expenses,
    debtsLoading,
    incomeLoading,
    paidThisMonth,
    notifyDueDates: settingsData?.preferences?.notifyDueDates ?? true,
    notifyLowBuffer: settingsData?.preferences?.notifyLowBuffer ?? true,
  });

  const initials = user
    ? (user.name || user.email || "U").slice(0, 2).toUpperCase()
    : "U";

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
          {activeTab !== "settings" && activeTab !== "documents" && <AccelerationTracker />}
          <div key={activeTab} className="tab-fade-in">
            {activeTab === "debts" && (
              <DebtTab
                debts={debts}
                isLoading={debtsLoading}
                openPaymentDebtId={openPaymentDebtId}
                onPaymentPanelOpened={() => setOpenPaymentDebtId(null)}
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
            {activeTab === "documents" && <DocumentImport />}
            {activeTab === "settings" && <SettingsTab user={user} />}
          </div>
        </main>
      </div>

      <ToastNotifications debts={debts} />

      <style>{`
        .db-main { margin-left: 240px; }
        @media (max-width: 768px) {
          .db-main { margin-left: 0 !important; }
          .db-sidebar { transform: translateX(-100%); box-shadow: 4px 0 24px rgba(15,23,42,0.12); }
          .db-hamburger { display: flex !important; }
          .db-mobile-logo { display: block !important; }
          .db-page-title { display: none !important; }
          .db-username { display: none !important; }
          .db-content { padding: 16px !important; }
        }
      `}</style>
    </div>
  );
}
