"use client";

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { ShieldAlert, Trash2, CheckCircle2 } from "lucide-react";
import { LOGOUT_URL_LOCAL, runLogoutClientCleanup } from "@/lib/logout-client";

export function DangerZoneSection() {
  const queryClient = useQueryClient();
  const [clearConfirm, setClearConfirm] = useState(false);
  const [deleteConfirmInput, setDeleteConfirmInput] = useState("");
  const [clearState, setClearState] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [clearError, setClearError] = useState("");

  const deletePhrase = "DELETE";
  const deleteEnabled = deleteConfirmInput.trim().toUpperCase() === deletePhrase;

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
      const message = axios.isAxiosError(error) ? error.response?.data?.error : undefined;
      setClearError(
        typeof message === "string" ? message : "We could not delete your account. Please try again or contact support.",
      );
      setClearState("error");
    }
  };

  const cardStyle = {
    background: "#ffffff",
    border: "1px solid rgba(239,68,68,0.2)",
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
      {sectionTitle("Danger Zone", <ShieldAlert size={16} style={{ color: "#ef4444" }} />)}

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
          <p style={{ fontSize: "14px", fontWeight: 500, color: "#0f172a", margin: "0 0 2px" }}>
            Delete account and data
          </p>
          <p style={{ fontSize: "12px", color: "#64748b", margin: 0 }}>
            Permanently deletes your login account, debts, income, expenses, payment history, uploaded documents,
            settings, and cached recommendations. If you have an active SnowballPay subscription, we will cancel it too.
            We will email a deletion confirmation and sign you out.
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
          <div style={{ display: "flex", flexDirection: "column", gap: "8px", width: "100%", maxWidth: "280px" }}>
            <label style={{ fontSize: "11px", color: "#64748b", fontWeight: 600 }}>
              Type <span style={{ color: "#b91c1c" }}>DELETE</span> to confirm
            </label>
            <input
              type="text"
              value={deleteConfirmInput}
              onChange={(e) => setDeleteConfirmInput(e.target.value)}
              placeholder="DELETE"
              style={{
                border: "1px solid rgba(239,68,68,0.25)",
                background: "#fff",
                color: "#0f172a",
                fontFamily: "inherit",
                borderRadius: "6px",
                padding: "8px 12px",
                fontSize: "14px",
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
                  opacity: clearState === "loading" || !deleteEnabled ? 0.6 : 1,
                }}
              >
                {clearState === "loading" ? "Deleting account..." : "Yes, delete my account"}
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
        <p style={{ fontSize: "12px", color: "#ef4444", margin: "12px 0 0" }}>{clearError}</p>
      )}
    </div>
  );
}
