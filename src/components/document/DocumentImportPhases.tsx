'use client';

import React from 'react';
import { Upload, File, AlertCircle, CheckCircle, PlusCircle, X, TrendingDown, RefreshCw } from 'lucide-react';
import {
  type DocType, type Phase, type StatementData, type SimpleData,
  type ExtractedDebt, type ExtractedIncome,
  SectionHeader, Spinner, ReviewRow, ChargeRow,
} from '@/components/document/DocumentImportHelpers';

// ── Success ───────────────────────────────────────────────────────────────────
interface SuccessPhaseProps {
  savedCount: number;
  noun: string;
  essentialCount: number;
  isStatement: boolean;
  onReset: () => void;
}

export function SuccessPhase({ savedCount, noun, essentialCount, isStatement, onReset }: SuccessPhaseProps) {
  return (
    <div className="rounded-2xl p-6" style={{ background: '#ffffff', border: '1px solid rgba(15,23,42,0.08)' }}>
      <SectionHeader />
      <div className="rounded-xl p-6 text-center" style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.25)' }}>
        <CheckCircle size={40} className="mx-auto mb-3" style={{ color: '#10b981' }} />
        <p className="font-semibold text-sm mb-2" style={{ color: '#10b981' }}>{savedCount} {noun} added</p>
        {isStatement && essentialCount > 0 && (
          <p className="text-xs mb-1" style={{ color: '#6ec1e4' }}>
            {essentialCount} essential item{essentialCount !== 1 ? 's' : ''} also added to Monthly Essential Expenses
          </p>
        )}
        <p className="text-xs opacity-40 mb-5">Switch to the Income tab to review your updated budget.</p>
        <button onClick={onReset} className="px-5 py-2 rounded-lg text-sm font-medium hover:opacity-80 transition"
          style={{ background: 'rgba(15,23,42,0.06)', color: '#0f172a' }}>
          Upload More Documents
        </button>
      </div>
    </div>
  );
}

