import type { Income } from '@/types';

export interface IncomeSavePayload {
  monthlyTakeHome: number;
  essentialExpenses: number;
  extraPayment: number;
  payoffMethod: string;
  accelerationAmount: number | null;
}

/**
 * The Plan tab's own `POST /api/income` payload (PayoffTab.tsx:113-119) with
 * one field changed. Every one-tap move on Coach and the plan closing card
 * saves through this, so the write is the same one the slider and the method
 * toggle make.
 */
export function incomeSavePayload(
  income: Income,
  patch: { payoffMethod?: 'snowball' | 'avalanche' | 'custom'; accelerationAmount?: number | null },
): IncomeSavePayload {
  return {
    monthlyTakeHome: income.monthlyTakeHome,
    essentialExpenses: income.essentialExpenses,
    extraPayment: income.extraPayment,
    payoffMethod: patch.payoffMethod ?? income.payoffMethod ?? 'snowball',
    accelerationAmount:
      patch.accelerationAmount !== undefined ? patch.accelerationAmount : (income.accelerationAmount ?? null),
  };
}
