'use client';

import { useState, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Upload, File, AlertCircle, CheckCircle, PlusCircle, X, TrendingDown, RefreshCw } from 'lucide-react';

type Phase = 'idle' | 'analyzing' | 'review' | 'saving' | 'success' | 'error';
type DocType = 'debt' | 'income' | 'statement' | '';

// ── Extracted data shapes ─────────────────────────────────────────────────────
interface ExtractedDebt {
  name: string; category: string; balance: number;
  interestRate: number; minimumPayment: number;
  creditLimit: number; dueDate: number | null;
}
interface ExtractedIncome {
  monthlyTakeHome: number; source: string; frequency: string;
}
interface RecurringCharge {
  name: string; amount: number; frequency: string;
  monthlyAmount: number; category: string;
  isEssential: boolean; occurrences: number;
  confidence: 'high' | 'medium' | 'low';
}
interface StatementData {
  type: 'statement';
  recurringCharges: RecurringCharge[];
  totalMonthlyEssential: number;
  totalMonthlyAll: number;
  analysisNotes: string;
}
interface SimpleData {
  type: 'debt' | 'income';
  items: ExtractedDebt[] | ExtractedIncome[];
}
type ExtractedData = StatementData | SimpleData;

// ── Constants ─────────────────────────────────────────────────────────────────
const VALID_DEBT_CATEGORIES = ['Credit Card', 'Student Loan', 'Auto Loan', 'Mortgage', 'Personal Loan', 'Medical Debt', 'Other'];

const CATEGORY_LABELS: Record<string, string> = {
  housing: '🏠 Housing', utilities: '⚡ Utilities', insurance: '🛡️ Insurance',
  food: '🛒 Food', transport: '🚗 Transport', medical: '💊 Medical',
  subscriptions: '📱 Subscriptions', entertainment: '🎬 Entertainment', other: '📦 Other',
};

const CONFIDENCE_STYLE: Record<string, { bg: string; color: string; label: string }> = {
  high:   { bg: 'rgba(16,185,129,0.12)', color: '#10b981', label: 'High confidence' },
  medium: { bg: 'rgba(245,158,11,0.12)',  color: '#f59e0b', label: 'Medium confidence' },
  low:    { bg: 'rgba(100,116,139,0.12)', color: '#64748b', label: 'Low confidence' },
};

