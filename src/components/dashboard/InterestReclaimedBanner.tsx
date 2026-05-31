"use client";

import { useEffect, useRef, useState } from "react";
import { TrendingDown } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

interface InterestReclaimedBannerProps {
  interestSaved: number;   // projected interest saved vs minimums-only
  monthsSaved: number;     // months sooner vs minimums-only
  hasData: boolean;
}

/** Animates a number from 0 to `target` over `duration` ms */
function useCountUp(target: number, duration = 1200) {
  const [value, setValue] = useState(0);
  const rafRef = useRef<number | null>(null);
  const startRef = useRef<number | null>(null);

  useEffect(() => {
    if (target <= 0) { setValue(0); return; }
    startRef.current = null;

    function step(ts: number) {
      if (startRef.current === null) startRef.current = ts;
      const elapsed = ts - startRef.current;
      const progress = Math.min(elapsed / duration, 1);
      // ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(Math.round(eased * target));
      if (progress < 1) rafRef.current = requestAnimationFrame(step);
    }

    rafRef.current = requestAnimationFrame(step);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [target, duration]);

  return value;
}

export default function InterestReclaimedBanner({
  interestSaved,
  monthsSaved,
  hasData,
}: InterestReclaimedBannerProps) {
  const animated = useCountUp(Math.round(interestSaved));

  if (!hasData || interestSaved <= 0) return null;

  const yearsSaved = Math.floor(monthsSaved / 12);
  const moSaved = monthsSaved % 12;
  const timeSavedStr = yearsSaved > 0
    ? `${yearsSaved} yr${yearsSaved !== 1 ? "s" : ""}${moSaved > 0 ? ` ${moSaved} mo` : ""}`
    : `${monthsSaved} month${monthsSaved !== 1 ? "s" : ""}`;

  return (
    <div
      style={{
        background: "#eff6ff",
        border: "1px solid #bfdbfe",
        borderRadius: "12px",
        padding: "18px 20px",
        display: "flex",
        alignItems: "center",
        gap: "16px",
      }}
    >
      {/* Icon */}
      <div
        style={{
          width: "40px",
          height: "40px",
          borderRadius: "10px",
          background: "#2563eb",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}
      >
        <TrendingDown size={20} strokeWidth={2.2} style={{ color: "#ffffff" }} />
      </div>

      {/* Text */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: "12px", fontWeight: 600, color: "#2563eb", marginBottom: "2px" }}>
          Interest you&apos;re on track to reclaim
        </div>
        <div
          style={{
            fontSize: "26px",
            fontWeight: 800,
            color: "#0f172a",
            letterSpacing: "-0.03em",
            fontVariantNumeric: "tabular-nums",
            lineHeight: 1.1,
          }}
        >
          {formatCurrency(animated)}
        </div>
        <div style={{ fontSize: "12px", color: "#64748b", marginTop: "3px" }}>
          vs paying minimums only · {timeSavedStr} sooner
        </div>
      </div>
    </div>
  );
}