// ── Loading ───────────────────────────────────────────────────────────────────
export function LoadingPhase({ phase, docType, files }: { phase: Phase; docType: DocType; files: File[] }) {
  const steps = docType === 'statement'
    ? [
        { label: `Reading ${files.length} statement${files.length !== 1 ? 's' : ''} in parallel`, done: phase === 'saving' },
        { label: 'Finding recurring charge patterns across all files…', done: phase === 'saving' },
        { label: 'Saving to your account', done: false, active: phase === 'saving' },
      ]
    : [
        { label: `Uploading ${files.length} file${files.length !== 1 ? 's' : ''}`, done: phase === 'saving' },
        { label: 'Extracting financial data…', done: phase === 'saving' },
        { label: 'Saving to your account', done: false, active: phase === 'saving' },
      ];
  return (
    <div className="rounded-2xl p-6" style={{ background: '#ffffff', border: '1px solid rgba(15,23,42,0.08)' }}>
      <SectionHeader />
      <div className="rounded-xl p-8 text-center" style={{ background: 'rgba(59,130,246,0.06)', border: '1px solid rgba(59,130,246,0.18)' }}>
        <Spinner />
        <p className="text-sm font-medium mb-1 mt-4" style={{ color: '#93c5fd' }}>
          {phase === 'analyzing' ? (docType === 'statement' ? 'Analysing statements for recurring charges…' : 'Reading your documents…') : 'Saving selected items…'}
        </p>
        <p className="text-xs opacity-40 mb-5">{files.map(f => f.name).join(', ')}</p>
        <div className="space-y-2 text-left max-w-xs mx-auto">
          {steps.map((s, i) => (
            <div key={i} className="flex items-center gap-2 text-xs">
              {s.done
                ? <CheckCircle size={13} style={{ color: '#10b981', flexShrink: 0 }} />
                : <div style={{ width: 13, height: 13, borderRadius: '50%', border: `2px solid ${s.active ? '#3b82f6' : 'rgba(15,23,42,0.15)'}`, flexShrink: 0, animation: (phase === 'analyzing' && i === 1) || s.active ? 'spin 1s linear infinite' : undefined }} />
              }
              <span style={{ color: s.done ? '#10b981' : s.active ? '#2563eb' : '#94a3b8' }}>{s.label}</span>
            </div>
          ))}
        </div>
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

// ── Statement Review ──────────────────────────────────────────────────────────
interface StatementReviewPhaseProps {
  data: StatementData;
  selectedItems: boolean[];
  checkedCount: number;
  onSelect: (items: boolean[]) => void;
  onToggle: (i: number) => void;
  onConfirm: () => void;
  onReset: () => void;
}

export function StatementReviewPhase({ data, selectedItems, checkedCount, onSelect, onToggle, onConfirm, onReset }: StatementReviewPhaseProps) {
  const { recurringCharges, totalMonthlyEssential, totalMonthlyAll, analysisNotes } = data;
  const essential = recurringCharges.filter(c => c.isEssential);
  const nonEssential = recurringCharges.filter(c => !c.isEssential);
  const selectedEssentialTotal = recurringCharges
    .filter((_, i) => selectedItems[i] && recurringCharges[i].isEssential)
    .reduce((s, c) => s + c.monthlyAmount, 0);

  return (
    <div className="rounded-2xl p-6" style={{ background: '#ffffff', border: '1px solid rgba(15,23,42,0.08)' }}>
      <div className="flex items-center justify-between mb-2">
        <SectionHeader />
        <button onClick={onReset} className="text-xs opacity-40 hover:opacity-70 transition flex items-center gap-1"><RefreshCw size={11} /> Start over</button>
      </div>
      <div className="grid grid-cols-3 gap-3 mb-5">
        {[
          { label: 'Found', value: `${recurringCharges.length} charges`, color: '#93c5fd' },
          { label: 'Essential / mo', value: `$${totalMonthlyEssential.toFixed(0)}`, color: '#10b981' },
          { label: 'Total / mo', value: `$${totalMonthlyAll.toFixed(0)}`, color: '#0f172a' },
        ].map((s, i) => (
          <div key={i} className="rounded-xl p-3 text-center" style={{ background: 'rgba(15,23,42,0.04)', border: '1px solid rgba(15,23,42,0.08)' }}>
            <p className="text-xs opacity-50 mb-1">{s.label}</p>
            <p className="font-bold text-sm" style={{ color: s.color }}>{s.value}</p>
          </div>
        ))}
      </div>
      {analysisNotes && (
        <p className="text-xs mb-4 p-3 rounded-lg italic" style={{ background: 'rgba(59,130,246,0.07)', color: '#94a3b8', border: '1px solid rgba(59,130,246,0.15)' }}>
          💡 {analysisNotes}
        </p>
      )}
      <div className="flex gap-3 mb-4">
        <button onClick={() => onSelect(recurringCharges.map(() => true))} className="text-xs px-3 py-1.5 rounded-lg hover:opacity-80 transition" style={{ background: 'rgba(59,130,246,0.12)', color: '#93c5fd' }}>Select all</button>
        <button onClick={() => onSelect(recurringCharges.map(c => c.isEssential))} className="text-xs px-3 py-1.5 rounded-lg hover:opacity-80 transition" style={{ background: 'rgba(16,185,129,0.1)', color: '#10b981' }}>Essential only</button>
        <button onClick={() => onSelect(recurringCharges.map(() => false))} className="text-xs px-3 py-1.5 rounded-lg hover:opacity-80 transition" style={{ background: 'rgba(15,23,42,0.04)', color: '#64748b' }}>Deselect all</button>
      </div>
      <div className="space-y-4 mb-5 max-h-96 overflow-y-auto pr-1">
        {essential.length > 0 && (
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: '#10b981', letterSpacing: '0.1em' }}>Essential Expenses</p>
            <div className="space-y-2">
              {essential.map((c) => { const gi = recurringCharges.indexOf(c); return <ChargeRow key={gi} charge={c} selected={selectedItems[gi]} onToggle={() => onToggle(gi)} />; })}
            </div>
          </div>
        )}
        {nonEssential.length > 0 && (
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: '#64748b', letterSpacing: '0.1em' }}>Other Recurring</p>
            <div className="space-y-2">
              {nonEssential.map((c) => { const gi = recurringCharges.indexOf(c); return <ChargeRow key={gi} charge={c} selected={selectedItems[gi]} onToggle={() => onToggle(gi)} />; })}
            </div>
          </div>
        )}
      </div>
      <div className="rounded-xl p-3 mb-4" style={{ background: 'rgba(15,23,42,0.04)', border: '1px solid rgba(15,23,42,0.08)' }}>
        <div className="flex justify-between text-xs">
          <span style={{ color: '#64748b' }}>Selected essential / mo</span>
          <span className="font-bold" style={{ color: '#10b981' }}>${selectedEssentialTotal.toFixed(2)}</span>
        </div>
      </div>
      <div className="rounded-lg p-3 mb-4 text-xs space-y-1" style={{ background: 'rgba(15,23,42,0.04)', border: '1px solid rgba(15,23,42,0.08)' }}>
        <p style={{ color: '#6ec1e4' }}><strong>🔵 All selected items</strong> → added to <strong>Recurring Expenses</strong> list (Income tab)</p>
        {essential.length > 0 && <p style={{ color: '#10b981' }}><strong>✅ Essential items only</strong> → also added to <strong>Monthly Essential Expenses</strong> total</p>}
      </div>
      <div className="flex gap-3">
        <button onClick={onConfirm} disabled={checkedCount === 0} className="flex-1 py-2.5 rounded-lg font-semibold text-sm text-white transition disabled:opacity-40 flex items-center justify-center gap-2" style={{ background: '#3b82f6' }}>
          <PlusCircle size={15} /> Import {checkedCount} recurring expense{checkedCount !== 1 ? 's' : ''}
        </button>
        <button onClick={onReset} className="px-4 py-2.5 rounded-lg text-sm font-medium hover:opacity-80 transition" style={{ background: 'rgba(15,23,42,0.04)', color: '#64748b' }}>Cancel</button>
      </div>
    </div>
  );
}

