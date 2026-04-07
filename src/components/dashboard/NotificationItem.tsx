"use client";

import { CheckCircle2, X } from "lucide-react";
import { type Notification, type Tab } from "./types";

const today = new Date();

function getNotifStyle(
  type: Notification["type"],
  daysUntil?: number,
): { bg: string; border: string; iconColor: string; badgeColor: string; badgeBg: string } {
  if (daysUntil !== undefined) {
    if (daysUntil === 0)
      return { bg: "rgba(153,27,27,0.07)",   border: "rgba(153,27,27,0.22)",   iconColor: "#b91c1c", badgeColor: "#b91c1c", badgeBg: "rgba(153,27,27,0.1)" };
    if (daysUntil <= 2)
      return { bg: "rgba(239,68,68,0.06)",   border: "rgba(239,68,68,0.2)",    iconColor: "#ef4444", badgeColor: "#dc2626", badgeBg: "rgba(239,68,68,0.1)" };
    if (daysUntil === 3)
      return { bg: "rgba(249,115,22,0.06)",  border: "rgba(249,115,22,0.2)",   iconColor: "#f97316", badgeColor: "#ea580c", badgeBg: "rgba(249,115,22,0.1)" };
    if (daysUntil <= 5)
      return { bg: "rgba(245,158,11,0.06)",  border: "rgba(245,158,11,0.2)",   iconColor: "#f59e0b", badgeColor: "#d97706", badgeBg: "rgba(245,158,11,0.1)" };
    return   { bg: "rgba(234,179,8,0.05)",   border: "rgba(234,179,8,0.18)",   iconColor: "#ca8a04", badgeColor: "#ca8a04", badgeBg: "rgba(234,179,8,0.09)" };
  }
  if (type === "urgent")
    return { bg: "rgba(239,68,68,0.06)",  border: "rgba(239,68,68,0.15)",  iconColor: "#ef4444", badgeColor: "#ef4444", badgeBg: "rgba(239,68,68,0.1)" };
  if (type === "warning")
    return { bg: "rgba(245,158,11,0.06)", border: "rgba(245,158,11,0.18)", iconColor: "#d97706", badgeColor: "#d97706", badgeBg: "rgba(245,158,11,0.1)" };
  return   { bg: "rgba(37,99,235,0.05)",  border: "rgba(37,99,235,0.12)",  iconColor: "#2563eb", badgeColor: "#2563eb", badgeBg: "rgba(37,99,235,0.08)" };
}

function dueBadgeLabel(daysUntil: number): string {
  if (daysUntil === 0) return "Today";
  if (daysUntil === 1) return "Tomorrow";
  return `${daysUntil}d`;
}

interface NotificationItemProps {
  notif: Notification;
  tabLabels: Record<Tab, string>;
  onNavigate: (tab: Tab, debtId?: string) => void;
  onMarkPaid: (debtId: string, amount: number, year: number, month: number) => void;
  onClose: () => void;
  onDismiss: (id: string) => void;
}

export default function NotificationItem({
  notif,
  tabLabels,
  onNavigate,
  onMarkPaid,
  onClose,
  onDismiss,
}: NotificationItemProps) {
  const Icon = notif.icon;
  const s = getNotifStyle(notif.type, notif.daysUntil);

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "8px",
        padding: "10px 12px",
        borderRadius: "10px",
        border: `1px solid ${s.border}`,
        background: s.bg,
        marginBottom: "6px",
        position: "relative",
      }}
    >
      {/* Dismiss button */}
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); onDismiss(notif.id); }}
        aria-label="Dismiss notification"
        style={{
          position: "absolute",
          top: "6px",
          right: "6px",
          background: "none",
          border: "none",
          cursor: "pointer",
          color: "#94a3b8",
          padding: "2px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          borderRadius: "4px",
          lineHeight: 1,
        }}
      >
        <X size={11} />
      </button>

      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onDismiss(notif.id);
          if (notif.tab) onNavigate(notif.tab, notif.debtId);
          onClose();
        }}
        style={{
          display: "flex",
          alignItems: "flex-start",
          gap: "10px",
          width: "100%",
          background: "none",
          border: "none",
          padding: 0,
          cursor: notif.tab ? "pointer" : "default",
          textAlign: "left",
          fontFamily: "inherit",
        }}
      >
        <Icon size={15} style={{ color: s.iconColor, flexShrink: 0, marginTop: "1px" }} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "2px" }}>
            <p style={{ fontSize: "13px", fontWeight: 600, color: "#0f172a", margin: 0, lineHeight: 1.3 }}>
              {notif.title}
            </p>
            {notif.daysUntil !== undefined && (
              <span
                style={{
                  fontSize: "10px",
                  fontWeight: 700,
                  color: s.badgeColor,
                  background: s.badgeBg,
                  border: `1px solid ${s.border}`,
                  borderRadius: "5px",
                  padding: "1px 5px",
                  flexShrink: 0,
                  lineHeight: 1.4,
                }}
              >
                {dueBadgeLabel(notif.daysUntil)}
              </span>
            )}
          </div>
          <p style={{ fontSize: "12px", color: "#64748b", margin: 0, lineHeight: 1.5 }}>
            {notif.body}
          </p>
          {notif.tab && (
            <p style={{ fontSize: "11px", color: s.iconColor, margin: "4px 0 0", fontWeight: 600 }}>
              Go to {tabLabels[notif.tab]} →
            </p>
          )}
        </div>
      </button>
      {notif.debtId && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onMarkPaid(notif.debtId!, notif.debtAmount ?? 0, today.getFullYear(), today.getMonth());
            onDismiss(notif.id);
          }}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "5px",
            alignSelf: "flex-start",
            padding: "4px 10px",
            borderRadius: "6px",
            border: "1px solid rgba(34,197,94,0.3)",
            background: "rgba(34,197,94,0.08)",
            color: "#059669",
            fontSize: "11px",
            fontWeight: 600,
            cursor: "pointer",
            fontFamily: "inherit",
          }}
        >
          <CheckCircle2 size={11} />
          Mark paid
        </button>
      )}
    </div>
  );
}