// ── Component ─────────────────────────────────────────────────────────────────
export default function DocumentImport() {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [files, setFiles] = useState<File[]>([]);
  const [dragActive, setDragActive] = useState(false);
  const [docType, setDocType] = useState<DocType>('');
  const [phase, setPhase] = useState<Phase>('idle');
  const [error, setError] = useState('');
  const [extractedData, setExtractedData] = useState<ExtractedData | null>(null);
  const [selectedItems, setSelectedItems] = useState<boolean[]>([]);
  const [savedCount, setSavedCount] = useState(0);

  // ── File handling ──
  const addFiles = (incoming: FileList | File[]) => {
    const arr = Array.from(incoming).filter(
      (f) => /\.(pdf|jpe?g|png|gif|webp)$/i.test(f.name)
    );
    setFiles((prev) => {
      const existing = new Set(prev.map((f) => f.name + f.size));
      return [...prev, ...arr.filter((f) => !existing.has(f.name + f.size))];
    });
    setError('');
  };

  const removeFile = (idx: number) => setFiles((prev) => prev.filter((_, i) => i !== idx));

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault(); e.stopPropagation();
    setDragActive(e.type === 'dragenter' || e.type === 'dragover');
  };
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault(); e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files.length) addFiles(e.dataTransfer.files);
  };
  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.length) addFiles(e.target.files);
    // reset so same file can be re-added after removal
    e.target.value = '';
  };

  // ── Upload & analyse ──
  const handleUpload = async () => {
    if (!files.length || !docType) { setError('Select files and a document type first'); return; }

    // Guard: total upload size (browser-side check before hitting server)
    const totalMB = files.reduce((s, f) => s + f.size, 0) / (1024 * 1024);
    if (totalMB > 90) {
      setError(`Total file size is ${totalMB.toFixed(0)} MB — please keep it under 90 MB. Try splitting into two batches.`);
      return;
    }

    setError('');
    setPhase('analyzing');

    try {
      const formData = new FormData();
      formData.append('fileType', docType);
      files.forEach((f) => formData.append('files', f));

      const res = await fetch('/api/documents/upload', { method: 'POST', body: formData });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || 'Upload failed');
      }

      const { extractedData: data } = await res.json();

      // Validate something was found
      const hasData = data?.type === 'statement'
        ? data.recurringCharges?.length > 0
        : data?.items?.length > 0;

      if (!hasData) {
        setError('No financial data could be extracted. Please try a clearer image or different file.');
        setPhase('error');
        return;
      }

      const itemCount = data.type === 'statement'
        ? data.recurringCharges.length
        : data.items.length;

      setExtractedData(data);
      setSelectedItems(Array(itemCount).fill(true));
      setPhase('review');
    } catch (err: any) {
      console.error('Analysis error:', err);
      setError(err.message || 'Failed to process documents.');
      setPhase('error');
    }
  };

  // ── Confirm import ──
  const handleConfirmImport = async () => {
    if (!extractedData) return;
    setPhase('saving');
    let count = 0;

    try {
      if (extractedData.type === 'statement') {
        const charges = extractedData.recurringCharges;

        // Save each selected charge as a Recurring Expense line item
        for (let i = 0; i < charges.length; i++) {
          if (!selectedItems[i]) continue;
          const c = charges[i];
          const res = await fetch('/api/expenses', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              name: c.name,
              amount: c.monthlyAmount,
              frequency: 'monthly',
              category: c.category || 'other',
            }),
          });
          if (res.ok) count++;
          else console.error('Failed to save expense:', c.name, await res.json().catch(() => ({})));
        }

        // Also update Income.essentialExpenses with the sum of selected essential items.
        // First fetch the current income record so we don't overwrite other fields.
        const essentialTotal = charges
          .filter((c, i) => selectedItems[i] && c.isEssential)
          .reduce((sum, c) => sum + c.monthlyAmount, 0);

        if (essentialTotal > 0) {
          const incomeRes = await fetch('/api/income').catch(() => null);
          const incomeBody = incomeRes?.ok ? await incomeRes.json().catch(() => ({})) : {};
          const existing = incomeBody?.income;
          await fetch('/api/income', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              monthlyTakeHome:   existing?.monthlyTakeHome   ?? 0,
              essentialExpenses: (existing?.essentialExpenses ?? 0) + essentialTotal,
              extraPayment:      existing?.extraPayment       ?? 0,
              source:            existing?.source             ?? '',
              frequency:         existing?.frequency          ?? 'monthly',
            }),
          });
          queryClient.invalidateQueries({ queryKey: ['income'] });
        }

        queryClient.invalidateQueries({ queryKey: ['expenses'] });

      } else if (extractedData.type === 'debt') {
        const debts = extractedData.items as ExtractedDebt[];
        for (let i = 0; i < debts.length; i++) {
          if (!selectedItems[i]) continue;
          const d = debts[i];
          const res = await fetch('/api/debts', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              name: d.name || 'Unknown Debt',
              category: VALID_DEBT_CATEGORIES.includes(d.category) ? d.category : 'Other',
              balance: d.balance || 0,
              interestRate: d.interestRate || 0,
              minimumPayment: d.minimumPayment || 0,
              creditLimit: d.creditLimit || 0,
              dueDate: d.dueDate ?? undefined,
            }),
          });
          if (res.ok) count++;
          else console.error('Failed to save debt:', d.name, await res.json().catch(() => ({})));
        }
        queryClient.invalidateQueries({ queryKey: ['debts'] });

      } else if (extractedData.type === 'income') {
        const incomes = extractedData.items as ExtractedIncome[];
        for (let i = 0; i < incomes.length; i++) {
          if (!selectedItems[i]) continue;
          const inc = incomes[i];
          const res = await fetch('/api/income', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              monthlyTakeHome: inc.monthlyTakeHome || 0,
              essentialExpenses: 0,
              extraPayment: 0,
              source: inc.source || '',
              frequency: inc.frequency || 'monthly',
            }),
          });
          if (res.ok) count++;
          else console.error('Failed to save income:', await res.json().catch(() => ({})));
        }
        queryClient.invalidateQueries({ queryKey: ['income'] });
      }

      setSavedCount(count);
      setPhase('success');
    } catch (err) {
      console.error('Save error:', err);
      setError('Failed to save some items. Please try again.');
      setPhase('error');
    }
  };

  const handleReset = () => {
    setFiles([]); setDocType(''); setPhase('idle'); setError('');
    setExtractedData(null); setSelectedItems([]); setSavedCount(0);
  };

  const toggleItem = (i: number) =>
    setSelectedItems((prev) => prev.map((v, idx) => idx === i ? !v : v));

  const checkedCount = selectedItems.filter(Boolean).length;

  // ── Success ───────────────────────────────────────────────────────────────
  if (phase === 'success') {
    const isStatement = extractedData?.type === 'statement';
    const isDebt      = extractedData?.type === 'debt';
    const noun = isStatement
      ? `recurring expense${savedCount !== 1 ? 's' : ''}`
      : isDebt
        ? `debt${savedCount !== 1 ? 's' : ''}`
        : 'income record';

    // Calculate how many essential items were imported (for the success message)
    const essentialCount = isStatement
      ? (extractedData as StatementData).recurringCharges.filter((c, i) => selectedItems[i] && c.isEssential).length
      : 0;

    return (
      <div className="rounded-2xl p-6" style={{ background: 'rgba(26,35,50,1)' }}>
        <SectionHeader />
        <div className="rounded-xl p-6 text-center" style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.25)' }}>
          <CheckCircle size={40} className="mx-auto mb-3" style={{ color: '#10b981' }} />
          <p className="font-semibold text-sm mb-2" style={{ color: '#10b981' }}>
            {savedCount} {noun} added
          </p>
          {isStatement && essentialCount > 0 && (
            <p className="text-xs mb-1" style={{ color: '#6ec1e4' }}>
              {essentialCount} essential item{essentialCount !== 1 ? 's' : ''} also added to Monthly Essential Expenses
            </p>
          )}
          <p className="text-xs opacity-40 mb-5">
            Switch to the Income tab to review your updated budget.
          </p>
          <button onClick={handleReset} className="px-5 py-2 rounded-lg text-sm font-medium hover:opacity-80 transition"
            style={{ background: 'rgba(255,255,255,0.07)', color: '#e2e8f0' }}>
            Upload More Documents
          </button>
        </div>
      </div>
    );
  }

  // ── Analysing / Saving spinner ────────────────────────────────────────────
  if (phase === 'analyzing' || phase === 'saving') {
    const steps = docType === 'statement'
      ? [
          { label: `Reading ${files.length} statement${files.length !== 1 ? 's' : ''} in parallel`, done: phase === 'saving' },
          { label: 'Finding recurring charge patterns across all files…',                             done: phase === 'saving' },
          { label: 'Saving to your account',                                                          done: false, active: phase === 'saving' },
        ]
      : [
          { label: `Uploading ${files.length} file${files.length !== 1 ? 's' : ''}`, done: phase === 'saving' },
          { label: 'Extracting financial data…',                                      done: phase === 'saving' },
          { label: 'Saving to your account',                                          done: false, active: phase === 'saving' },
        ];
    return (
      <div className="rounded-2xl p-6" style={{ background: 'rgba(26,35,50,1)' }}>
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
                  : <div style={{ width: 13, height: 13, borderRadius: '50%', border: `2px solid ${s.active ? '#3b82f6' : 'rgba(255,255,255,0.15)'}`, flexShrink: 0, animation: (phase === 'analyzing' && i === 1) || s.active ? 'spin 1s linear infinite' : undefined }} />
                }
                <span style={{ color: s.done ? '#10b981' : s.active ? '#93c5fd' : 'rgba(255,255,255,0.35)' }}>{s.label}</span>
              </div>
            ))}
          </div>
        </div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  // ── Review — Statement (recurring charges) ────────────────────────────────
  if (phase === 'review' && extractedData?.type === 'statement') {
    const { recurringCharges, totalMonthlyEssential, totalMonthlyAll, analysisNotes } = extractedData;
    const essential = recurringCharges.filter(c => c.isEssential);
    const nonEssential = recurringCharges.filter(c => !c.isEssential);
    const selectedEssentialTotal = recurringCharges
      .filter((_, i) => selectedItems[i] && recurringCharges[i].isEssential)
      .reduce((s, c) => s + c.monthlyAmount, 0);

    return (
      <div className="rounded-2xl p-6" style={{ background: 'rgba(26,35,50,1)' }}>
        <div className="flex items-center justify-between mb-2">
          <SectionHeader />
          <button onClick={handleReset} className="text-xs opacity-40 hover:opacity-70 transition flex items-center gap-1">
            <RefreshCw size={11} /> Start over
          </button>
        </div>

        {/* Summary strip */}
        <div className="grid grid-cols-3 gap-3 mb-5">
          {[
            { label: 'Found', value: `${recurringCharges.length} charges`, color: '#93c5fd' },
            { label: 'Essential / mo', value: `$${totalMonthlyEssential.toFixed(0)}`, color: '#10b981' },
            { label: 'Total / mo', value: `$${totalMonthlyAll.toFixed(0)}`, color: '#e2e8f0' },
          ].map((s, i) => (
            <div key={i} className="rounded-xl p-3 text-center" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
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

        {/* Select all / none */}
        <div className="flex gap-3 mb-4">
          <button onClick={() => setSelectedItems(recurringCharges.map(() => true))} className="text-xs px-3 py-1.5 rounded-lg hover:opacity-80 transition" style={{ background: 'rgba(59,130,246,0.12)', color: '#93c5fd' }}>
            Select all
          </button>
          <button onClick={() => setSelectedItems(recurringCharges.map(c => c.isEssential))} className="text-xs px-3 py-1.5 rounded-lg hover:opacity-80 transition" style={{ background: 'rgba(16,185,129,0.1)', color: '#10b981' }}>
            Essential only
          </button>
          <button onClick={() => setSelectedItems(recurringCharges.map(() => false))} className="text-xs px-3 py-1.5 rounded-lg hover:opacity-80 transition" style={{ background: 'rgba(255,255,255,0.05)', color: '#64748b' }}>
            Deselect all
          </button>
        </div>

        <div className="space-y-4 mb-5 max-h-96 overflow-y-auto pr-1">
          {/* Essential */}
          {essential.length > 0 && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: '#10b981', letterSpacing: '0.1em' }}>Essential Expenses</p>
              <div className="space-y-2">
                {essential.map((c) => {
                  const globalIdx = recurringCharges.indexOf(c);
                  return <ChargeRow key={globalIdx} charge={c} selected={selectedItems[globalIdx]} onToggle={() => toggleItem(globalIdx)} />;
                })}
              </div>
            </div>
          )}
          {/* Non-essential */}
          {nonEssential.length > 0 && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: '#64748b', letterSpacing: '0.1em' }}>Other Recurring</p>
              <div className="space-y-2">
                {nonEssential.map((c) => {
                  const globalIdx = recurringCharges.indexOf(c);
                  return <ChargeRow key={globalIdx} charge={c} selected={selectedItems[globalIdx]} onToggle={() => toggleItem(globalIdx)} />;
                })}
              </div>
            </div>
          )}
        </div>

        {/* Import footer */}
        <div className="rounded-xl p-3 mb-4" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
          <div className="flex justify-between text-xs">
            <span style={{ color: '#64748b' }}>Selected essential / mo</span>
            <span className="font-bold" style={{ color: '#10b981' }}>${selectedEssentialTotal.toFixed(2)}</span>
          </div>
        </div>

        {/* What will be imported note */}
        <div className="rounded-lg p-3 mb-4 text-xs space-y-1" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
          <p style={{ color: '#6ec1e4' }}>
            <strong>🔵 All selected items</strong> → added to <strong>Recurring Expenses</strong> list (Income tab)
          </p>
          {essential.length > 0 && (
            <p style={{ color: '#10b981' }}>
              <strong>✅ Essential items only</strong> → also added to <strong>Monthly Essential Expenses</strong> total
            </p>
          )}
        </div>

        <div className="flex gap-3">
          <button onClick={handleConfirmImport} disabled={checkedCount === 0}
            className="flex-1 py-2.5 rounded-lg font-semibold text-sm text-white transition disabled:opacity-40 flex items-center justify-center gap-2"
            style={{ background: '#3b82f6' }}>
            <PlusCircle size={15} />
            Import {checkedCount} recurring expense{checkedCount !== 1 ? 's' : ''}
          </button>
          <button onClick={handleReset} className="px-4 py-2.5 rounded-lg text-sm font-medium hover:opacity-80 transition"
            style={{ background: 'rgba(255,255,255,0.05)', color: '#94a3b8' }}>
            Cancel
          </button>
        </div>
      </div>
    );
  }

  // ── Review — Debt / Income ────────────────────────────────────────────────
  if (phase === 'review' && extractedData && (extractedData.type === 'debt' || extractedData.type === 'income')) {
    const isDebt = extractedData.type === 'debt';
    const items  = extractedData.items;

    return (
      <div className="rounded-2xl p-6" style={{ background: 'rgba(26,35,50,1)' }}>
        <h2 className="font-semibold text-base mb-4 flex items-center gap-2">
          <CheckCircle size={18} style={{ color: '#10b981' }} /> Review Extracted Data
        </h2>
        <div className="space-y-3 mb-5">
          {isDebt
            ? (items as ExtractedDebt[]).map((d, i) => (
                <ReviewRow key={i} selected={selectedItems[i]} onToggle={() => toggleItem(i)}>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 mb-1">
                    <span className="font-semibold text-sm">{d.name}</span>
                    <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: 'rgba(255,255,255,0.07)', color: '#94a3b8' }}>{d.category}</span>
                  </div>
                  <div className="flex flex-wrap gap-x-5 gap-y-1 text-xs" style={{ color: '#64748b' }}>
                    <span>Balance <strong style={{ color: '#e2e8f0' }}>${d.balance.toLocaleString()}</strong></span>
                    <span>APR <strong style={{ color: '#e2e8f0' }}>{d.interestRate}%</strong></span>
                    <span>Min <strong style={{ color: '#e2e8f0' }}>${d.minimumPayment}/mo</strong></span>
                    {d.creditLimit > 0 && <span>Limit <strong style={{ color: '#e2e8f0' }}>${d.creditLimit.toLocaleString()}</strong></span>}
                  </div>
                </ReviewRow>
              ))
            : (items as ExtractedIncome[]).map((inc, i) => (
                <ReviewRow key={i} selected={selectedItems[i]} onToggle={() => toggleItem(i)}>
                  <p className="font-semibold text-sm mb-1">Take-home <span style={{ color: '#10b981' }}>${inc.monthlyTakeHome.toLocaleString()}/mo</span></p>
                  <div className="flex gap-4 text-xs" style={{ color: '#64748b' }}>
                    <span>Source <strong style={{ color: '#e2e8f0' }}>{inc.source || '—'}</strong></span>
                    <span>Frequency <strong style={{ color: '#e2e8f0' }}>{inc.frequency}</strong></span>
                  </div>
                </ReviewRow>
              ))
          }
        </div>
        <div className="flex gap-3">
          <button onClick={handleConfirmImport} disabled={checkedCount === 0}
            className="flex-1 py-2.5 rounded-lg font-semibold text-sm text-white transition disabled:opacity-40 flex items-center justify-center gap-2"
            style={{ background: '#3b82f6' }}>
            <PlusCircle size={15} />
            Import {checkedCount} {isDebt ? `debt${checkedCount !== 1 ? 's' : ''}` : 'income record'}
          </button>
          <button onClick={handleReset} className="px-4 py-2.5 rounded-lg text-sm font-medium hover:opacity-80 transition"
            style={{ background: 'rgba(255,255,255,0.05)', color: '#94a3b8' }}>
            Cancel
          </button>
        </div>
      </div>
    );
  }

  // ── Idle / Error (main upload form) ──────────────────────────────────────
  return (
    <div className="rounded-2xl p-6" style={{ background: 'rgba(26,35,50,1)' }}>
      <SectionHeader />
      <p className="text-sm opacity-60 mb-5">
        Upload one or more documents. Claude AI extracts debts, income, or recurring expenses automatically.
      </p>

      {/* Document type selector */}
      <div className="mb-4">
        <label className="text-xs opacity-60 mb-2 block">What are you uploading?</label>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          {([
            { value: 'statement', label: '🏦 Bank Statements', sub: 'Find recurring & essential expenses' },
            { value: 'debt',      label: '💳 Debt Documents',   sub: 'Credit cards, loans, statements'       },
            { value: 'income',    label: '💵 Pay Stubs',         sub: 'Income & take-home pay'                },
          ] as const).map((t) => (
            <button key={t.value} onClick={() => setDocType(t.value)}
              className="p-3 rounded-xl text-left transition"
              style={{
                background: docType === t.value ? 'rgba(59,130,246,0.15)' : 'rgba(255,255,255,0.03)',
                border: `1px solid ${docType === t.value ? 'rgba(59,130,246,0.4)' : 'rgba(255,255,255,0.08)'}`,
              }}>
              <p className="text-sm font-medium mb-0.5">{t.label}</p>
              <p className="text-xs" style={{ color: '#64748b' }}>{t.sub}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Drop zone */}
      <div
        onDragEnter={handleDrag} onDragLeave={handleDrag} onDragOver={handleDrag} onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className="border-2 border-dashed rounded-xl p-6 text-center transition cursor-pointer mb-4"
        style={{
          borderColor: dragActive ? '#3b82f6' : files.length ? 'rgba(59,130,246,0.35)' : 'rgba(255,255,255,0.1)',
          background: dragActive ? 'rgba(59,130,246,0.08)' : 'transparent',
        }}
      >
        <Upload size={28} className="mx-auto mb-2 opacity-50" />
        <p className="text-sm opacity-70 mb-1">Drop files here or <span style={{ color: '#3b82f6' }}>browse</span></p>
        <p className="text-xs opacity-40">PDF, JPG, PNG — multiple files supported</p>
        <input ref={fileInputRef} type="file" className="hidden" multiple accept=".pdf,.jpg,.jpeg,.png,.gif,.webp" onChange={handleFileInput} />
      </div>

      {/* File list */}
      {files.length > 0 && (
        <div className="space-y-2 mb-4">
          {files.map((f, i) => (
            <div key={i} className="flex items-center gap-3 rounded-lg px-3 py-2"
              style={{ background: 'rgba(59,130,246,0.07)', border: '1px solid rgba(59,130,246,0.2)' }}>
              <File size={14} style={{ color: '#3b82f6', flexShrink: 0 }} />
              <span className="text-xs flex-1 truncate" style={{ color: '#cbd5e1' }}>{f.name}</span>
              <span className="text-xs flex-shrink-0" style={{ color: '#475569' }}>{(f.size / 1024).toFixed(0)} KB</span>
              <button onClick={(e) => { e.stopPropagation(); removeFile(i); }}
                className="hover:opacity-80 transition flex-shrink-0" style={{ color: '#64748b' }}>
                <X size={14} />
              </button>
            </div>
          ))}
          <button onClick={() => fileInputRef.current?.click()}
            className="w-full py-1.5 rounded-lg text-xs font-medium hover:opacity-80 transition"
            style={{ background: 'rgba(255,255,255,0.04)', color: '#64748b', border: '1px solid rgba(255,255,255,0.07)' }}>
            + Add more files
          </button>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="p-3 rounded-lg mb-4 flex items-start gap-2 text-sm" style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', color: '#f87171' }}>
          <AlertCircle size={15} className="flex-shrink-0 mt-0.5" />
          {error}
        </div>
      )}

      {/* Analyse button */}
      <button onClick={handleUpload} disabled={!files.length || !docType}
        className="w-full py-3 rounded-xl font-semibold text-sm text-white transition disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        style={{ background: (!files.length || !docType) ? '#334155' : '#3b82f6' }}>
        <TrendingDown size={16} />
        {!docType ? 'Select a document type above' : !files.length ? 'Add at least one file' : `Analyse ${files.length} file${files.length !== 1 ? 's' : ''} with AI`}
      </button>

      {/* How it works */}
      <div className="mt-4 p-3 rounded-lg text-xs" style={{ background: 'rgba(255,255,255,0.02)' }}>
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

// ── Sub-components ────────────────────────────────────────────────────────────

function SectionHeader() {
  return (
    <h2 className="font-semibold text-base mb-1 flex items-center gap-2">
      <Upload size={18} style={{ color: '#3b82f6' }} />
      Import from Documents
    </h2>
  );
}

function Spinner() {
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

function ReviewRow({ selected, onToggle, children }: { selected: boolean; onToggle: () => void; children: React.ReactNode }) {
  return (
    <div className="rounded-xl p-4 flex gap-3 items-start"
      style={{
        background: selected ? 'rgba(59,130,246,0.07)' : 'rgba(255,255,255,0.02)',
        border: `1px solid ${selected ? 'rgba(59,130,246,0.25)' : 'rgba(255,255,255,0.06)'}`,
      }}>
      <button onClick={onToggle} className="mt-0.5 flex-shrink-0 w-5 h-5 rounded flex items-center justify-center transition"
        style={{ background: selected ? '#3b82f6' : 'rgba(255,255,255,0.08)', border: `1px solid ${selected ? '#3b82f6' : 'rgba(255,255,255,0.15)'}` }}>
        {selected && <CheckCircle size={12} style={{ color: '#fff' }} />}
      </button>
      <div className="flex-1 min-w-0">{children}</div>
    </div>
  );
}

function ChargeRow({ charge, selected, onToggle }: { charge: RecurringCharge; selected: boolean; onToggle: () => void }) {
  const conf = CONFIDENCE_STYLE[charge.confidence] ?? CONFIDENCE_STYLE.low;
  return (
    <div className="rounded-xl p-3 flex gap-3 items-start transition"
      style={{
        background: selected ? 'rgba(59,130,246,0.07)' : 'rgba(255,255,255,0.02)',
        border: `1px solid ${selected ? 'rgba(59,130,246,0.22)' : 'rgba(255,255,255,0.06)'}`,
      }}>
      <button onClick={onToggle} className="mt-0.5 flex-shrink-0 w-5 h-5 rounded flex items-center justify-center transition"
        style={{ background: selected ? '#3b82f6' : 'rgba(255,255,255,0.08)', border: `1px solid ${selected ? '#3b82f6' : 'rgba(255,255,255,0.15)'}` }}>
        {selected && <CheckCircle size={12} style={{ color: '#fff' }} />}
      </button>
      <div className="flex-1 min-w-0">
        <div className="flex flex-wrap items-center gap-2 mb-1">
          <span className="text-sm font-semibold truncate">{charge.name}</span>
          <span className="text-xs px-1.5 py-0.5 rounded-full flex-shrink-0"
            style={{ background: 'rgba(255,255,255,0.07)', color: '#94a3b8' }}>
            {CATEGORY_LABELS[charge.category] ?? charge.category}
          </span>
          <span className="text-xs px-1.5 py-0.5 rounded-full flex-shrink-0"
            style={{ background: conf.bg, color: conf.color }}>
            {conf.label}
          </span>
        </div>
        <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-xs" style={{ color: '#64748b' }}>
          <span>
            <strong style={{ color: '#e2e8f0' }}>${charge.monthlyAmount.toFixed(2)}/mo</strong>
            {charge.frequency !== 'monthly' && <span className="ml-1">(${charge.amount} {charge.frequency})</span>}
          </span>
          <span>Seen <strong style={{ color: '#e2e8f0' }}>{charge.occurrences}×</strong></span>
        </div>
      </div>
    </div>
  );
}
