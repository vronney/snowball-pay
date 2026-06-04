"use client";

import { LogOut } from "lucide-react";
import { LOGOUT_URL, runLogoutClientCleanup } from "@/lib/logout-client";

export function AccountSection() {
  const cardStyle = {
    background: "#ffffff",
    border: "1px solid rgba(15,23,42,0.08)",
    boxShadow: "0 1px 4px rgba(15,23,42,0.06)",
    borderRadius: "16px",
    padding: "24px",
  };

  const sectionTitle = (label: string, icon: React.ReactNode) => (
    <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "20px" }}>
      {icon}
      <h2 style={{ fontSize: "15px", fontWeight: 700, color: "#0f172a", margin: 0 }}>
        {label}
      </h2>
    </div>
  );

  return (
    <div style={cardStyle}>
      {sectionTitle("Account", <LogOut size={16} style={{ color: "#2563eb" }} />)}
      <a
        href={LOGOUT_URL}
        onClick={runLogoutClientCleanup}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: "8px",
          padding: "9px 16px",
          borderRadius: "10px",
          fontSize: "13px",
          fontWeight: 600,
          color: "#334155",
          textDecoration: "none",
          background: "#f8fafc",
          border: "1px solid rgba(15,23,42,0.1)",
        }}
      >
        <LogOut size={14} />
        Sign Out
      </a>
    </div>
  );
}
