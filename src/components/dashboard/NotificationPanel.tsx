"use client";

import { useState, useRef, useEffect } from "react";
import { Bell, CheckCircle2, X } from "lucide-react";
import { type Notification, type Tab } from "./types";
import NotificationItem from "./NotificationItem";

const STORAGE_KEY = "sp_dismissed_notifs";

function loadDismissed(): Set<string> {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    return raw ? new Set(JSON.parse(raw) as string[]) : new Set();
  } catch {
    return new Set();
  }
}

function saveDismissed(ids: Set<string>): void {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify([...ids]));
  } catch {
    // sessionStorage unavailable — degrade silently
  }
}

interface NotificationPanelProps {
  notifications: Notification[];
  onNavigate: (tab: Tab, debtId?: string) => void;
  onMarkPaid: (debtId: string, amount: number, year: number, month: number) => void;
  tabLabels: Record<Tab, string>;
}

export default function NotificationPanel({
  notifications,
  onNavigate,
  onMarkPaid,
  tabLabels,
}: NotificationPanelProps) {
  const [notifOpen, setNotifOpen] = useState(false);
  const [dismissed, setDismissed] = useState<Set<string>>(() => loadDismissed());
  const notifRef = useRef<HTMLDivElement>(null);

  const visible = notifications.filter((n) => !dismissed.has(n.id));

  const urgentCount  = visible.filter((n) => n.type === "urgent").length;
  const warningCount = visible.filter((n) => n.type === "warning").length;
  const badgeCount   = visible.length;

  const badgeColor = urgentCount > 0 ? "#ef4444" : warningCount > 0 ? "#f59e0b" : "#2563eb";

  function dismiss(id: string) {
    setDismissed((prev) => {
      const next = new Set(prev).add(id);
      saveDismissed(next);
      return next;
    });
  }

  function dismissAll() {
    const next = new Set(notifications.map((n) => n.id));
    saveDismissed(next);
    setDismissed(next);
  }

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
              background: badgeColor,
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
            boxShadow: "0 8px 32px rgba(15,23,42,0.12), 0 1px 4px rgba(15,23,42,0.06)",
            zIndex: 100,
            overflow: "hidden",
          }}
        >
          <div
            style={{
              padding: "14px 16px 12px",
              borderBottom: "1px solid rgba(15,23,42,0.07)",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <span style={{ fontSize: "14px", fontWeight: 700, color: "#0f172a" }}>
              Notifications
            </span>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
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
              {visible.length > 0 && (
                <button
                  type="button"
                  onClick={dismissAll}
                  style={{
                    fontSize: "11px",
                    fontWeight: 600,
                    color: "#94a3b8",
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    padding: "2px 4px",
                    fontFamily: "inherit",
                  }}
                >
                  Clear all
                </button>
              )}
            </div>
          </div>

          <div style={{ maxHeight: "380px", overflowY: "auto" }}>
            {visible.length === 0 ? (
              <div style={{ padding: "28px 16px", textAlign: "center" }}>
                <CheckCircle2 size={28} style={{ color: "#22c55e", margin: "0 auto 8px" }} />
                <p style={{ fontSize: "13px", fontWeight: 600, color: "#0f172a", margin: "0 0 4px" }}>
                  All clear!
                </p>
                <p style={{ fontSize: "12px", color: "#94a3b8", margin: 0 }}>
                  No upcoming payments or alerts.
                </p>
              </div>
            ) : (
              <div style={{ padding: "8px" }}>
                {visible.map((notif) => (
                  <NotificationItem
                    key={notif.id}
                    notif={notif}
                    tabLabels={tabLabels}
                    onNavigate={onNavigate}
                    onMarkPaid={onMarkPaid}
                    onClose={() => setNotifOpen(false)}
                    onDismiss={dismiss}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
