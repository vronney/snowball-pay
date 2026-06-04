"use client";

import { User, ExternalLink } from "lucide-react";
import Image from "next/image";

interface ProfileSectionProps {
  user: {
    name?: string | null;
    email?: string | null;
    picture?: string | null;
  } | null;
}

export function ProfileSection({ user }: ProfileSectionProps) {
  const initials = (user?.name || user?.email || "U").slice(0, 2).toUpperCase();

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

  const divider = (
    <div style={{ height: "1px", background: "rgba(15,23,42,0.06)", margin: "16px 0" }} />
  );

  return (
    <div style={cardStyle}>
      {sectionTitle("Profile", <User size={16} style={{ color: "#2563eb" }} />)}
      <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
        {user?.picture ? (
          <Image
            src={user.picture}
            alt={user.name ?? "User"}
            width={56}
            height={56}
            referrerPolicy="no-referrer"
            style={{
              borderRadius: "50%",
              objectFit: "cover",
              border: "2px solid rgba(37,99,235,0.15)",
            }}
          />
        ) : (
          <div
            style={{
              width: "56px",
              height: "56px",
              borderRadius: "50%",
              background: "#eff6ff",
              border: "2px solid rgba(37,99,235,0.2)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "18px",
              fontWeight: 700,
              color: "#2563eb",
              flexShrink: 0,
            }}
          >
            {initials}
          </div>
        )}
        <div>
          <p style={{ fontSize: "15px", fontWeight: 600, color: "#0f172a", margin: "0 0 2px" }}>
            {user?.name || "User"}
          </p>
          <p style={{ fontSize: "13px", color: "#64748b", margin: 0 }}>
            {user?.email || ""}
          </p>
        </div>
      </div>
      {divider}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "10px", flexWrap: "wrap" }}>
        <p style={{ fontSize: "12px", color: "#94a3b8", margin: 0 }}>
          Profile information is managed through your Auth0 account.
        </p>
        <a
          href="/contact"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "5px",
            fontSize: "12px",
            fontWeight: 600,
            color: "#2563eb",
            textDecoration: "none",
            border: "1px solid rgba(37,99,235,0.2)",
            background: "rgba(37,99,235,0.06)",
            borderRadius: "7px",
            padding: "5px 10px",
          }}
        >
          <ExternalLink size={12} />
          Contact Support
        </a>
      </div>
    </div>
  );
}
