"use client";

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useUserSettings, useUpdatePreferences } from "@/lib/hooks";
import {
  User,
  Bell,
  Trash2,
  ShieldAlert,
  CheckCircle2,
  LogOut,
  Mail,
  Sparkles,
  Zap,
  ExternalLink,
} from "lucide-react";
import axios from "axios";
import Image from "next/image";
import { useSubscription, useOpenBillingPortal } from "@/lib/hooks";
import UpgradeModal from "@/components/billing/UpgradeModal";
import {
  LOGOUT_URL,
  LOGOUT_URL_LOCAL,
  runLogoutClientCleanup,
} from "@/lib/logout-client";

interface SettingsTabProps {
  user: {
    name?: string | null;
    email?: string | null;
    picture?: string | null;
  } | null;
}

function Toggle({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      style={{
        width: "40px",
        height: "22px",
        borderRadius: "999px",
        border: "none",
        cursor: "pointer",
        padding: "2px",
        display: "flex",
        alignItems: "center",
        transition: "background 0.2s",
        background: checked ? "#2563eb" : "rgba(15,23,42,0.12)",
        flexShrink: 0,
      }}
    >
      <span
        style={{
          width: "18px",
          height: "18px",
          borderRadius: "50%",
          background: "#ffffff",
          boxShadow: "0 1px 3px rgba(15,23,42,0.2)",
          transition: "transform 0.2s",
          transform: checked ? "translateX(18px)" : "translateX(0)",
          display: "block",
        }}
      />
    </button>
  );
}

