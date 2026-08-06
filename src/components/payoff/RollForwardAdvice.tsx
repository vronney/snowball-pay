import { useEffect, useMemo, useRef } from "react";
import { ArrowRight, CheckCircle2, Lightbulb, X } from "lucide-react";
import { type Debt } from "@/types";
import { Events, track } from "@/lib/analytics";
import { useUpdatePreferences, useUserSettings } from "@/lib/hooks";
import { isActiveDebt } from "@/lib/monthlyFocusDebt";
import { formatCurrency } from "@/lib/utils";

type AdviceSurface = "this_month" | "plan";

interface RollForwardAdviceProps {
  debts: Debt[];
  focusDebt?: Debt | null;
  currentAcceleration?: number;
  availableCashFlow?: number;
  surface: AdviceSurface;
  onReviewPlan?: () => void;
}

function adviceKey(debtId: string, state: "viewed" | "planned" | "dismissed") {
  return `roll_forward_advice_${state}_${debtId}`;
}

function debtListLabel(debts: Debt[]) {
  if (debts.length === 1) return debts[0].name;
  if (debts.length === 2) return `${debts[0].name} and ${debts[1].name}`;
  return `${debts[0].name} and ${debts.length - 1} more`;
}

export default function RollForwardAdvice({
  debts,
  focusDebt,
  currentAcceleration = 0,
  availableCashFlow,
  surface,
  onReviewPlan,
}: RollForwardAdviceProps) {
  const { data: settingsData } = useUserSettings();
  const updatePreferences = useUpdatePreferences();
  const actionChecks = settingsData?.preferences?.actionChecks;
  const viewedForIdsRef = useRef<string | null>(null);

  const activeDebts = useMemo(() => debts.filter(isActiveDebt), [debts]);
  const eligiblePaidOffDebts = useMemo(() => {
    if (!actionChecks) return [];
    return debts
      .filter((debt) => !isActiveDebt(debt) && debt.minimumPayment > 0)
      .filter(
        (debt) =>
          !actionChecks[adviceKey(debt.id, "planned")] &&
          !actionChecks[adviceKey(debt.id, "dismissed")],
      )
      .sort((a, b) => b.minimumPayment - a.minimumPayment);
  }, [actionChecks, debts]);

  const idsKey = eligiblePaidOffDebts.map((debt) => debt.id).join("|");
  const freedPayment = eligiblePaidOffDebts.reduce(
    (sum, debt) => sum + debt.minimumPayment,
    0,
  );
  const suggestedAcceleration = availableCashFlow == null
    ? currentAcceleration + freedPayment
    : Math.min(availableCashFlow, currentAcceleration + freedPayment);

  useEffect(() => {
    if (!actionChecks || eligiblePaidOffDebts.length === 0 || !idsKey) return;
    if (viewedForIdsRef.current === idsKey) return;
    viewedForIdsRef.current = idsKey;

    const nextChecks = { ...actionChecks };
    let hasNewView = false;
    for (const debt of eligiblePaidOffDebts) {
      const key = adviceKey(debt.id, "viewed");
      if (!nextChecks[key]) {
        nextChecks[key] = true;
        hasNewView = true;
      }
    }
    if (hasNewView) {
      updatePreferences.mutate({ actionChecks: nextChecks });
    }
    track(Events.ROLL_FORWARD_ADVICE_VIEWED, {
      surface,
      debt_count: eligiblePaidOffDebts.length,
      freed_payment: freedPayment,
      focus_debt_id: focusDebt?.id ?? null,
    });
  }, [
    actionChecks,
    eligiblePaidOffDebts,
    focusDebt?.id,
    freedPayment,
    idsKey,
    surface,
    updatePreferences,
  ]);

  if (!actionChecks || activeDebts.length === 0 || eligiblePaidOffDebts.length === 0) {
    return null;
  }

  const targetName = focusDebt?.name ?? "the next focus debt";
  const sourceLabel = debtListLabel(eligiblePaidOffDebts);

  const markAdvice = (state: "planned" | "dismissed") => {
    const nextChecks = { ...actionChecks };
    for (const debt of eligiblePaidOffDebts) {
      nextChecks[adviceKey(debt.id, state)] = true;
      delete nextChecks[adviceKey(
        debt.id,
        state === "planned" ? "dismissed" : "planned",
      )];
    }
    updatePreferences.mutate({ actionChecks: nextChecks });
    track(
      state === "planned"
        ? Events.ROLL_FORWARD_ADVICE_PLANNED
        : Events.ROLL_FORWARD_ADVICE_DISMISSED,
      {
        surface,
        debt_count: eligiblePaidOffDebts.length,
        freed_payment: freedPayment,
        focus_debt_id: focusDebt?.id ?? null,
      },
    );
  };

  const handleReview = () => {
    track(Events.ROLL_FORWARD_ADVICE_REVIEW_CLICKED, {
      surface,
      debt_count: eligiblePaidOffDebts.length,
      freed_payment: freedPayment,
      focus_debt_id: focusDebt?.id ?? null,
    });
    onReviewPlan?.();
  };

  return (
    <div
      className="rounded-xl p-4 sm:p-5"
      style={{
        background: "rgba(37,99,235,0.05)",
        border: "1px solid rgba(37,99,235,0.14)",
        boxShadow: "0 1px 4px rgba(15,23,42,0.05)",
      }}
    >
      <div className="flex items-start gap-3">
        <div
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
          style={{
            background: "rgba(37,99,235,0.10)",
            color: "#2563eb",
          }}
        >
          <Lightbulb size={16} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="mb-1 flex flex-wrap items-center gap-2">
            <span
              className="rounded-md bg-white px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide"
              style={{
                border: "1px solid rgba(37,99,235,0.16)",
                color: "#2563eb",
              }}
            >
              Soft nudge
            </span>
            <p className="text-sm font-semibold" style={{ color: "#0f172a" }}>
              Roll the freed payment forward
            </p>
          </div>
          <p className="text-xs leading-relaxed" style={{ color: "#475569" }}>
            {sourceLabel} freed up {formatCurrency(freedPayment)} per month.
            Consider keeping that money in the debt plan by adding it to your
            extra amount or sending it directly to {targetName}.
          </p>
          <p className="mt-2 text-xs leading-relaxed" style={{ color: "#64748b" }}>
            This will not change anything automatically. It is just a prompt to
            keep your payoff momentum from getting absorbed back into spending.
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            {onReviewPlan && (
              <button
                type="button"
                onClick={handleReview}
                className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold"
                style={{
                  background: "#2563eb",
                  border: "1px solid #2563eb",
                  color: "#ffffff",
                  cursor: "pointer",
                }}
              >
                Review extra amount
                <ArrowRight size={12} />
              </button>
            )}
            <button
              type="button"
              onClick={() => markAdvice("planned")}
              className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold"
              style={{
                background: "rgba(16,185,129,0.08)",
                border: "1px solid rgba(16,185,129,0.24)",
                color: "#047857",
                cursor: "pointer",
              }}
            >
              <CheckCircle2 size={12} />
              Mark as planned
            </button>
            <button
              type="button"
              onClick={() => markAdvice("dismissed")}
              className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold"
              style={{
                background: "rgba(15,23,42,0.04)",
                border: "1px solid rgba(15,23,42,0.10)",
                color: "#64748b",
                cursor: "pointer",
              }}
            >
              <X size={12} />
              Not now
            </button>
          </div>
          <p className="mt-2 text-[11px]" style={{ color: "#94a3b8" }}>
            Suggested planned acceleration: {formatCurrency(suggestedAcceleration)}
          </p>
        </div>
      </div>
    </div>
  );
}
