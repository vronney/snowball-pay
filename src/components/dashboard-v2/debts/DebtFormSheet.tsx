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
  onClose: () => void;
}

/**
 * Add a debt in a sheet (spec §8.3). v2 always opts in: past the Free cap the
 * server saves the debt outside the plan instead of refusing it (§6.3).
 */
export default function DebtFormSheet({ notice, onClose }: DebtFormSheetProps) {
  const createDebt = useCreateDebt();
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (formData: Partial<Debt>) => {
    setError(null);
    try {
      const result = await createDebt.mutateAsync({ ...formData, allowOutsidePlan: true });
      track(Events.DEBT_ADDED, { category: formData.category });
      if (result.outsidePlan) track(Events.DEBT_SAVED_OUTSIDE_PLAN);
      onClose();
    } catch (err) {
      setError(getErrorMessage(err, "Couldn't save this debt. Try again."));
    }
  };

  return (
    <Sheet title="Add a debt" description={notice ?? undefined} busy={createDebt.isPending} onClose={onClose}>
      <DebtForm onSubmit={handleSubmit} onCancel={onClose} isLoading={createDebt.isPending} />
      {error && <p role="alert" className={`mt-3 ${ERROR_LINE}`}>{error}</p>}
    </Sheet>
  );
}