// ── Simple Review (Debt / Income) ─────────────────────────────────────────────
interface SimpleReviewPhaseProps {
  data: SimpleData;
  selectedItems: boolean[];
  checkedCount: number;
  onToggle: (i: number) => void;
  onConfirm: () => void;
  onReset: () => void;
}

export function SimpleReviewPhase({ data, selectedItems, checkedCount, onToggle, onConfirm, onReset }: SimpleReviewPhaseProps) {
  const isDebt = data.type === 'debt';
  return (
    <div className="rounded-2xl p-6" style={{ background: '#ffffff', border: '1px solid rgba(15,23,42,0.08)' }}>
      <h2 className="font-semibold text-base mb-4 flex items-center gap-2">
        <CheckCircle size={18} style={{ color: '#10b981' }} /> Review Extracted Data
      </h2>
      <div className="space-y-3 mb-5">
        {isDebt
          ? (data.items as ExtractedDebt[]).map((d, i) => (
              <ReviewRow key={i} selected={selectedItems[i]} onToggle={() => onToggle(i)}>
                <div className="flex flex-wrap gap-x-4 gap-y-1 mb-1">
                  <span className="font-semibold text-sm">{d.name}</span>
                  <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: 'rgba(15,23,42,0.06)', color: '#64748b' }}>{d.category}</span>
                </div>
                <div className="flex flex-wrap gap-x-5 gap-y-1 text-xs" style={{ color: '#64748b' }}>
                  <span>Balance <strong style={{ color: '#0f172a' }}>${d.balance.toLocaleString()}</strong></span>
                  <span>APR <strong style={{ color: '#0f172a' }}>{d.interestRate}%</strong></span>
                  <span>Min <strong style={{ color: '#0f172a' }}>${d.minimumPayment}/mo</strong></span>
                  {d.creditLimit > 0 && <span>Limit <strong style={{ color: '#0f172a' }}>${d.creditLimit.toLocaleString()}</strong></span>}
                </div>
              </ReviewRow>
            ))
          : (data.items as ExtractedIncome[]).map((inc, i) => (
              <ReviewRow key={i} selected={selectedItems[i]} onToggle={() => onToggle(i)}>
                <p className="font-semibold text-sm mb-1">Take-home <span style={{ color: '#10b981' }}>${inc.monthlyTakeHome.toLocaleString()}/mo</span></p>
                <div className="flex gap-4 text-xs" style={{ color: '#64748b' }}>
                  <span>Source <strong style={{ color: '#0f172a' }}>{inc.source || '—'}</strong></span>
                  <span>Frequency <strong style={{ color: '#0f172a' }}>{inc.frequency}</strong></span>
                </div>
              </ReviewRow>
            ))
        }
      </div>
      <div className="flex gap-3">
        <button onClick={onConfirm} disabled={checkedCount === 0} className="flex-1 py-2.5 rounded-lg font-semibold text-sm text-white transition disabled:opacity-40 flex items-center justify-center gap-2" style={{ background: '#3b82f6' }}>
          <PlusCircle size={15} /> Import {checkedCount} {isDebt ? `debt${checkedCount !== 1 ? 's' : ''}` : 'income record'}
        </button>
        <button onClick={onReset} className="px-4 py-2.5 rounded-lg text-sm font-medium hover:opacity-80 transition" style={{ background: 'rgba(15,23,42,0.04)', color: '#64748b' }}>Cancel</button>
      </div>
    </div>
  );
}

// ── Upload (idle / error) ─────────────────────────────────────────────────────
interface UploadPhaseProps {
  docType: DocType;
  setDocType: (t: DocType) => void;
  files: File[];
  dragActive: boolean;
  error: string;
  fileInputRef: React.RefObject<HTMLInputElement>;
  onDrag: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent) => void;
  onFileInput: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onRemoveFile: (i: number) => void;
  onUpload: () => void;
}

