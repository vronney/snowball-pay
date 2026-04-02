"use client";

import { useEffect } from "react";
import { Trophy, X, ArrowRight } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

interface DebtPaidOffModalProps {
  debtName: string;
  amountCleared: number;
  onClose: () => void;
}

export function DebtPaidOffModal({ debtName, amountCleared, onClose }: DebtPaidOffModalProps) {
  // Close on Escape key
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(17,24,39,0.55)", backdropFilter: "blur(4px)" }}
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-sm rounded-2xl p-8 text-center animate-slideUp"
        style={{
          background: "#ffffff",
          boxShadow: "0 24px 64px rgba(17,24,39,0.2)",
          border: "1px solid rgba(39,174,96,0.2)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg hover:bg-slate-100 transition"
          style={{ color: "#94a3b8", border: "none", background: "transparent", cursor: "pointer" }}
          aria-label="Close"
        >
          <X size={16} />
        </button>

        {/* Trophy icon */}
        <div
          className="inline-flex items-center justify-center w-20 h-20 rounded-full mx-auto mb-5"
          style={{
            background: "linear-gradient(135deg, rgba(39,174,96,0.15), rgba(39,174,96,0.08))",
            border: "2px solid rgba(39,174,96,0.25)",
          }}
        >
          <Trophy size={36} style={{ color: "#27AE60" }} />
        </div>

        <h2 className="text-2xl font-bold mb-2" style={{ color: "#111827" }}>
          Paid Off!
        </h2>
        <p className="text-base font-semibold mb-1" style={{ color: "#27AE60" }}>
          {debtName}
        </p>
        <p className="text-sm mb-6" style={{ color: "#6B7280" }}>
          You cleared {formatCurrency(amountCleared)} and eliminated this debt entirely.
          That freed-up payment can now snowball into your next target.
        </p>

        <div className="flex flex-col gap-2">
          <button
            onClick={onClose}
            className="w-full flex items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold text-white transition hover:brightness-110"
            style={{
              background: "linear-gradient(135deg, #27AE60, #2ecc71)",
              border: "none",
              cursor: "pointer",
            }}
          >
            View updated plan
            <ArrowRight size={15} />
          </button>
          <button
            onClick={onClose}
            className="w-full rounded-xl py-3 text-sm font-medium transition hover:bg-slate-50"
            style={{ color: "#6B7280", border: "1px solid rgba(15,23,42,0.1)", background: "transparent", cursor: "pointer" }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
