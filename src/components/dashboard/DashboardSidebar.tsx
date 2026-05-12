"use client";

import Image from "next/image";
import {
  Home,
  CreditCard,
  Wallet,
  TrendingDown,
  BarChart2,
  Sparkles,
  BookOpen,
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
  { id: "journey",      label: "My Journey",  icon: BookOpen },
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
          width: "252px",
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
            padding: "24px 22px 18px",
            borderBottom: "1px solid rgba(15,23,42,0.07)",
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
        <nav style={{ flex: 1, padding: "18px 12px", overflowY: "auto" }}>
          <p
            style={{
              fontSize: "10px",
              fontWeight: 700,
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              color: "#667085",
              padding: "0 8px",
              marginBottom: "10px",
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
                    padding: "11px 12px",
                    borderRadius: "14px",
                    border: "none",
                    cursor: "pointer",
                    fontFamily: "inherit",
                    fontSize: "13.5px",
                    fontWeight: isActive ? 800 : 600,
                    textAlign: "left",
                    width: "100%",
                    transition: "transform 0.44s cubic-bezier(0.32,0.72,0,1), background-color 0.44s cubic-bezier(0.32,0.72,0,1), color 0.44s cubic-bezier(0.32,0.72,0,1), box-shadow 0.44s cubic-bezier(0.32,0.72,0,1)",
                    background: isActive ? "#ffffff" : "transparent",
                    color: isActive ? "#0b1220" : "#536078",
                    boxShadow: isActive
                      ? "0 12px 28px rgba(15,23,42,0.08), inset 0 1px 0 rgba(255,255,255,0.88)"
                      : "none",
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
                  <Icon size={16} strokeWidth={isActive ? 2.15 : 1.8} />
                  {item.label}
                </button>
              );
            })}
          </div>

          <div
            style={{
              height: "1px",
              background: "rgba(15,23,42,0.07)",
              margin: "16px 8px",
            }}
          />
          <p
            style={{
              fontSize: "10px",
              fontWeight: 700,
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              color: "#667085",
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
                padding: "11px 12px",
                borderRadius: "14px",
                border: "none",
                fontSize: "13.5px",
                fontWeight: activeTab === "settings" ? 800 : 600,
                color: activeTab === "settings" ? "#0b1220" : "#536078",
                background:
                  activeTab === "settings" ? "#ffffff" : "transparent",
                cursor: "pointer",
                fontFamily: "inherit",
                textAlign: "left",
                width: "100%",
                transition: "transform 0.44s cubic-bezier(0.32,0.72,0,1), background-color 0.44s cubic-bezier(0.32,0.72,0,1), color 0.44s cubic-bezier(0.32,0.72,0,1), box-shadow 0.44s cubic-bezier(0.32,0.72,0,1)",
                position: "relative",
                boxShadow: activeTab === "settings"
                  ? "0 12px 28px rgba(15,23,42,0.08), inset 0 1px 0 rgba(255,255,255,0.88)"
                  : "none",
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
                strokeWidth={activeTab === "settings" ? 2.15 : 1.8}
              />
              Settings
            </button>
          </div>
        </nav>

        {/* User + Logout */}
        <div
          style={{
            padding: "14px 12px",
            borderTop: "1px solid rgba(15,23,42,0.07)",
          }}
        >
          <a
            href={LOGOUT_URL}
            onClick={runLogoutClientCleanup}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              padding: "10px 12px",
              borderRadius: "14px",
              fontSize: "13px",
              fontWeight: 700,
              color: "#b42318",
              textDecoration: "none",
              background: "rgba(244,63,94,0.07)",
              border: "1px solid rgba(244,63,94,0.13)",
              width: "100%",
              transition: "transform 0.44s cubic-bezier(0.32,0.72,0,1), border-color 0.44s cubic-bezier(0.32,0.72,0,1)",
            }}
          >
            <LogOut size={14} strokeWidth={1.8} />
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
