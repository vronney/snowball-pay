"use client";

import Image from "next/image";
import { Menu, X } from "lucide-react";
import { type Tab } from "@/components/dashboard/types";
import { type Notification } from "@/components/dashboard/types";
import NotificationPanel from "@/components/dashboard/NotificationPanel";

type UserInfo = {
  name?: string | null;
  email?: string | null;
  picture?: string | null;
};

interface DashboardHeaderProps {
  activeTab: Tab;
  tabLabels: Record<Tab, string>;
  sidebarOpen: boolean;
  setSidebarOpen: (v: boolean) => void;
  notifications: Notification[];
  onNavigate: (tab: Tab, debtId?: string) => void;
  onMarkPaid: (debtId: string, amount: number, year: number, month: number) => void;
  user: UserInfo | null;
  initials: string;
}

export default function DashboardHeader({
  activeTab,
  tabLabels,
  sidebarOpen,
  setSidebarOpen,
  notifications,
  onNavigate,
  onMarkPaid,
  user,
  initials,
}: DashboardHeaderProps) {
  return (
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
        onClick={() => setSidebarOpen(!sidebarOpen)}
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
        <Image src="/logo-dark.svg" alt="SnowballPay" width={130} height={26} />
      </a>

      {/* Page title */}
      <div className="db-page-title" style={{ flex: 1 }}>
        <h1 style={{ fontSize: "17px", fontWeight: 700, color: "#0f172a", margin: 0 }}>
          {tabLabels[activeTab]}
        </h1>
      </div>

      {/* Right cluster */}
      <div style={{ display: "flex", alignItems: "center", gap: "10px", flexShrink: 0 }}>
        <NotificationPanel
          notifications={notifications}
          tabLabels={tabLabels}
          onNavigate={onNavigate}
          onMarkPaid={onMarkPaid}
        />

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
                style={{ borderRadius: "50%", width: "26px", height: "26px", objectFit: "cover" }}
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
              style={{ fontSize: "13px", fontWeight: 500, color: "#0f172a" }}
              className="db-username"
            >
              {user.name?.split(" ")[0] || user.email?.split("@")[0] || "User"}
            </span>
          </div>
        )}
      </div>
    </header>
  );
}
