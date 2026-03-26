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
import NotificationPanel from "@/components/dashboard/NotificationPanel";
import { useNotifications } from "@/components/dashboard/useNotifications";
import Image from "next/image";
import { Menu, X } from "lucide-react";
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
        <header
          style={{
            background: "#ffffff",
            borderBottom: "1px solid rgba(15,23,42,0.07)",
            padding: "0 24px",
            height: "64px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            position: "sticky",
            top: 0,
            zIndex: 30,
            gap: "16px",
          }}
        >
          {/* Mobile hamburger */}
          <button
            className="db-hamburger"
            onClick={() => setSidebarOpen((o) => !o)}
            style={{
              display: "none",
              background: "transparent",
              border: "1px solid rgba(15,23,42,0.1)",
              borderRadius: "8px",
              padding: "7px",
              cursor: "pointer",
              color: "#64748b",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            {sidebarOpen ? <X size={18} /> : <Menu size={18} />}
          </button>

          {/* Mobile logo */}
          <a
            href="/"
            className="db-mobile-logo"
            style={{ display: "none", textDecoration: "none", flexShrink: 0 }}
          >
            <Image
              src="/logo-dark.svg"
              alt="SnowballPay"
              width={130}
              height={26}
            />
          </a>

          {/* Page title */}
          <div className="db-page-title" style={{ flex: 1 }}>
            <h1
              style={{
                fontSize: "17px",
                fontWeight: 700,
                color: "#0f172a",
                margin: 0,
              }}
            >
              {tabLabels[activeTab]}
            </h1>
          </div>

          {/* Right cluster */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "10px",
              flexShrink: 0,
            }}
          >
            <NotificationPanel
              notifications={notifications}
              tabLabels={tabLabels}
              onNavigate={(tab, debtId) => {
                setActiveTab(tab);
                if (debtId) setOpenPaymentDebtId(debtId);
              }}
              onMarkPaid={(debtId, amount, year, month) =>
                markPaid.mutate({ debtId, amount, dueYear: year, dueMonth: month })
              }
            />

            {/* User avatar chip */}
            {user && (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  padding: "6px 10px",
                  background: "#f8fafc",
                  border: "1px solid rgba(15,23,42,0.08)",
                  borderRadius: "10px",
                  cursor: "default",
                }}
              >
                {user.picture ? (
                  <Image
                    src={user.picture}
                    alt={user.name ?? "User"}
                    width={26}
                    height={26}
                    referrerPolicy="no-referrer"
                    style={{
                      borderRadius: "50%",
                      width: "26px",
                      height: "26px",
                      objectFit: "cover",
                    }}
                  />
                ) : (
                  <div
                    style={{
                      width: "26px",
                      height: "26px",
                      borderRadius: "50%",
                      background: "#eff6ff",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "10px",
                      fontWeight: 700,
                      color: "#2563eb",
                    }}
                  >
                    {initials}
                  </div>
                )}
                <span
                  style={{
                    fontSize: "13px",
                    fontWeight: 500,
                    color: "#0f172a",
                  }}
                  className="db-username"
                >
                  {user.name?.split(" ")[0] ||
                    user.email?.split("@")[0] ||
                    "User"}
                </span>
              </div>
            )}
          </div>
        </header>

        {/* Content */}
        <main
          style={{ flex: 1, padding: "28px", width: "100%" }}
          className="db-content"
        >
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
