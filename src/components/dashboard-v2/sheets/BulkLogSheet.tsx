"use client";

import { useId, useRef, useState } from "react";
import { fireCelebration, getErrorMessage, useMarkPaid, type CelebrationPayload } from "@/lib/hooks";
import { track, Events } from "@/lib/analytics";
import type { LogRow } from "@/lib/dashboard/thisMonth";
import { CTA_BLUE, ERROR_LINE } from "../styles";
import Sheet from "./Sheet";

interface BulkLogSheetProps {
  title: string;
  rows: ReadonlyArray<LogRow>;
  /** The month being logged: insights.asOf, the client's local today. month: 0-11. */
  year: number;
  month: number;
  onClose: () => void;
}

export function logPaymentsLabel(n: number): string {
  return n === 1 ? "Log 1 payment" : `Log ${n} payments`;
}

/** A plain decimal, e.g. "25", ".5" or "310.556" — never scientific notation, hex, or a comma. */
const PLAIN_DECIMAL = /^(\d+(\.\d*)?|\.\d+)$/;

/**
 * A typed dollar amount, rounded to cents, or null unless the trimmed input
 * is a plain decimal that rounds to a positive amount. Rounding first means
 * a sub-cent value like "0.004" or ".001" rounds to $0 and is rejected,
 * instead of writing a $0 payment.
 */
export function parseAmount(raw: string): number | null {
  const trimmed = raw.trim();
  if (!PLAIN_DECIMAL.test(trimmed)) return null;
  const rounded = Math.round(Number(trimmed) * 100) / 100;
  return rounded > 0 ? rounded : null;
}

/**
 * The one celebration a batch gets: a debt this batch paid off if there is one,
 * otherwise the largest payment, carrying a count of the rest. Ties keep the
 * order the rows were logged in. Null for an empty batch.
 *
 * One celebration per batch, not one per payment: celebrationState holds a
 * single slot, so N payments used to mean N Claude calls and N DebtStory rows
 * for one banner — and the daily rate limit is 3, so a batch of four also
 * spent the user's whole budget.
 *
 * `totalDebtPaid` is re-derived across the batch. Each payload snapshots the
 * cache as it stood before its own payment, so the winner's copy can predate
 * the rest of the batch — and that figure reaches the user, as the progress
 * percentage in the prompt and the persisted DebtStory message.
 *
 * `savedCount` is how many payments actually saved, which can exceed the
 * payloads collected: a payment the server reports as already marked, or one
 * whose debt is missing from the cache, saves without producing a payload.
 */
export function batchCelebration(
  payloads: readonly CelebrationPayload[],
  savedCount = payloads.length,
): CelebrationPayload | null {
  if (payloads.length === 0) return null;
  const paidOff = payloads.filter((p) => p.debtBalance === 0);
  const pool = paidOff.length > 0 ? paidOff : payloads;
  const best = pool.reduce((a, b) => (b.amountPaid > a.amountPaid ? b : a));
  // Every payload shares one starting total; recover it from the first and add
  // back everything this batch paid.
  const before = payloads[0].totalDebtPaid - payloads[0].amountPaid;
  const totalDebtPaid = payloads.reduce((sum, p) => sum + p.amountPaid, before);
  return {
    ...best,
    totalDebtPaid,
    alsoLoggedCount: Math.max(0, savedCount - 1),
  };
}

/**
 * "Log them now" / "Log your first payment" (spec §8.3): the payments
 * pre-filled at their minimums, each logged through the existing useMarkPaid,
 * one at a time, so balances and snapshots behave exactly as a single log does.
 * Celebrations are the one exception — suppressed per payment and fired once
 * for the batch (see batchCelebration).
 */