export function UploadPhase({ docType, setDocType, files, dragActive, error, fileInputRef, onDrag, onDrop, onFileInput, onRemoveFile, onUpload }: UploadPhaseProps) {
  return (
    <div className="rounded-2xl p-6" style={{ background: '#ffffff', border: '1px solid rgba(15,23,42,0.08)' }}>
      <SectionHeader />
      <p className="text-sm opacity-60 mb-5">Upload one or more documents. Claude AI extracts debts, income, or recurring expenses automatically.</p>
      <div className="mb-4">
        <label className="text-xs opacity-60 mb-2 block">What are you uploading?</label>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          {([
            { value: 'statement', label: '🏦 Bank Statements', sub: 'Find recurring & essential expenses' },
            { value: 'debt',      label: '💳 Debt Documents',   sub: 'Credit cards, loans, statements' },
            { value: 'income',    label: '💵 Pay Stubs',         sub: 'Income & take-home pay' },
          ] as const).map((t) => (
            <button key={t.value} onClick={() => setDocType(t.value)} className="p-3 rounded-xl text-left transition"
              style={{ background: docType === t.value ? 'rgba(59,130,246,0.08)' : 'rgba(15,23,42,0.03)', border: `1px solid ${docType === t.value ? 'rgba(59,130,246,0.4)' : 'rgba(15,23,42,0.08)'}` }}>
              <p className="text-sm font-medium mb-0.5">{t.label}</p>
              <p className="text-xs" style={{ color: '#64748b' }}>{t.sub}</p>
            </button>
          ))}
        </div>
      </div>
      <div onDragEnter={onDrag} onDragLeave={onDrag} onDragOver={onDrag} onDrop={onDrop}
        onClick={() => fileInputRef.current?.click()}
        className="border-2 border-dashed rounded-xl p-6 text-center transition cursor-pointer mb-4"
        style={{ borderColor: dragActive ? '#3b82f6' : files.length ? 'rgba(59,130,246,0.35)' : 'rgba(15,23,42,0.15)', background: dragActive ? 'rgba(59,130,246,0.08)' : 'transparent' }}>
        <Upload size={28} className="mx-auto mb-2 opacity-50" />
        <p className="text-sm opacity-70 mb-1">Drop files here or <span style={{ color: '#3b82f6' }}>browse</span></p>
        <p className="text-xs opacity-40">PDF, JPG, PNG — multiple files supported</p>
        <input ref={fileInputRef} type="file" className="hidden" multiple accept=".pdf,.jpg,.jpeg,.png,.gif,.webp" onChange={onFileInput} />
      </div>
      {files.length > 0 && (
        <div className="space-y-2 mb-4">
          {files.map((f, i) => (
            <div key={i} className="flex items-center gap-3 rounded-lg px-3 py-2" style={{ background: 'rgba(59,130,246,0.07)', border: '1px solid rgba(59,130,246,0.2)' }}>
              <File size={14} style={{ color: '#3b82f6', flexShrink: 0 }} />
              <span className="text-xs flex-1 truncate" style={{ color: '#cbd5e1' }}>{f.name}</span>
              <span className="text-xs flex-shrink-0" style={{ color: '#475569' }}>{(f.size / 1024).toFixed(0)} KB</span>
              <button onClick={(e) => { e.stopPropagation(); onRemoveFile(i); }} className="hover:opacity-80 transition flex-shrink-0" style={{ color: '#64748b' }}><X size={14} /></button>
            </div>
          ))}
          <button onClick={() => fileInputRef.current?.click()} className="w-full py-1.5 rounded-lg text-xs font-medium hover:opacity-80 transition"
            style={{ background: 'rgba(15,23,42,0.04)', color: '#64748b', border: '1px solid rgba(15,23,42,0.08)' }}>
            + Add more files
          </button>
        </div>
      )}
      {error && (
        <div className="p-3 rounded-lg mb-4 flex items-start gap-2 text-sm" style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', color: '#f87171' }}>
          <AlertCircle size={15} className="flex-shrink-0 mt-0.5" /> {error}
        </div>
      )}
      <button onClick={onUpload} disabled={!files.length || !docType}
        className="w-full py-3 rounded-xl font-semibold text-sm text-white transition disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        style={{ background: (!files.length || !docType) ? '#334155' : '#3b82f6' }}>
        <TrendingDown size={16} />
        {!docType ? 'Select a document type above' : !files.length ? 'Add at least one file' : `Analyse ${files.length} file${files.length !== 1 ? 's' : ''} with AI`}
      </button>
      <div className="mt-4 p-3 rounded-lg text-xs" style={{ background: 'rgba(15,23,42,0.04)' }}>
        <p className="font-medium mb-1.5 opacity-70">💡 How it works</p>
        <ul className="space-y-1 opacity-50 list-disc list-inside">
          <li>Upload bank statements to find recurring & essential expenses</li>
          <li>Upload debt documents to auto-fill balances, rates & minimums</li>
          <li>Upload pay stubs to set your monthly take-home income</li>
          <li>Review all extracted items before anything is saved</li>
        </ul>
      </div>
    </div>
  );
}
