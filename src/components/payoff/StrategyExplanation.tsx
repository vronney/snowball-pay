'use client';

import { type PayoffMethod } from '@/lib/snowball';
import { Info } from 'lucide-react';

interface StrategyExplanationProps {
  payoffMethod: PayoffMethod;
}

export default function StrategyExplanation({ payoffMethod }: StrategyExplanationProps) {
  return (
    <div className="rounded-2xl p-5" style={{ background: 'rgba(19,29,46,1)' }}>
      <h2 className="font-semibold text-base mb-3 flex items-center gap-2">
        <Info size={18} style={{ color: '#3b82f6' }} />
        How This Strategy Works
      </h2>
      {payoffMethod === 'snowball' && (
        <ol className="text-sm opacity-70 space-y-2 pl-5 list-decimal">
          <li>Pay minimums on all debts except the <strong>smallest balance</strong>.</li>
          <li>Attack the smallest debt with all available cash flow above minimums.</li>
          <li>Once it&apos;s paid off, roll its minimum payment into the next smallest debt.</li>
          <li>Repeat and your monthly snowball grows with each debt eliminated.</li>
        </ol>
      )}
      {payoffMethod === 'avalanche' && (
        <ol className="text-sm opacity-70 space-y-2 pl-5 list-decimal">
          <li>Pay minimums on all debts except the <strong>highest APR debt</strong>.</li>
          <li>Apply all extra cash to the highest-interest debt first.</li>
          <li>Once paid, roll that payment into the next highest APR debt.</li>
          <li>Repeat to minimize total interest paid over time.</li>
        </ol>
      )}
      {payoffMethod === 'custom' && (
        <ol className="text-sm opacity-70 space-y-2 pl-5 list-decimal">
          <li>Debts are prioritized by your <strong>custom priority order</strong>.</li>
          <li>Minimums are paid on all debts each month.</li>
          <li>All extra cash is directed at the highest-priority open debt.</li>
          <li>When a debt is closed, its minimum payment rolls into the next debt.</li>
        </ol>
      )}
    </div>
  );
}
