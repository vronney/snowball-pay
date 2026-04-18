"use client";

import Image from "next/image";
import {
  Home,
  CreditCard,
  Wallet,
  TrendingDown,
  BarChart2,
  Sparkles,
  Settings,
  LogOut,
  HelpCircle,
} from "lucide-react";
import { type Tab } from "./types";
import { LOGOUT_URL, runLogoutClientCleanup } from "@/lib/logout-client";

const navItems = [
  { id: "home",         label: "Home",        icon: Home },
  { id: "debts",        label: "My Debts",    icon: CreditCard },
  { id: "income",       label: "Income",      icon: Wallet },
  { id: "plan",         label: "Payoff Plan", icon: TrendingDown },
  { id: "progress",     label: "Progress",    icon: BarChart2 },
  { id: "intelligence", label: "Intelligence",icon: Sparkles },
  { id: "help",         label: "Help",        icon: HelpCircle },
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
      {/* Sidebar */}
      <aside
        style={{
          width: "240px",
          flexShrink: 0,
          background: "#ffffff",
          borderRight: "1px solid rgba(15,23,42,0.07)",
          display: "flex",
          flexDirection: "column",
          position: "fixed",
          top: 0,
          left: 0,
          bottom: 0,
          zIndex: 40,
          transition: "transform 0.25s ease",
          transform: sidebarOpen ? "translateX(0)" : undefined,
        }}
        className="db-sidebar"
      >
        {/* Logo */}
        <div
          style={{
            padding: "20px 20px 16px",
            borderBottom: "1px solid rgba(15,23,42,0.06)",
          }}
        >
          <a
            href="/"
            style={{
              display: "flex",
              alignItems: "center",
              textDecoration: "none",
            }}
          >
            <Image
              src="/logo-dark.svg"
              alt="SnowballPay"
              width={148}
              height={28}
              priority
            />
          </a>
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, padding: "16px 12px", overflowY: "auto" }}>
          <p
            style={{
              fontSize: "10px",
              fontWeight: 700,
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              color: "#94a3b8",
              padding: "0 8px",
              marginBottom: "8px",
            }}
          >
            Main Menu
          </p>
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
                    fontSize: "13.5px",
                    fontWeight: isActive ? 600 : 400,
                    textAlign: "left",
                    width: "100%",
                    transition: "all 0.15s ease",
                    background: isActive ? "#eff6ff" : "transparent",
                    color: isActive ? "#2563eb" : "#64748b",
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
                  <Icon size={16} strokeWidth={isActive ? 2.5 : 2} />
                  {item.label}
                </button>
              );
            })}
          </div>

          <div
            style={{
              height: "1px",
              background: "rgba(15,23,42,0.06)",
              margin: "16px 8px",
            }}
          />
          <p
            style={{
              fontSize: "10px",
              fontWeight: 700,
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              color: "#94a3b8",
              padding: "0 8px",
              marginBottom: "8px",
            }}
          >
            Account
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
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
                fontSize: "13.5px",
                fontWeight: activeTab === "settings" ? 600 : 400,
                color: activeTab === "settings" ? "#2563eb" : "#64748b",
                background:
                  activeTab === "settings" ? "#eff6ff" : "transparent",
                cursor: "pointer",
                fontFamily: "inherit",
                textAlign: "left",
                width: "100%",
                transition: "all 0.15s",
                position: "relative",
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
              <Settings
                size={16}
                strokeWidth={activeTab === "settings" ? 2.5 : 2}
              />
              Settings
            </button>
          </div>
        </nav>

        {/* User + Logout */}
        <div
          style={{
            padding: "12px",
            borderTop: "1px solid rgba(15,23,42,0.06)",
          }}
        >
          <a
            href={LOGOUT_URL}
            onClick={runLogoutClientCleanup}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              padding: "9px 12px",
              borderRadius: "9px",
              fontSize: "13px",
              fontWeight: 500,
              color: "#ef4444",
              textDecoration: "none",
              background: "rgba(239,68,68,0.06)",
              border: "1px solid rgba(239,68,68,0.1)",
              width: "100%",
            }}
          >
            <LogOut size={14} />
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