export default function BulkLogSheet({ title, rows, year, month, onClose }: BulkLogSheetProps) {
  const baseId = useId();
  const markPaid = useMarkPaid();
  const [amounts, setAmounts] = useState<Readonly<Record<string, string>>>({});
  const [unchecked, setUnchecked] = useState<ReadonlySet<string>>(() => new Set());
  const [loggedIds, setLoggedIds] = useState<ReadonlySet<string>>(() => new Set());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Kept across retries, so a batch that fails part-way and is resubmitted
  // still yields exactly one celebration for the sheet.
  const collected = useRef<CelebrationPayload[]>([]);
  const savedCount = useRef(0);
  const celebrated = useRef(false);

  const amountText = (row: LogRow) => amounts[row.debtId] ?? row.amount.toFixed(2);
  const pending = rows.filter((r) => !loggedIds.has(r.debtId));
  const selected = pending.filter((r) => !unchecked.has(r.debtId));
  const invalid = selected.some((r) => parseAmount(amountText(r)) === null);

  const toggle = (debtId: string) => {
    setUnchecked((prev) => {
      const next = new Set(prev);
      if (next.has(debtId)) next.delete(debtId);
      else next.add(debtId);
      return next;
    });
  };

  const submit = async () => {
    setSaving(true);
    setError(null);
    const logged = new Set(loggedIds);
    let count = 0;
    // A failure part-way through still celebrates what did save, and a retry
    // after it does not celebrate a second time.
    const celebrate = () => {
      if (celebrated.current) return;
      const one = batchCelebration(collected.current, savedCount.current);
      if (!one) return;
      celebrated.current = true;
      fireCelebration(one);
    };
    for (const row of selected) {
      const amount = parseAmount(amountText(row));
      if (amount === null) continue; // unreachable: `invalid` disables the button
      try {
        const result = await markPaid.mutateAsync({
          debtId: row.debtId,
          amount,
          dueYear: year,
          dueMonth: month,
          celebrate: false,
        });
        if (result?.celebration) collected.current.push(result.celebration);
        logged.add(row.debtId);
        savedCount.current += 1;
        count += 1;
      } catch (err) {
        setLoggedIds(logged);
        if (count > 0) track(Events.BULK_LOG_SUBMITTED, { debt_count: count });
        celebrate();
        setError(`${row.name} didn't save. ${getErrorMessage(err, "Please try again.")}`);
        setSaving(false);
        return;
      }
    }
    track(Events.BULK_LOG_SUBMITTED, { debt_count: count });
    celebrate();
    setSaving(false);
    onClose();
  };

  return (
    <Sheet
      title={title}
      description="Pre-filled at each minimum. Change an amount if you paid a different one."
      busy={saving}
      onClose={onClose}
      footer={
        <>
          {invalid && !error && (
            <p className="mb-2 text-[13px] text-txt-muted">Each checked payment needs an amount above $0.</p>
          )}
          {error && <p role="alert" className={`mb-2 ${ERROR_LINE}`}>{error}</p>}
          <button
            type="button"
            onClick={submit}
            disabled={saving || selected.length === 0 || invalid}
            className={CTA_BLUE}
          >
            {saving ? "Saving…" : selected.length === 0 ? "Log payments" : logPaymentsLabel(selected.length)}
          </button>
        </>
      }
    >
      <ul className="flex flex-col divide-y divide-border">
        {pending.map((row) => {
          const checkboxId = `${baseId}-${row.debtId}`;
          const checked = !unchecked.has(row.debtId);
          return (
            <li key={row.debtId} className="flex min-h-11 items-center gap-3 py-1.5">
              <input
                id={checkboxId}
                type="checkbox"
                checked={checked}
                disabled={saving}
                onChange={() => toggle(row.debtId)}
                className="h-5 w-5 shrink-0 accent-action"
              />
              <label htmlFor={checkboxId} className="flex min-h-11 min-w-0 flex-1 items-center">
                <span className="truncate text-[14px] font-semibold text-txt">{row.name}</span>
              </label>
              <span className="flex shrink-0 items-center gap-1">
                <span aria-hidden="true" className="text-[14px] text-txt-muted">$</span>
                <input
                  type="text"
                  inputMode="decimal"
                  aria-label={`Amount for ${row.name}`}
                  value={amountText(row)}
                  disabled={saving || !checked}
                  onChange={(event) => setAmounts((prev) => ({ ...prev, [row.debtId]: event.target.value }))}
                  className="mono min-h-11 w-24 rounded-lg border border-border bg-surface px-2 text-right text-[14px] tabular-nums text-txt outline-none focus-visible:outline-2 focus-visible:outline-action disabled:opacity-50"
                />
              </span>
            </li>
          );
        })}
      </ul>
    </Sheet>
  );
}
