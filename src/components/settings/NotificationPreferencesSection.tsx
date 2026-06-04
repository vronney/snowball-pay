"use client";

import { Bell, Mail } from "lucide-react";
import { useUserSettings, useUpdatePreferences } from "@/lib/hooks";
import { Toggle } from "@/components/settings/Toggle";

export function NotificationPreferencesSection() {
  const { data: savedSettings } = useUserSettings();
  const updatePreferences = useUpdatePreferences();

  const notifyDueDates = savedSettings?.preferences?.notifyDueDates ?? true;
  const notifyLowBuffer = savedSettings?.preferences?.notifyLowBuffer ?? true;
  const emailOptOut = savedSettings?.preferences?.emailOptOut ?? false;
  const actionChecks: Record<string, boolean> =
    savedSettings?.preferences?.actionChecks ?? {};
  const notifyWeeklyProgress = actionChecks.weeklyProgress ?? false;
  const notifyMonthlyReview = actionChecks.monthlyReview ?? false;
  const notifyMilestones = actionChecks.milestones ?? true;
  const notifyBudgetChanges = actionChecks.budgetChanges ?? false;
  const emailDigest = savedSettings?.preferences?.emailDigest ?? true;

  const updateActionCheck = (key: string, value: boolean) => {
    updatePreferences.mutate({
      actionChecks: { ...actionChecks, [key]: value },
    });
  };

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
      {sectionTitle("Notifications", <Bell size={16} style={{ color: "#2563eb" }} />)}
      <p style={{ fontSize: "13px", color: "#64748b", marginBottom: "20px", marginTop: "-12px" }}>
        Choose which alerts appear in the notification bell.
      </p>

      <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
        <p
          style={{
            fontSize: "11px",
            fontWeight: 700,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            color: "#94a3b8",
            margin: 0,
          }}
        >
          Action & Alerts
        </p>

        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "16px" }}>
          <div>
            <p style={{ fontSize: "14px", fontWeight: 500, color: "#0f172a", margin: "0 0 2px" }}>
              Payment due date reminders
            </p>
            <p style={{ fontSize: "12px", color: "#64748b", margin: 0 }}>
              Alert when a debt payment is due within 7 days.
            </p>
          </div>
          <Toggle checked={notifyDueDates} onChange={(v) => updatePreferences.mutate({ notifyDueDates: v })} />
        </div>

        {divider}

        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "16px" }}>
          <div>
            <p style={{ fontSize: "14px", fontWeight: 500, color: "#0f172a", margin: "0 0 2px" }}>
              Low cash buffer warning
            </p>
            <p style={{ fontSize: "12px", color: "#64748b", margin: 0 }}>
              Alert when post-acceleration cash falls below 10% of take-home.
            </p>
          </div>
          <Toggle checked={notifyLowBuffer} onChange={(v) => updatePreferences.mutate({ notifyLowBuffer: v })} />
        </div>

        {divider}

        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "16px" }}>
          <div>
            <p style={{ fontSize: "14px", fontWeight: 500, color: "#0f172a", margin: "0 0 2px" }}>
              Budget change alerts
            </p>
            <p style={{ fontSize: "12px", color: "#64748b", margin: 0 }}>
              Alert when income or expense changes significantly affect your plan.
            </p>
          </div>
          <Toggle checked={notifyBudgetChanges} onChange={(v) => updateActionCheck("budgetChanges", v)} />
        </div>

        {divider}

        <p
          style={{
            fontSize: "11px",
            fontWeight: 700,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            color: "#94a3b8",
            margin: 0,
          }}
        >
          Motivation & Summaries
        </p>

        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "16px" }}>
          <div>
            <p style={{ fontSize: "14px", fontWeight: 500, color: "#0f172a", margin: "0 0 2px" }}>
              Milestone celebrations
            </p>
            <p style={{ fontSize: "12px", color: "#64748b", margin: 0 }}>
              Notify when you hit a debt payoff milestone (e.g. under $10k).
            </p>
          </div>
          <Toggle checked={notifyMilestones} onChange={(v) => updateActionCheck("milestones", v)} />
        </div>

        {divider}

        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "16px" }}>
          <div>
            <p style={{ fontSize: "14px", fontWeight: 500, color: "#0f172a", margin: "0 0 2px" }}>
              Weekly progress summary
            </p>
            <p style={{ fontSize: "12px", color: "#64748b", margin: 0 }}>
              Weekly email recap of payments made and balance changes. Delivered every Monday.
            </p>
          </div>
          <Toggle checked={notifyWeeklyProgress} onChange={(v) => updateActionCheck("weeklyProgress", v)} />
        </div>

        {divider}

        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "16px" }}>
          <div>
            <p style={{ fontSize: "14px", fontWeight: 500, color: "#0f172a", margin: "0 0 2px" }}>
              Monthly review reminder
            </p>
            <p style={{ fontSize: "12px", color: "#64748b", margin: 0 }}>
              Monthly email reminder to review your budget and balances. Sent on the 1st of each month.
            </p>
          </div>
          <Toggle checked={notifyMonthlyReview} onChange={(v) => updateActionCheck("monthlyReview", v)} />
        </div>

        {divider}

        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "16px" }}>
          <div>
            <p style={{ fontSize: "14px", fontWeight: 500, color: "#0f172a", margin: "0 0 2px" }}>
              Weekly digest email
            </p>
            <p style={{ fontSize: "12px", color: "#64748b", margin: 0 }}>
              Milestone recap for weeks when you log payments. Sent every Sunday.
            </p>
          </div>
          <Toggle checked={emailDigest} onChange={(v) => updatePreferences.mutate({ emailDigest: v })} />
        </div>
      </div>

      {/* Channels */}
      <div style={{ marginTop: "24px" }}>
        <p
          style={{
            fontSize: "11px",
            fontWeight: 700,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            color: "#94a3b8",
            marginBottom: "12px",
          }}
        >
          Channels
        </p>
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "10px 14px",
              borderRadius: "10px",
              background: emailOptOut ? "rgba(15,23,42,0.03)" : "rgba(37,99,235,0.04)",
              border: emailOptOut ? "1px solid rgba(15,23,42,0.07)" : "1px solid rgba(37,99,235,0.12)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <Mail size={14} style={{ color: emailOptOut ? "#94a3b8" : "#2563eb" }} />
              <div>
                <span style={{ fontSize: "13px", fontWeight: 500, color: emailOptOut ? "#94a3b8" : "#0f172a" }}>
                  Email
                </span>
                {emailOptOut && (
                  <p style={{ fontSize: "11px", color: "#94a3b8", margin: "1px 0 0" }}>
                    All notification emails paused
                  </p>
                )}
              </div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              {emailOptOut ? (
                <>
                  <span style={{ fontSize: "12px", fontWeight: 600, color: "#94a3b8", background: "rgba(15,23,42,0.05)", padding: "2px 8px", borderRadius: "999px" }}>
                    Opted out
                  </span>
                  <button
                    type="button"
                    onClick={() => updatePreferences.mutate({ emailOptOut: false })}
                    style={{
                      fontSize: "12px",
                      fontWeight: 600,
                      color: "#2563eb",
                      background: "none",
                      border: "1px solid rgba(37,99,235,0.3)",
                      borderRadius: "6px",
                      padding: "3px 10px",
                      cursor: "pointer",
                      fontFamily: "inherit",
                    }}
                  >
                    Re-subscribe
                  </button>
                </>
              ) : (
                <>
                  <span style={{ fontSize: "12px", fontWeight: 600, color: "#059669", background: "rgba(5,150,105,0.08)", padding: "2px 8px", borderRadius: "999px" }}>
                    Active
                  </span>
                  <button
                    type="button"
                    onClick={() => updatePreferences.mutate({ emailOptOut: true })}
                    style={{
                      fontSize: "12px",
                      fontWeight: 600,
                      color: "#64748b",
                      background: "none",
                      border: "1px solid rgba(15,23,42,0.15)",
                      borderRadius: "6px",
                      padding: "3px 10px",
                      cursor: "pointer",
                      fontFamily: "inherit",
                    }}
                  >
                    Opt out
                  </button>
                </>
              )}
            </div>
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "10px 14px",
              borderRadius: "10px",
              background: "rgba(15,23,42,0.03)",
              border: "1px solid rgba(15,23,42,0.07)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <Bell size={14} style={{ color: "#94a3b8" }} />
              <span style={{ fontSize: "13px", fontWeight: 500, color: "#94a3b8" }}>
                Push / SMS
              </span>
            </div>
            <span style={{ fontSize: "12px", fontWeight: 600, color: "#94a3b8", background: "rgba(15,23,42,0.05)", padding: "2px 8px", borderRadius: "999px" }}>
              Coming soon
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
