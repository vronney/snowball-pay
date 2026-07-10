"use client";

import { useEffect, useState } from "react";
import { X, ArrowRight, Loader2 } from "lucide-react";
import { track, Events } from "@/lib/analytics";
import {
  saveCalculatorDraft,
  type CalculatorSessionState,
} from "@/lib/calculatorDraft";
import { buildPlanSnapshot } from "@/lib/planSnapshot";

interface SavePlanModalProps {
  onClose: () => void;
  debtFreeDate: string;
  interestSaved: number;
  /** Full calculator session — persisted locally so the exact plan (every
   *  debt, not just the first) survives the Auth0 signup round trip. */
  calculatorState?: CalculatorSessionState;
}

export default function SavePlanModal({
  onClose,
  debtFreeDate,
  interestSaved,
  calculatorState,
}: SavePlanModalProps) {
  const [email, setEmail] = useState("");
  const [website, setWebsite] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    track(Events.SAVE_PLAN_MODAL_VIEWED, { source: "calculator_result" });
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const trimmed = email.trim().toLowerCase();
    if (!trimmed || !trimmed.includes("@")) {
      setError("Please enter a valid email address.");
      return;
    }

    setLoading(true);
    track(Events.PLAN_SAVED_EMAIL, { email_domain: trimmed.split("@")[1] });
    track(Events.SIGNUP_STARTED, { source: "save_plan_modal" });

    // Persist the lead + plan summary server-side before the Auth0 redirect,
    // so abandoning at signup/MFA doesn't lose the contact. The snapshot of
    // the full plan rides along so onboarding can rehydrate it even on a
    // different device (e.g. finishing signup from the reminder email on a
    // phone). keepalive lets the request survive the navigation; failure
    // must never block the signup.
    fetch("/api/leads", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: trimmed,
        method: calculatorState?.method,
        debtFreeDate,
        interestSaved,
        planSnapshot: calculatorState
          ? buildPlanSnapshot(calculatorState)
          : undefined,
        website,
      }),
      keepalive: true,
    }).catch(() => {});

    // Persist the FULL plan (every debt + budget) in localStorage so
    // onboarding can skip the wizard and commit it verbatim after signup.
    // Nothing financial rides the URL through the Auth0 round trip.
    if (calculatorState) {
      saveCalculatorDraft({
        ...calculatorState,
        debtFreeDate,
        interestSaved,
      });
    }

    // Redirect to Auth0 signup with login_hint pre-filled so the email
    // is already in the signup form — reduces friction.
    const loginUrl = `/auth/login?returnTo=${encodeURIComponent("/onboarding?source=calculator")}&screen_hint=signup&login_hint=${encodeURIComponent(trimmed)}`;
    window.location.href = loginUrl;
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="save-plan-title"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 100,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "rgba(15,23,42,0.55)",
        backdropFilter: "blur(4px)",
        padding: "16px",
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        style={{
          background: "#ffffff",
          borderRadius: "20px",
          width: "100%",
          maxWidth: "440px",
          padding: "36px 32px 32px",
          position: "relative",
          boxShadow: "0 32px 80px rgba(15,23,42,0.18)",
        }}
      >
        <button
          onClick={onClose}
          aria-label="Close"
          style={{
            position: "absolute",
            top: "16px",
            right: "16px",
            background: "#f1f5f9",
            border: "none",
            borderRadius: "8px",
            width: "32px",
            height: "32px",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#64748b",
          }}
        >
          <X size={16} />
        </button>

        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: "24px" }}>
          <div
            style={{
              width: "56px",
              height: "56px",
              borderRadius: "16px",
              background: "rgba(37,99,235,0.1)",
              margin: "0 auto 14px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "24px",
            }}
          >
            🎯
          </div>
          <h2
            id="save-plan-title"
            style={{
              fontSize: "20px",
              fontWeight: 800,
              color: "#0f172a",
              marginBottom: "8px",
            }}
          >
            Save this payoff plan
          </h2>
          <p style={{ fontSize: "14px", color: "#64748b", lineHeight: 1.6 }}>
            You&apos;re on track to be debt-free by{" "}
            <strong style={{ color: "#2563eb" }}>{debtFreeDate}</strong>
            {interestSaved > 0 && (
              <>
                {" "}
                and save{" "}
                <strong style={{ color: "#059669" }}>
                  ${interestSaved.toLocaleString()}
                </strong>{" "}
                in interest
              </>
            )}
            . Enter your email and create a free account — this exact plan,
            with every debt you entered, will be waiting on your dashboard.
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          {/* Honeypot — visually hidden; real users never fill it, bots do. */}
          <input
            type="text"
            name="website"
            value={website}
            onChange={(e) => setWebsite(e.target.value)}
            tabIndex={-1}
            autoComplete="off"
            aria-hidden="true"
            style={{
              position: "absolute",
              left: "-9999px",
              width: "1px",
              height: "1px",
              opacity: 0,
            }}
          />
          <label
            htmlFor="save-plan-email"
            style={{
              display: "block",
              fontSize: "13px",
              fontWeight: 600,
              color: "#374151",
              marginBottom: "6px",
            }}
          >
            Your email
          </label>
          <input
            id="save-plan-email"
            type="email"
            inputMode="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            autoFocus
            style={{
              width: "100%",
              padding: "12px 14px",
              borderRadius: "10px",
              border: `1px solid ${error ? "#ef4444" : "rgba(15,23,42,0.15)"}`,
              // 16px avoids iOS Safari/Chrome auto-zooming on focus (this input
              // autoFocuses when the modal opens on mobile).
              fontSize: "16px",
              outline: "none",
              boxSizing: "border-box",
              marginBottom: error ? "6px" : "16px",
            }}
          />
          {error && (
            <p
              style={{
                fontSize: "12px",
                color: "#ef4444",
                marginBottom: "12px",
              }}
            >
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              width: "100%",
              padding: "13px",
              borderRadius: "10px",
              background: "#2563eb",
              color: "#fff",
              border: "none",
              fontSize: "15px",
              fontWeight: 700,
              cursor: loading ? "not-allowed" : "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "8px",
              opacity: loading ? 0.7 : 1,
            }}
          >
            {loading ? (
              <>
                <Loader2
                  size={16}
                  style={{ animation: "spin 0.8s linear infinite" }}
                />{" "}
                Saving your plan…
              </>
            ) : (
              <>
                Create Free Account and Save Plan <ArrowRight size={15} />
              </>
            )}
          </button>

          <p
            style={{
              textAlign: "center",
              fontSize: "11px",
              color: "#94a3b8",
              marginTop: "12px",
            }}
          >
            No credit card. No spam. Unsubscribe anytime.
          </p>
        </form>
      </div>
    </div>
  );
}
