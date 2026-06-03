import Image from "next/image";
import {
  Calendar,
  CreditCard,
  Wallet,
  TrendingDown,
  BarChart2,
  Lightbulb,
  Settings,
  LogOut,
} from "lucide-react";
import { type Tab } from "./types";
import { LOGOUT_URL, runLogoutClientCleanup } from "@/lib/logout-client";

const navItems = [
  { id: "this-month", label: "This Month",      icon: Calendar },
  { id: "debts",      label: "My Debts",        icon: CreditCard },
  { id: "income",     label: "Income & Budget", icon: Wallet },
  { id: "plan",       label: "My Plan",         icon: TrendingDown },
  { id: "progress",   label: "Progress",        icon: BarChart2 },
  { id: "intelligence", label: "Intelligence",    icon: Lightbulb },
];

interface DashboardSidebarProps {
  activeTab: Tab;
  setActiveTab: (tab: Tab) => void;
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
}

export default function DashboardSidebar({
  activeTab,
  setActiveTab,
  sidebarOpen,
  setSidebarOpen,
}: DashboardSidebarProps) {
  return (
    <>
      <aside
        style={{
          width: "220px",
          flexShrink: 0,
          background: "rgba(255,255,255,0.88)",
          borderRight: "1px solid rgba(15,23,42,0.08)",
          boxShadow: "18px 0 54px rgba(15,23,42,0.055)",
          backdropFilter: "blur(18px) saturate(135%)",
          WebkitBackdropFilter: "blur(18px) saturate(135%)",
          display: "flex",
          flexDirection: "column",
          position: "fixed",
          top: 0,
          left: 0,
          bottom: 0,
          zIndex: 40,
          transition: "transform 0.58s cubic-bezier(0.32,0.72,0,1)",
          transform: sidebarOpen ? "translateX(0)" : undefined,
        }}
        className="db-sidebar"
      >
        {/* Logo */}
        <div
          style={{
            padding: "22px 20px 16px",
            borderBottom: "1px solid rgba(15,23,42,0.07)",
          }}
        >
          <a href="/" style={{ display: "flex", alignItems: "center", textDecoration: "none" }}>
            <Image src="/logo-dark.svg" alt="SnowballPay" width={140} height={26} priority />
          </a>
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, padding: "14px 10px", overflowY: "auto" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    setActiveTab(item.id as Tab);
                    setSidebarOpen(false);
                  }}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "10px",
                    padding: "10px 12px",
                    borderRadius: "10px",
                    border: "none",
                    cursor: "pointer",
                    fontFamily: "inherit",
                    fontSize: "13px",
                    fontWeight: isActive ? 700 : 500,
                    textAlign: "left",
                    width: "100%",
                    transition: "background-color 0.15s, color 0.15s",
                    background: isActive ? "#eff6ff" : "transparent",
                    color: isActive ? "#2563eb" : "#536078",
                    position: "relative",
                  }}
                >
                  {isActive && (
                    <span
                      style={{
                        position: "absolute",
                        left: 0,
                        top: "20%",
                        bottom: "20%",
                        width: "3px",
                        borderRadius: "0 3px 3px 0",
                        background: "#2563eb",
                      }}
                    />
                  )}
                  <Icon size={16} strokeWidth={isActive ? 2.2 : 1.7} />
                  {item.label}
                </button>
              );
            })}
          </div>
        </nav>

        {/* Footer — Settings + Sign Out */}
        <div
          style={{
            padding: "12px 10px",
            borderTop: "1px solid rgba(15,23,42,0.07)",
            display: "flex",
            flexDirection: "column",
            gap: "2px",
          }}
        >
          <button
            onClick={() => {
              setActiveTab("settings");
              setSidebarOpen(false);
            }}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "10px",
              padding: "10px 12px",
              borderRadius: "10px",
              border: "none",
              cursor: "pointer",
              fontFamily: "inherit",
              fontSize: "13px",
              fontWeight: activeTab === "settings" ? 700 : 500,
              color: activeTab === "settings" ? "#2563eb" : "#536078",
              background: activeTab === "settings" ? "#eff6ff" : "transparent",
              textAlign: "left",
              width: "100%",
              position: "relative",
              transition: "background-color 0.15s, color 0.15s",
            }}
          >
            {activeTab === "settings" && (
              <span
                style={{
                  position: "absolute",
                  left: 0,
                  top: "20%",
                  bottom: "20%",
                  width: "3px",
                  borderRadius: "0 3px 3px 0",
                  background: "#2563eb",
                }}
              />
            )}
            <Settings size={16} strokeWidth={activeTab === "settings" ? 2.2 : 1.7} />
            Settings
          </button>

          <a
            href={LOGOUT_URL}
            onClick={runLogoutClientCleanup}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "10px",
              padding: "10px 12px",
              borderRadius: "10px",
              fontSize: "13px",
              fontWeight: 500,
              color: "#64748b",
              textDecoration: "none",
              width: "100%",
              transition: "color 0.15s",
            }}
          >
            <LogOut size={16} strokeWidth={1.7} />
            Sign Out
          </a>
        </div>
      </aside>

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          onClick={() => setSidebarOpen(false)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(15,23,42,0.3)",
            zIndex: 39,
          }}
        />
      )}
    </>
  );
}
