import { z } from "zod";
import type {
  CalculatorDraft,
  CalculatorSessionState,
} from "@/lib/calculatorDraft";

/**
 * Server-side twin of the localStorage calculator draft. Stored on the
 * CalculatorLead row (keyed by email) so the plan survives a device switch:
 * calculate on desktop, finish signup from the reminder email on a phone,
 * and onboarding still rehydrates the exact plan.
 *
 * Values are normalized numbers (not the raw input strings) so a bounded,
 * meaningful schema can validate them at the API edge.
 */

const MAX_AMOUNT = 100_000_000;
export const MAX_SNAPSHOT_DEBTS = 30;

export const planSnapshotSchema = z.object({
  version: z.literal(1),
  method: z.enum(["snowball", "avalanche", "custom"]),
  monthlyIncome: z.number().finite().min(0).max(MAX_AMOUNT),
  essentialExpenses: z.number().finite().min(0).max(MAX_AMOUNT),
  extraPayment: z.number().finite().min(0).max(MAX_AMOUNT),
  debtCategory: z.string().trim().max(40),
  debts: z
    .array(
      z.object({
        name: z.string().trim().max(120),
        balance: z.number().finite().positive().max(MAX_AMOUNT),
        rate: z.number().finite().min(0).max(100),
        minimum: z.number().finite().min(0).max(MAX_AMOUNT),
      }),
    )
    .min(1)
    .max(MAX_SNAPSHOT_DEBTS),
});

export type PlanSnapshot = z.infer<typeof planSnapshotSchema>;

function toAmount(value: string): number {
  const n = Number.parseFloat(value);
  return Number.isFinite(n) && n >= 0 ? Math.min(n, MAX_AMOUNT) : 0;
}

/**
 * Build a storable snapshot from live calculator state. Returns null when
 * there is nothing worth storing (no debt with a balance).
 */
export function buildPlanSnapshot(
  input: CalculatorSessionState,
): PlanSnapshot | null {
  const debts = input.debts
    .map((d, i) => ({
      name: (d.name.trim() || `Debt ${i + 1}`).slice(0, 120),
      balance: toAmount(d.balance),
      rate: Math.min(toAmount(d.rate), 100),
      minimum: toAmount(d.minimum),
    }))
    .filter((d) => d.balance > 0)
    .slice(0, MAX_SNAPSHOT_DEBTS);
  if (debts.length === 0) return null;
  return {
    version: 1,
    method: input.method,
    monthlyIncome: toAmount(input.monthlyIncome),
    essentialExpenses: toAmount(input.essentialExpenses),
    extraPayment: toAmount(input.extraPayment),
    debtCategory: input.debtCategory.slice(0, 40),
    debts,
  };
}

/**
 * Convert a stored snapshot back into the draft shape the onboarding express
 * screen consumes. `savedAt` should be the lead row's updatedAt so freshness
 * can be compared against a localStorage draft from another session.
 */
export function snapshotToDraft(
  snapshot: PlanSnapshot,
  extras: {
    savedAt: number;
    debtFreeDate?: string | null;
    interestSaved?: number | null;
  },
): CalculatorDraft {
  return {
    version: 1,
    savedAt: extras.savedAt,
    method: snapshot.method,
    monthlyIncome: String(snapshot.monthlyIncome),
    essentialExpenses: String(snapshot.essentialExpenses),
    extraPayment: String(snapshot.extraPayment),
    debtCategory: snapshot.debtCategory,
    debts: snapshot.debts.map((d) => ({
      name: d.name,
      balance: String(d.balance),
      rate: String(d.rate),
      minimum: String(d.minimum),
    })),
    debtFreeDate: extras.debtFreeDate ?? undefined,
    interestSaved:
      typeof extras.interestSaved === "number" &&
      Number.isFinite(extras.interestSaved)
        ? extras.interestSaved
        : undefined,
  };
}
