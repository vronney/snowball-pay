'use client';

import React from 'react';
import { Upload, CheckCircle } from 'lucide-react';

// ── Types ─────────────────────────────────────────────────────────────────────
export interface ExtractedDebt {
  name: string; category: string; balance: number;
  interestRate: number; minimumPayment: number;
  creditLimit: number; dueDate: number | null;
}
export interface ExtractedIncome {
  monthlyTakeHome: number; source: string; frequency: string;
}
export interface RecurringCharge {
  name: string; amount: number; frequency: string;
  monthlyAmount: number; category: string;
  isEssential: boolean; occurrences: number;
  confidence: 'high' | 'medium' | 'low';
}
export interface StatementData {
  type: 'statement';
  recurringCharges: RecurringCharge[];
  totalMonthlyEssential: number;
  totalMonthlyAll: number;
  analysisNotes: string;
}
export interface SimpleData {
  type: 'debt' | 'income';
  items: ExtractedDebt[] | ExtractedIncome[];
}
export type ExtractedData = StatementData | SimpleData;
export type Phase = 'idle' | 'analyzing' | 'review' | 'saving' | 'success' | 'error';
export type DocType = 'debt' | 'income' | 'statement' | '';

// ── Constants ─────────────────────────────────────────────────────────────────
export const VALID_DEBT_CATEGORIES = ['Credit Card', 'Student Loan', 'Auto Loan', 'Mortgage', 'Personal Loan', 'Medical Debt', 'Other'];

export const CATEGORY_LABELS: Record<string, string> = {
  housing: '🏠 Housing', utilities: '⚡ Utilities', insurance: '🛡️ Insurance',
  food: '🛒 Food', transport: '🚗 Transport', medical: '💊 Medical',
  subscriptions: '📱 Subscriptions', entertainment: '🎬 Entertainment', other: '📦 Other',
};

export const CONFIDENCE_STYLE: Record<string, { bg: string; color: string; label: string }> = {
  high:   { bg: 'rgba(16,185,129,0.12)', color: '#10b981', label: 'High confidence' },
  medium: { bg: 'rgba(245,158,11,0.12)',  color: '#f59e0b', label: 'Medium confidence' },
  low:    { bg: 'rgba(100,116,139,0.12)', color: '#64748b', label: 'Low confidence' },
};

// ── Sub-components ────────────────────────────────────────────────────────────
export function SectionHeader() {
  return (
    <h2 className="font-semibold text-base mb-1 flex items-center gap-2">
      <Upload size={18} style={{ color: '#3b82f6' }} />
      Import from Documents
    </h2>
  );
}

export function Spinner() {
  return (
    <>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      <svg viewBox="0 0 44 44" style={{ width: 44, height: 44, animation: 'spin 1s linear infinite', display: 'block', margin: '0 auto' }}>
        <circle cx="22" cy="22" r="18" fill="none" stroke="rgba(59,130,246,0.2)" strokeWidth="3" />
        <circle cx="22" cy="22" r="18" fill="none" stroke="#3b82f6" strokeWidth="3" strokeLinecap="round" strokeDasharray="30 84" />
      </svg>
    </>
  );
}

export function ReviewRow({ selected, onToggle, children }: { selected: boolean; onToggle: () => void; children: React.ReactNode }) {
  return (
    <div className="rounded-xl p-4 flex gap-3 items-start"
      style={{ background: selected ? 'rgba(59,130,246,0.07)' : 'rgba(15,23,42,0.03)', border: `1px solid ${selected ? 'rgba(59,130,246,0.25)' : 'rgba(15,23,42,0.08)'}` }}>
      <button onClick={onToggle} className="mt-0.5 flex-shrink-0 w-5 h-5 rounded flex items-center justify-center transition"
        style={{ background: selected ? '#3b82f6' : 'rgba(15,23,42,0.06)', border: `1px solid ${selected ? '#3b82f6' : 'rgba(15,23,42,0.15)'}` }}>
        {selected && <CheckCircle size={12} style={{ color: '#fff' }} />}
      </button>
      <div className="flex-1 min-w-0">{children}</div>
    </div>
  );
}

export function ChargeRow({ charge, selected, onToggle }: { charge: RecurringCharge; selected: boolean; onToggle: () => void }) {
  const conf = CONFIDENCE_STYLE[charge.confidence] ?? CONFIDENCE_STYLE.low;
  return (
    <div className="rounded-xl p-3 flex gap-3 items-start transition"
      style={{ background: selected ? 'rgba(59,130,246,0.07)' : 'rgba(15,23,42,0.03)', border: `1px solid ${selected ? 'rgba(59,130,246,0.22)' : 'rgba(15,23,42,0.08)'}` }}>
      <button onClick={onToggle} className="mt-0.5 flex-shrink-0 w-5 h-5 rounded flex items-center justify-center transition"
        style={{ background: selected ? '#3b82f6' : 'rgba(15,23,42,0.06)', border: `1px solid ${selected ? '#3b82f6' : 'rgba(15,23,42,0.15)'}` }}>
        {selected && <CheckCircle size={12} style={{ color: '#fff' }} />}
      </button>
      <div className="flex-1 min-w-0">
        <div className="flex flex-wrap items-center gap-2 mb-1">
          <span className="text-sm font-semibold truncate">{charge.name}</span>
          <span className="text-xs px-1.5 py-0.5 rounded-full flex-shrink-0" style={{ background: 'rgba(15,23,42,0.06)', color: '#64748b' }}>
            {CATEGORY_LABELS[charge.category] ?? charge.category}
          </span>
          <span className="text-xs px-1.5 py-0.5 rounded-full flex-shrink-0" style={{ background: conf.bg, color: conf.color }}>{conf.label}</span>
        </div>
        <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-xs" style={{ color: '#64748b' }}>
          <span>
            <strong style={{ color: '#0f172a' }}>${charge.monthlyAmount.toFixed(2)}/mo</strong>
            {charge.frequency !== 'monthly' && <span className="ml-1">(${charge.amount} {charge.frequency})</span>}
          </span>
          <span>Seen <strong style={{ color: '#0f172a' }}>{charge.occurrences}×</strong></span>
        </div>
      </div>
    </div>
  );
}
