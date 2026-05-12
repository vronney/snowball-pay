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
        background: "rgba(255,255,255,0.78)",
        borderBottom: "1px solid rgba(15,23,42,0.08)",
        boxShadow: "0 18px 48px rgba(15,23,42,0.06)",
        backdropFilter: "blur(18px) saturate(140%)",
        WebkitBackdropFilter: "blur(18px) saturate(140%)",
        padding: "0 28px",
        height: "76px",
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
          background: "rgba(255,255,255,0.82)",
          border: "1px solid rgba(15,23,42,0.11)",
          borderRadius: "999px",
          padding: "9px",
          cursor: "pointer",
          color: "#536078",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
          boxShadow: "inset 0 1px 0 rgba(255,255,255,0.86)",
          transition: "transform 0.44s cubic-bezier(0.32,0.72,0,1), border-color 0.44s cubic-bezier(0.32,0.72,0,1)",
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
        <h1 style={{ fontSize: "18px", fontWeight: 900, color: "#0b1220", margin: 0, letterSpacing: "-0.025em" }}>
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
              padding: "7px 11px",
              background: "rgba(255,255,255,0.86)",
              border: "1px solid rgba(15,23,42,0.09)",
              borderRadius: "999px",
              cursor: "default",
              boxShadow: "inset 0 1px 0 rgba(255,255,255,0.86)",
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
                  background: "#eef4ff",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "10px",
                  fontWeight: 900,
                  color: "#2563eb",
                }}
              >
                {initials}
              </div>
            )}
            <span
              style={{ fontSize: "13px", fontWeight: 700, color: "#172033" }}
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
