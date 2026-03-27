"use client";

import { useState, useRef, useEffect } from "react";
import { Bell, CheckCircle2 } from "lucide-react";
import { type Notification, type Tab } from "./types";

const today = new Date();

// Fine-grained color scale based on days until due (for due-date notifications).
// Falls back to type-based style for non-date notifications.
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

interface NotificationPanelProps {
  notifications: Notification[];
  onNavigate: (tab: Tab, debtId?: string) => void;
  onMarkPaid: (
    debtId: string,
    amount: number,
    year: number,
    month: number,
  ) => void;
  tabLabels: Record<Tab, string>;
}

export default function NotificationPanel({
  notifications,
  onNavigate,
  onMarkPaid,
  tabLabels,
}: NotificationPanelProps) {
  const [notifOpen, setNotifOpen] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);

  const urgentCount = notifications.filter((n) => n.type === "urgent").length;
  const badgeCount = notifications.filter((n) => n.type !== "info").length;

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setNotifOpen(false);
      }
    }
    if (notifOpen) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [notifOpen]);

  return (
    <div ref={notifRef} style={{ position: "relative" }}>
      <button
        type="button"
        onClick={() => setNotifOpen((o) => !o)}
        style={{
          background: notifOpen ? "#eff6ff" : "#f8fafc",
          border: `1px solid ${notifOpen ? "rgba(37,99,235,0.2)" : "rgba(15,23,42,0.08)"}`,
          borderRadius: "10px",
          padding: "8px",
          cursor: "pointer",
          color: notifOpen ? "#2563eb" : "#64748b",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          position: "relative",
          transition: "all 0.15s",
        }}
        aria-label="Notifications"
      >
        <Bell size={16} />
        {badgeCount > 0 && (
          <span
            style={{
              position: "absolute",
              top: "-4px",
              right: "-4px",
              minWidth: "17px",
              height: "17px",
              borderRadius: "999px",
              background: urgentCount > 0 ? "#ef4444" : "#f59e0b",
              color: "#fff",
              fontSize: "10px",
              fontWeight: 700,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: "0 4px",
              border: "2px solid #ffffff",
              lineHeight: 1,
            }}
          >
            {badgeCount}
          </span>
        )}
      </button>

      {/* Notification dropdown */}
      {notifOpen && (
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 8px)",
            right: 0,
            width: "320px",
            background: "#ffffff",
            border: "1px solid rgba(15,23,42,0.1)",
            borderRadius: "16px",
            boxShadow:
              "0 8px 32px rgba(15,23,42,0.12), 0 1px 4px rgba(15,23,42,0.06)",
            zIndex: 100,
            overflow: "hidden",
          }}
        >
          {/* Panel header */}
          <div
            style={{
              padding: "14px 16px 12px",
              borderBottom: "1px solid rgba(15,23,42,0.07)",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <span
              style={{ fontSize: "14px", fontWeight: 700, color: "#0f172a" }}
            >
              Notifications
            </span>
            {badgeCount > 0 && (
              <span
                style={{
                  fontSize: "11px",
                  fontWeight: 600,
                  color: "#64748b",
                  background: "#f1f5f9",
                  borderRadius: "999px",
                  padding: "2px 8px",
                }}
              >
                {badgeCount} alert{badgeCount !== 1 ? "s" : ""}
              </span>
            )}
          </div>

          {/* Notification list */}
          <div style={{ maxHeight: "380px", overflowY: "auto" }}>
            {notifications.length === 0 ? (
              <div style={{ padding: "28px 16px", textAlign: "center" }}>
                <CheckCircle2
                  size={28}
                  style={{ color: "#22c55e", margin: "0 auto 8px" }}
                />
                <p
                  style={{
                    fontSize: "13px",
                    fontWeight: 600,
                    color: "#0f172a",
                    margin: "0 0 4px",
                  }}
                >
                  All clear!
                </p>
                <p style={{ fontSize: "12px", color: "#94a3b8", margin: 0 }}>
                  No upcoming payments or alerts.
                </p>
              </div>
            ) : (
              <div style={{ padding: "8px" }}>
                {notifications.map((notif) => {
                  const Icon = notif.icon;
                  const s = getNotifStyle(notif.type, notif.daysUntil);
                  return (
                    <div
                      key={notif.id}
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: "8px",
                        padding: "10px 12px",
                        borderRadius: "10px",
                        border: `1px solid ${s.border}`,
                        background: s.bg,
                        marginBottom: "6px",
                      }}
                    >
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (notif.tab) onNavigate(notif.tab, notif.debtId);
                          setNotifOpen(false);
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
                        <Icon
                          size={15}
                          style={{
                            color: s.iconColor,
                            flexShrink: 0,
                            marginTop: "1px",
                          }}
                        />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "2px" }}>
                            <p
                              style={{
                                fontSize: "13px",
                                fontWeight: 600,
                                color: "#0f172a",
                                margin: 0,
                                lineHeight: 1.3,
                              }}
                            >
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
                          <p
                            style={{
                              fontSize: "12px",
                              color: "#64748b",
                              margin: 0,
                              lineHeight: 1.5,
                            }}
                          >
                            {notif.body}
                          </p>
                          {notif.tab && (
                            <p
                              style={{
                                fontSize: "11px",
                                color: s.iconColor,
                                margin: "4px 0 0",
                                fontWeight: 600,
                              }}
                            >
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
                            onMarkPaid(
                              notif.debtId!,
                              notif.debtAmount ?? 0,
                              today.getFullYear(),
                              today.getMonth(),
                            );
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
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
