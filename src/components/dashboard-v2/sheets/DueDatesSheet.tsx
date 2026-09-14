"use client";

import { useId, useState } from "react";
import type { Debt } from "@/types";
import { getErrorMessage, useUpdateDebt } from "@/lib/hooks";
import { getOrdinalDay } from "@/lib/utils";
import { CTA_BLUE, ERROR_LINE } from "../styles";
import Sheet from "./Sheet";

interface DueDatesSheetProps {
  /** Active debts without a due day (`debtsMissingDueDate`). */
  debts: ReadonlyArray<Pick<Debt, "id" | "name">>;
  onClose: () => void;
}

const DAYS = Array.from({ length: 31 }, (_, i) => i + 1);

export function saveDueDatesLabel(n: number): string {
  return n === 1 ? "Save 1 due date" : `Save ${n} due dates`;
}

/** Readiness "Add {n} due dates" (spec §8.3): a day per debt, saved with the existing PATCH. */
export default function DueDatesSheet({ debts, onClose }: DueDatesSheetProps) {
  const baseId = useId();
  const updateDebt = useUpdateDebt();
  const [days, setDays] = useState<Readonly<Record<string, number>>>({});
  const [savedIds, setSavedIds] = useState<ReadonlySet<string>>(() => new Set());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const rows = debts.filter((d) => !savedIds.has(d.id));
  const chosen = rows.filter((d) => days[d.id] !== undefined);

  const choose = (debtId: string, raw: string) => {
    setDays((prev) => {
      const rest = Object.fromEntries(Object.entries(prev).filter(([id]) => id !== debtId));
      return raw === "" ? rest : { ...rest, [debtId]: Number(raw) };
    });
  };

  const save = async () => {
    setSaving(true);
    setError(null);
    const saved = new Set(savedIds);
    for (const debt of chosen) {
      try {
        // One PATCH per debt, in order, through the existing hook.
        await updateDebt.mutateAsync({ id: debt.id, updates: { dueDate: days[debt.id] } });
        saved.add(debt.id);
      } catch (err) {
        setSavedIds(saved);
        setError(`${debt.name} didn't save. ${getErrorMessage(err, "Please try again.")}`);
        setSaving(false);
        return;
      }
    }
    setSaving(false);
    onClose();
  };

  return (
    <Sheet
      title="Add due dates"
      description="Pick the day of the month each payment is due."
      busy={saving}
      onClose={onClose}
      footer={
        <>
          {error && <p role="alert" className={`mb-2 ${ERROR_LINE}`}>{error}</p>}
          <button type="button" onClick={save} disabled={saving || chosen.length === 0} className={CTA_BLUE}>
            {saving ? "Saving…" : chosen.length === 0 ? "Save due dates" : saveDueDatesLabel(chosen.length)}
          </button>
        </>
      }
    >
      <ul className="flex flex-col divide-y divide-border">
        {rows.map((debt) => {
          const id = `${baseId}-${debt.id}`;
          return (
            <li key={debt.id} className="flex min-h-11 items-center justify-between gap-3 py-2">
              <label htmlFor={id} className="min-w-0 flex-1 truncate text-[14px] font-semibold text-txt">
                {debt.name}
              </label>
              <select
                id={id}
                value={days[debt.id] ?? ""}
                disabled={saving}
                onChange={(event) => choose(debt.id, event.target.value)}
                className="min-h-11 w-28 shrink-0 rounded-lg border border-border bg-surface px-2 text-[14px] text-txt outline-none focus-visible:outline-2 focus-visible:outline-action"
              >
                <option value="">Day…</option>
                {DAYS.map((day) => (
                  <option key={day} value={day}>{getOrdinalDay(day)}</option>
                ))}
              </select>
            </li>
          );
        })}
      </ul>
    </Sheet>
  );
}