export default function SettingsTab({ user }: SettingsTabProps) {
  const { data: savedSettings } = useUserSettings();
  const updatePreferences = useUpdatePreferences();
  const queryClient = useQueryClient();

  const [clearConfirm, setClearConfirm] = useState(false);
  const [deleteConfirmInput, setDeleteConfirmInput] = useState("");
  const [clearState, setClearState] = useState<
    "idle" | "loading" | "done" | "error"
  >("idle");
  const [clearError, setClearError] = useState("");
  const [upgradeModalOpen, setUpgradeModalOpen] = useState(false);

  const { data: sub } = useSubscription();
  const openPortal = useOpenBillingPortal();

  const isPro = sub?.paidTier === "pro";

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

  const initials = (user?.name || user?.email || "U").slice(0, 2).toUpperCase();
  const deletePhrase = "DELETE";
  const deleteEnabled =
    deleteConfirmInput.trim().toUpperCase() === deletePhrase;

  const handleClearData = async () => {
    setClearState("loading");
    setClearError("");
    try {
      await axios.delete("/api/user/data");
      queryClient.clear();
      runLogoutClientCleanup();
      setClearState("done");
      setClearConfirm(false);
      window.location.assign(LOGOUT_URL_LOCAL);
    } catch (error) {
      const message = axios.isAxiosError(error)
        ? error.response?.data?.error
        : undefined;
      setClearError(
        typeof message === "string"
          ? message
          : "We could not delete your account. Please try again or contact support.",
      );
      setClearState("error");
    }
  };

  const cardStyle = {
    background: "#ffffff",
    border: "1px solid rgba(15,23,42,0.08)",
    boxShadow: "0 1px 4px rgba(15,23,42,0.06)",
    borderRadius: "16px",
    padding: "24px",
  };

  const sectionTitle = (label: string, icon: React.ReactNode) => (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: "8px",
        marginBottom: "20px",
      }}
    >
      {icon}
      <h2
        style={{
          fontSize: "15px",
          fontWeight: 700,
          color: "#0f172a",
          margin: 0,
        }}
      >
        {label}
      </h2>
    </div>
  );

  const divider = (
    <div
      style={{
        height: "1px",
        background: "rgba(15,23,42,0.06)",
        margin: "16px 0",
      }}
    />
  );

  return (
    <div
      style={{
        maxWidth: "640px",
        display: "flex",
        flexDirection: "column",
        gap: "20px",
      }}
    >
      {/* Profile */}
      <div style={cardStyle}>
        {sectionTitle(
          "Profile",
          <User size={16} style={{ color: "#2563eb" }} />,
        )}
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
            <p
              style={{
                fontSize: "15px",
                fontWeight: 600,
                color: "#0f172a",
                margin: "0 0 2px",
              }}
            >
              {user?.name || "User"}
            </p>
            <p style={{ fontSize: "13px", color: "#64748b", margin: 0 }}>
              {user?.email || ""}
            </p>
          </div>
        </div>
        {divider}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "10px",
            flexWrap: "wrap",
          }}
        >
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

      {/* Subscription / Plan */}
      <div
        style={{
          ...cardStyle,
          background: isPro
            ? "linear-gradient(135deg, #f0f5ff 0%, #f5f0ff 100%)"
            : "#ffffff",
          border: isPro
            ? "1px solid rgba(37,99,235,0.15)"
            : "1px solid rgba(15,23,42,0.08)",
        }}
      >
        {sectionTitle(
          "Plan",
          <Sparkles
            size={16}
            style={{ color: isPro ? "#7c3aed" : "#2563eb" }}
          />,
        )}

        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            gap: "16px",
            flexWrap: "wrap",
          }}
        >
          <div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                marginBottom: "6px",
              }}
            >
              <span
                style={{ fontSize: "20px", fontWeight: 800, color: "#0f172a" }}
              >
                {isPro ? "Pro" : "Free"}
              </span>
              {isPro && sub?.isCanceling && (
                <span
                  style={{
                    fontSize: "11px",
                    fontWeight: 700,
                    color: "#ef4444",
                    background: "rgba(239,68,68,0.08)",
                    padding: "2px 8px",
                    borderRadius: "999px",
                  }}
                >
                  Canceling
                </span>
              )}
              {isPro &&
                !sub?.isCanceling &&
                sub?.subscriptionStatus === "trialing" && (
                  <span
                    style={{
                      fontSize: "11px",
                      fontWeight: 700,
                      color: "#d97706",
                      background: "rgba(217,119,6,0.1)",
                      padding: "2px 8px",
                      borderRadius: "999px",
                    }}
                  >
                    Trial
                  </span>
                )}
              {isPro &&
                !sub?.isCanceling &&
                sub?.subscriptionStatus !== "trialing" && (
                  <span
                    style={{
                      fontSize: "11px",
                      fontWeight: 700,
                      color: "#7c3aed",
                      background: "rgba(124,58,237,0.1)",
                      padding: "2px 8px",
                      borderRadius: "999px",
                    }}
                  >
                    Active
                  </span>
                )}
            </div>
            {isPro ? (
              <p style={{ fontSize: "13px", color: "#64748b", margin: 0 }}>
                {sub?.isCanceling ? (
                  <>
                    Pro access ends{" "}
                    {sub.subscriptionEndsAt
                      ? new Date(sub.subscriptionEndsAt).toLocaleDateString()
                      : ""}
                    . You can resubscribe anytime.
                  </>
                ) : (
                  <>
                    You have access to all Pro features.
                    {sub?.subscriptionEndsAt &&
                      sub.subscriptionStatus === "trialing" && (
                        <>
                          {" "}
                          {typeof sub.monthlyPrice === "number"
                            ? `$${sub.monthlyPrice.toFixed(2)}/mo`
                            : "Pro monthly"}{" "}
                          - Free trial ends{" "}
                          {new Date(
                            sub.subscriptionEndsAt,
                          ).toLocaleDateString()}
                          .
                        </>
                      )}
                    {sub?.subscriptionEndsAt &&
                      sub.subscriptionStatus !== "trialing" && (
                        <>
                          {" "}
                          {typeof sub.monthlyPrice === "number"
                            ? `$${sub.monthlyPrice.toFixed(2)}/mo`
                            : "Pro monthly"}{" "}
                          - Renews on{" "}
                          {new Date(
                            sub.subscriptionEndsAt,
                          ).toLocaleDateString()}
                          .
                        </>
                      )}
                  </>
                )}
              </p>
            ) : (
              <p style={{ fontSize: "13px", color: "#64748b", margin: 0 }}>
                Upgrade to unlock AI recommendations, unlimited debts, advanced
                analytics, and more.
              </p>
            )}
          </div>

          {isPro ? (
            <button
              type="button"
              onClick={() => openPortal.mutate()}
              disabled={openPortal.isPending}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "6px",
                padding: "8px 16px",
                borderRadius: "10px",
                border: "1px solid rgba(37,99,235,0.2)",
                background: "rgba(37,99,235,0.06)",
                fontSize: "13px",
                fontWeight: 600,
                cursor: "pointer",
                color: "#2563eb",
                fontFamily: "inherit",
                flexShrink: 0,
                opacity: openPortal.isPending ? 0.6 : 1,
              }}
            >
              <ExternalLink size={13} />
              {openPortal.isPending ? "Opening…" : "Manage billing"}
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setUpgradeModalOpen(true)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "6px",
                padding: "8px 16px",
                borderRadius: "10px",
                border: "none",
                background: "linear-gradient(135deg, #2563eb, #7c3aed)",
                fontSize: "13px",
                fontWeight: 700,
                cursor: "pointer",
                color: "#ffffff",
                fontFamily: "inherit",
                flexShrink: 0,
                opacity: 1,
              }}
            >
              <Zap size={13} />
              Upgrade to Pro
            </button>
          )}
        </div>
      </div>

      {/* Notifications */}
      <div style={cardStyle}>
        {sectionTitle(
          "Notifications",
          <Bell size={16} style={{ color: "#2563eb" }} />,
        )}
        <p
          style={{
            fontSize: "13px",
            color: "#64748b",
            marginBottom: "20px",
            marginTop: "-12px",
          }}
        >
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

          <div
            style={{
              display: "flex",
              alignItems: "flex-start",
              justifyContent: "space-between",
              gap: "16px",
            }}
          >
            <div>
              <p
                style={{
                  fontSize: "14px",
                  fontWeight: 500,
                  color: "#0f172a",
                  margin: "0 0 2px",
                }}
              >
                Payment due date reminders
              </p>
              <p style={{ fontSize: "12px", color: "#64748b", margin: 0 }}>
                Alert when a debt payment is due within 7 days.
              </p>
            </div>
            <Toggle
              checked={notifyDueDates}
              onChange={(v) => updatePreferences.mutate({ notifyDueDates: v })}
            />
          </div>

          {divider}

          <div
            style={{
              display: "flex",
              alignItems: "flex-start",
              justifyContent: "space-between",
              gap: "16px",
            }}
          >
            <div>
              <p
                style={{
                  fontSize: "14px",
                  fontWeight: 500,
                  color: "#0f172a",
                  margin: "0 0 2px",
                }}
              >
                Low cash buffer warning
              </p>
              <p style={{ fontSize: "12px", color: "#64748b", margin: 0 }}>
                Alert when post-acceleration cash falls below 10% of take-home.
              </p>
            </div>
            <Toggle
              checked={notifyLowBuffer}
              onChange={(v) => updatePreferences.mutate({ notifyLowBuffer: v })}
            />
          </div>

          {divider}

          <div
            style={{
              display: "flex",
              alignItems: "flex-start",
              justifyContent: "space-between",
              gap: "16px",
            }}
          >
            <div>
              <p
                style={{
                  fontSize: "14px",
                  fontWeight: 500,
                  color: "#0f172a",
                  margin: "0 0 2px",
                }}
              >
                Budget change alerts
              </p>
              <p style={{ fontSize: "12px", color: "#64748b", margin: 0 }}>
                Alert when income or expense changes significantly affect your
                plan.
              </p>
            </div>
            <Toggle
              checked={notifyBudgetChanges}
              onChange={(v) => updateActionCheck("budgetChanges", v)}
            />
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

          <div
            style={{
              display: "flex",
              alignItems: "flex-start",
              justifyContent: "space-between",
              gap: "16px",
            }}
          >
            <div>
              <p
                style={{
                  fontSize: "14px",
                  fontWeight: 500,
                  color: "#0f172a",
                  margin: "0 0 2px",
                }}
              >
                Milestone celebrations
              </p>
              <p style={{ fontSize: "12px", color: "#64748b", margin: 0 }}>
                Notify when you hit a debt payoff milestone (e.g. under $10k).
              </p>
            </div>
            <Toggle
              checked={notifyMilestones}
              onChange={(v) => updateActionCheck("milestones", v)}
            />
          </div>

          {divider}

          <div
            style={{
              display: "flex",
              alignItems: "flex-start",
              justifyContent: "space-between",
              gap: "16px",
            }}
          >
            <div>
              <p
                style={{
                  fontSize: "14px",
                  fontWeight: 500,
                  color: "#0f172a",
                  margin: "0 0 2px",
                }}
              >
                Weekly progress summary
              </p>
              <p style={{ fontSize: "12px", color: "#64748b", margin: 0 }}>
                Weekly email recap of payments made and balance changes.
                Delivered every Monday.
              </p>
            </div>
            <Toggle
              checked={notifyWeeklyProgress}
              onChange={(v) => updateActionCheck("weeklyProgress", v)}
            />
          </div>

          {divider}

          <div
            style={{
              display: "flex",
              alignItems: "flex-start",
              justifyContent: "space-between",
              gap: "16px",
            }}
          >
            <div>
              <p
                style={{
                  fontSize: "14px",
                  fontWeight: 500,
                  color: "#0f172a",
                  margin: "0 0 2px",
                }}
              >
                Monthly review reminder
              </p>
              <p style={{ fontSize: "12px", color: "#64748b", margin: 0 }}>
                Monthly email reminder to review your budget and balances. Sent
                on the 1st of each month.
              </p>
            </div>
            <Toggle
              checked={notifyMonthlyReview}
              onChange={(v) => updateActionCheck("monthlyReview", v)}
            />
          </div>

          {divider}

          <div
            style={{
              display: "flex",
              alignItems: "flex-start",
              justifyContent: "space-between",
              gap: "16px",
            }}
          >
            <div>
              <p
                style={{
                  fontSize: "14px",
                  fontWeight: 500,
                  color: "#0f172a",
                  margin: "0 0 2px",
                }}
              >
                Weekly digest email
              </p>
              <p style={{ fontSize: "12px", color: "#64748b", margin: 0 }}>
                Milestone recap for weeks when you log payments. Sent every
                Sunday.
              </p>
            </div>
            <Toggle
              checked={emailDigest}
              onChange={(v) => updatePreferences.mutate({ emailDigest: v })}
            />
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
          <div
            style={{ display: "flex", flexDirection: "column", gap: "10px" }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "10px 14px",
                borderRadius: "10px",
                background: emailOptOut
                  ? "rgba(15,23,42,0.03)"
                  : "rgba(37,99,235,0.04)",
                border: emailOptOut
                  ? "1px solid rgba(15,23,42,0.07)"
                  : "1px solid rgba(37,99,235,0.12)",
              }}
            >
              <div
                style={{ display: "flex", alignItems: "center", gap: "8px" }}
              >
                <Mail
                  size={14}
                  style={{ color: emailOptOut ? "#94a3b8" : "#2563eb" }}
                />
                <div>
                  <span
                    style={{
                      fontSize: "13px",
                      fontWeight: 500,
                      color: emailOptOut ? "#94a3b8" : "#0f172a",
                    }}
                  >
                    Email
                  </span>
                  {emailOptOut && (
                    <p
                      style={{
                        fontSize: "11px",
                        color: "#94a3b8",
                        margin: "1px 0 0",
                      }}
                    >
                      All notification emails paused
                    </p>
                  )}
                </div>
              </div>
              <div
                style={{ display: "flex", alignItems: "center", gap: "10px" }}
              >
                {emailOptOut ? (
                  <>
                    <span
                      style={{
                        fontSize: "12px",
                        fontWeight: 600,
                        color: "#94a3b8",
                        background: "rgba(15,23,42,0.05)",
                        padding: "2px 8px",
                        borderRadius: "999px",
                      }}
                    >
                      Opted out
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        updatePreferences.mutate({ emailOptOut: false })
                      }
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
                    <span
                      style={{
                        fontSize: "12px",
                        fontWeight: 600,
                        color: "#059669",
                        background: "rgba(5,150,105,0.08)",
                        padding: "2px 8px",
                        borderRadius: "999px",
                      }}
                    >
                      Active
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        updatePreferences.mutate({ emailOptOut: true })
                      }
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
              <div
                style={{ display: "flex", alignItems: "center", gap: "8px" }}
              >
                <Bell size={14} style={{ color: "#94a3b8" }} />
                <span
                  style={{
                    fontSize: "13px",
                    fontWeight: 500,
                    color: "#94a3b8",
                  }}
                >
                  Push / SMS
                </span>
              </div>
              <span
                style={{
                  fontSize: "12px",
                  fontWeight: 600,
                  color: "#94a3b8",
                  background: "rgba(15,23,42,0.05)",
                  padding: "2px 8px",
                  borderRadius: "999px",
                }}
              >
                Coming soon
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Account */}
      <div style={cardStyle}>
        {sectionTitle(
          "Account",
          <LogOut size={16} style={{ color: "#2563eb" }} />,
        )}
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

      {/* Danger Zone */}
      <div style={{ ...cardStyle, border: "1px solid rgba(239,68,68,0.2)" }}>
        {sectionTitle(
          "Danger Zone",
          <ShieldAlert size={16} style={{ color: "#ef4444" }} />,
        )}

        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            gap: "16px",
            flexWrap: "wrap",
          }}
        >
          <div>
            <p
              style={{
                fontSize: "14px",
                fontWeight: 500,
                color: "#0f172a",
                margin: "0 0 2px",
              }}
            >
              Delete account and data
            </p>
            <p style={{ fontSize: "12px", color: "#64748b", margin: 0 }}>
              Permanently deletes your login account, debts, income, expenses,
              payment history, uploaded documents, settings, and cached
              recommendations. If you have an active SnowballPay subscription,
              we will cancel it too. We will email a deletion confirmation and
              sign you out.
            </p>
          </div>
          {clearState === "done" ? (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "6px",
                color: "#059669",
                fontSize: "13px",
                fontWeight: 600,
              }}
            >
              <CheckCircle2 size={15} />
              Deleted
            </div>
          ) : clearConfirm ? (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "8px",
                width: "100%",
                maxWidth: "280px",
              }}
            >
              <label
                style={{ fontSize: "11px", color: "#64748b", fontWeight: 600 }}
              >
                Type <span style={{ color: "#b91c1c" }}>DELETE</span> to confirm
              </label>
              <input
                type="text"
                value={deleteConfirmInput}
                onChange={(e) => setDeleteConfirmInput(e.target.value)}
                placeholder="DELETE"
                className="w-full rounded-md px-3 py-2 text-sm"
                style={{
                  border: "1px solid rgba(239,68,68,0.25)",
                  background: "#fff",
                  color: "#0f172a",
                  fontFamily: "inherit",
                }}
              />
              <div style={{ display: "flex", gap: "8px", flexShrink: 0 }}>
                <button
                  type="button"
                  onClick={() => {
                    setClearConfirm(false);
                    setDeleteConfirmInput("");
                  }}
                  style={{
                    padding: "7px 14px",
                    borderRadius: "9px",
                    border: "1px solid rgba(15,23,42,0.1)",
                    background: "#f8fafc",
                    fontSize: "13px",
                    fontWeight: 600,
                    cursor: "pointer",
                    color: "#475569",
                    fontFamily: "inherit",
                  }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => void handleClearData()}
                  disabled={clearState === "loading" || !deleteEnabled}
                  style={{
                    padding: "7px 14px",
                    borderRadius: "9px",
                    border: "none",
                    background: "#ef4444",
                    fontSize: "13px",
                    fontWeight: 600,
                    cursor: "pointer",
                    color: "#fff",
                    fontFamily: "inherit",
                    opacity:
                      clearState === "loading" || !deleteEnabled ? 0.6 : 1,
                  }}
                >
                  {clearState === "loading"
                    ? "Deleting account..."
                    : "Yes, delete my account"}
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => {
                setClearConfirm(true);
                setDeleteConfirmInput("");
              }}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "6px",
                padding: "7px 14px",
                borderRadius: "9px",
                border: "1px solid rgba(239,68,68,0.25)",
                background: "rgba(239,68,68,0.06)",
                fontSize: "13px",
                fontWeight: 600,
                cursor: "pointer",
                color: "#ef4444",
                fontFamily: "inherit",
                flexShrink: 0,
              }}
            >
              <Trash2 size={14} />
              Delete account
            </button>
          )}
        </div>

        {clearState === "error" && (
          <p style={{ fontSize: "12px", color: "#ef4444", margin: "12px 0 0" }}>
            {clearError}
          </p>
        )}
      </div>

      {upgradeModalOpen && (
        <UpgradeModal onClose={() => setUpgradeModalOpen(false)} />
      )}
    </div>
  );
}
