"use client";

import { useState } from "react";
import type { Debt } from "@/types";
import DebtForm from "@/components/DebtForm";
import { getErrorMessage, useCreateDebt } from "@/lib/hooks";
import { track, Events } from "@/lib/analytics";
import Sheet from "../sheets/Sheet";
import { ERROR_LINE } from "../styles";

interface DebtFormSheetProps {
  /** Under the title when this save lands outside the plan (outsidePlanNotice). */
  notice: string | null;
  /**
   * Opt in to saving past the Free cap. Only true once the account's tier is
   * known (proEligible resolved): a Free save past the cap must always be
   * announced first via `notice`, so this stays false while the tier is
   * unknown or unresolved, rather than defaulting to opted-in. With an
   * unknown tier, the server's normal 403 applies and `useCreateDebt`'s
   * existing `onError` shows the upgrade prompt.
   */
  allowOutsidePlan: boolean;
  onClose: () => void;
}

/**
 * Add a debt in a sheet (spec §8.3). v2 opts in only once the account's tier
 * is known: past the Free cap the server then saves the debt outside the
 * plan instead of refusing it (§6.3), but only after that save was announced
 * up front via `notice`.
 */
export default function DebtFormSheet({ notice, allowOutsidePlan, onClose }: DebtFormSheetProps) {
  const createDebt = useCreateDebt();
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (formData: Partial<Debt>): Promise<boolean> => {
    setError(null);
    try {
      const result = await createDebt.mutateAsync({ ...formData, allowOutsidePlan });
      track(Events.DEBT_ADDED, { category: formData.category });
      if (result.outsidePlan) track(Events.DEBT_SAVED_OUTSIDE_PLAN);
      onClose();
      return true;
    } catch (err) {
      setError(getErrorMessage(err, "Couldn't save this debt. Try again."));
      // Tells DebtForm to keep the typed values instead of resetting them
      // (CodeRabbit C6).
      return false;
    }
  };

  return (
    <Sheet title="Add a debt" description={notice ?? undefined} busy={createDebt.isPending} onClose={onClose}>
      <DebtForm onSubmit={handleSubmit} onCancel={onClose} isLoading={createDebt.isPending} />
      {error && <p role="alert" className={`mt-3 ${ERROR_LINE}`}>{error}</p>}
    </Sheet>
  );
}
