'use client';

import { type PayoffMethod } from '@/lib/snowball';
import { Info } from 'lucide-react';

interface StrategyExplanationProps {
  payoffMethod: PayoffMethod;
}

export default function StrategyExplanation({ payoffMethod }: StrategyExplanationProps) {
  return (
    <div
      className="rounded-2xl p-5"
      style={{ background: '#ffffff', border: '1px solid rgba(15,23,42,0.08)', boxShadow: 'rgba(15, 23, 42, 0.06) 0px 1px 4px' }}
    >
      <h2 className="font-semibold text-base mb-3 flex items-center gap-2" style={{ color: '#0f172a' }}>
        <Info size={18} style={{ color: '#3b82f6' }} />
        How This Strategy Works
      </h2>
      {payoffMethod === 'snowball' && (
        <ol className="text-sm space-y-2 pl-5 list-decimal" style={{ color: '#475569' }}>
          <li>Pay minimums on all debts except the <strong>smallest balance</strong>.</li>
          <li>Attack the smallest debt with all available cash flow above minimums.</li>
          <li>Once it&apos;s paid off, roll its minimum payment into the next smallest debt.</li>
          <li>Repeat and your monthly snowball grows with each debt eliminated.</li>
        </ol>
      )}
      {payoffMethod === 'avalanche' && (
        <ol className="text-sm space-y-2 pl-5 list-decimal" style={{ color: '#475569' }}>
          <li>Pay minimums on all debts except the <strong>highest APR debt</strong>.</li>
          <li>Apply all extra cash to the highest-interest debt first.</li>
          <li>Once paid, roll that payment into the next highest APR debt.</li>
          <li>Repeat to minimize total interest paid over time.</li>
        </ol>
      )}
      {payoffMethod === 'custom' && (
        <ol className="text-sm space-y-2 pl-5 list-decimal" style={{ color: '#475569' }}>
          <li>Debts are prioritized by your <strong>custom priority order</strong>.</li>
          <li>Minimums are paid on all debts each month.</li>
          <li>All extra cash is directed at the highest-priority open debt.</li>
          <li>When a debt is closed, its minimum payment rolls into the next debt.</li>
        </ol>
      )}
    </div>
  );
}
