'use client';

import { useState, useRef, useCallback } from 'react';
import {
  X,
  FileText,
  CreditCard,
  DollarSign,
  Receipt,
  Upload,
  AlertCircle,
  CheckCircle2,
  ChevronLeft,
  Loader2,
} from 'lucide-react';
import { useDocumentUpload, type DocumentFileType } from '@/lib/hooks/useDocumentUpload';
import { formatCurrency } from '@/lib/utils';

// ── Types mirroring extraction service output ─────────────────────────────────

interface ExtractedDebtItem {
  name: string;
  category: string;
  balance: number;
  interestRate: number;
  minimumPayment: number;
  creditLimit: number;
  dueDate: number | null;
  confidence: number;
}

interface ExtractedDebtResult {
  type: 'debt';
  items: ExtractedDebtItem[];
  confident: boolean;
}

interface ExtractedIncomeItem {
  monthlyTakeHome: number;
  source: string;
  frequency: string;
  confidence: number;
}

interface ExtractedIncomeResult {
  type: 'income';
  items: ExtractedIncomeItem[];
  confident: boolean;
}

interface RecurringCharge {
  name: string;
  amount: number;
  frequency: string;
  monthlyAmount: number;
  category: string;
  isEssential: boolean;
  occurrences: number;
  confidence: 'high' | 'medium' | 'low';
}

interface ExtractedStatementResult {
  type: 'statement';
  recurringCharges: RecurringCharge[];
  totalMonthlyEssential: number;
  totalMonthlyAll: number;
  analysisNotes: string;
}

type ExtractedResult = ExtractedDebtResult | ExtractedIncomeResult | ExtractedStatementResult;

// ── Props ─────────────────────────────────────────────────────────────────────

interface DocumentImportModalProps {
  onClose: () => void;
  onDebtImported: (debt: {
    name: string;
    category: string;
    balance: number;
    interestRate: number;
    minimumPayment: number;
    creditLimit?: number;
    dueDate?: number | null;
  }) => void;
  onIncomeImported: (income: { monthlyTakeHome: number }) => void;
  onExpensesImported: (expenses: { name: string; amount: number; category: string; frequency: string }[]) => void;
}

// ── Styles (matching DESIGN.md) ───────────────────────────────────────────────

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '9px 12px',
  borderRadius: '8px',
  border: '1px solid rgba(15,23,42,0.15)',
  fontSize: '14px',
  background: '#f8fafc',
  color: '#0f172a',
  outline: 'none',
  boxSizing: 'border-box',
  fontFamily: 'inherit',
};

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: '12px',
  fontWeight: 500,
  color: '#64748b',
  marginBottom: '5px',
};

// ── Step 1: Type picker ───────────────────────────────────────────────────────

type FileTypeOption = {
  id: DocumentFileType;
  label: string;
  description: string;
  icon: React.ReactNode;
};

const FILE_TYPE_OPTIONS: FileTypeOption[] = [
  {
    id: 'debt',
    label: 'Debt Statement',
    description: 'Credit card, loan, or mortgage statement — extracts balance, APR, and minimum payment.',
    icon: <CreditCard size={20} style={{ color: '#2563eb' }} />,
  },
  {
    id: 'income',
    label: 'Income Document',
    description: 'Pay stub, W2, or offer letter — extracts your monthly take-home pay.',
    icon: <DollarSign size={20} style={{ color: '#059669' }} />,
  },
  {
    id: 'statement',
    label: 'Bank Statement',
    description: 'Bank or card statement — detects recurring charges to help trim your expenses.',
    icon: <Receipt size={20} style={{ color: '#0891b2' }} />,
  },
];

function TypePicker({
  selected,
  onSelect,
}: {
  selected: DocumentFileType | null;
  onSelect: (t: DocumentFileType) => void;
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
      {FILE_TYPE_OPTIONS.map((opt) => {
        const active = selected === opt.id;
        return (
          <button
            key={opt.id}
            type="button"
            onClick={() => onSelect(opt.id)}
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: '14px',
              padding: '14px 16px',
              borderRadius: '12px',
              border: `1.5px solid ${active ? '#2563eb' : 'rgba(15,23,42,0.10)'}`,
              background: active ? '#eff6ff' : '#ffffff',
              cursor: 'pointer',
              textAlign: 'left',
              fontFamily: 'inherit',
              transition: 'border-color 0.15s, background 0.15s',
            }}
          >
            <span style={{ marginTop: '1px', flexShrink: 0 }}>{opt.icon}</span>
            <span>
              <span
                style={{
                  display: 'block',
                  fontSize: '14px',
                  fontWeight: 600,
                  color: active ? '#1d4ed8' : '#0f172a',
                  marginBottom: '3px',
                }}
              >
                {opt.label}
              </span>
              <span style={{ display: 'block', fontSize: '13px', color: '#64748b', lineHeight: 1.5 }}>
                {opt.description}
              </span>
            </span>
          </button>
        );
      })}
    </div>
  );
}

// ── Step 2: File drop zone ────────────────────────────────────────────────────

function DropZone({
  fileType,
  file,
  onFile,
  isPending,
  error,
  onUpload,
}: {
  fileType: DocumentFileType;
  file: File | null;
  onFile: (f: File) => void;
  isPending: boolean;
  error: string | null;
  onUpload: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragging(false);
      const f = e.dataTransfer.files[0];
      if (f) onFile(f);
    },
    [onFile],
  );

  const labelMap: Record<DocumentFileType, string> = {
    debt: 'debt statement',
    income: 'income document',
    statement: 'bank statement(s)',
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Disclosure notice */}
      <div
        style={{
          padding: '10px 12px',
          borderRadius: '8px',
          background: '#f8fafc',
          border: '1px solid rgba(15,23,42,0.08)',
          fontSize: '12px',
          color: '#64748b',
          lineHeight: 1.6,
        }}
      >
        Your document is processed locally for text extraction and then discarded. Only the
        extracted data (balances, amounts) is stored — never the original file.
      </div>

      {/* Drop zone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        style={{
          border: `2px dashed ${dragging ? '#2563eb' : file ? '#10b981' : 'rgba(15,23,42,0.15)'}`,
          borderRadius: '12px',
          padding: '32px 24px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '10px',
          cursor: 'pointer',
          background: dragging ? '#eff6ff' : file ? 'rgba(16,185,129,0.04)' : '#fafafa',
          transition: 'border-color 0.15s, background 0.15s',
        }}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".pdf,.jpg,.jpeg,.png"
          style={{ display: 'none' }}
          onChange={(e) => { const f = e.target.files?.[0]; if (f) onFile(f); }}
        />
        {file ? (
          <>
            <CheckCircle2 size={28} style={{ color: '#10b981' }} />
            <span style={{ fontSize: '14px', fontWeight: 600, color: '#0f172a', textAlign: 'center' }}>
              {file.name}
            </span>
            <span style={{ fontSize: '12px', color: '#64748b' }}>
              {(file.size / 1024).toFixed(0)} KB — tap to change
            </span>
          </>
        ) : (
          <>
            <Upload size={28} style={{ color: '#94a3b8' }} />
            <span style={{ fontSize: '14px', fontWeight: 600, color: '#0f172a', textAlign: 'center' }}>
              Drop your {labelMap[fileType]} here
            </span>
            <span style={{ fontSize: '12px', color: '#64748b' }}>
              PDF, JPG, or PNG · max 10 MB
            </span>
          </>
        )}
      </div>

      {error && (
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: '8px',
            padding: '10px 12px',
            borderRadius: '8px',
            background: 'rgba(239,68,68,0.06)',
            border: '1px solid rgba(239,68,68,0.2)',
          }}
        >
          <AlertCircle size={14} style={{ color: '#ef4444', marginTop: '1px', flexShrink: 0 }} />
          <span style={{ fontSize: '13px', color: '#dc2626' }}>{error}</span>
        </div>
      )}

      <button
        type="button"
        disabled={!file || isPending}
        onClick={onUpload}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '8px',
          padding: '11px 20px',
          borderRadius: '8px',
          border: 'none',
          background: !file || isPending ? 'rgba(37,99,235,0.4)' : '#2563eb',
          color: '#ffffff',
          fontSize: '14px',
          fontWeight: 600,
          cursor: !file || isPending ? 'not-allowed' : 'pointer',
          fontFamily: 'inherit',
          transition: 'background 0.15s',
        }}
      >
        {isPending ? (
          <>
            <Loader2 size={15} style={{ animation: 'spin 1s linear infinite' }} />
            Extracting…
          </>
        ) : (
          <>
            <FileText size={15} />
            Extract Data
          </>
        )}
      </button>
    </div>
  );
}

// ── Step 3: Review screens ────────────────────────────────────────────────────

function FieldRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
      <label style={labelStyle}>{label}</label>
      {value}
    </div>
  );
}

function DebtReview({
  item,
  onChange,
  onConfirm,
}: {
  item: ExtractedDebtItem;
  onChange: (updated: ExtractedDebtItem) => void;
  onConfirm: () => void;
}) {
  const conf = item.confidence;
  const confColor = conf >= 0.7 ? '#10b981' : conf >= 0.5 ? '#f59e0b' : '#ef4444';
  const confLabel = conf >= 0.7 ? 'High confidence' : conf >= 0.5 ? 'Medium confidence' : 'Low — please review carefully';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 12px', borderRadius: '8px', background: '#f8fafc', border: '1px solid rgba(15,23,42,0.08)' }}>
        <span style={{ width: 8, height: 8, borderRadius: '50%', background: confColor, display: 'inline-block', flexShrink: 0 }} />
        <span style={{ fontSize: '12px', color: '#64748b' }}>{confLabel} — edit any field before saving.</span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
        <FieldRow
          label="Account Name"
          value={
            <input style={inputStyle} value={item.name}
              onChange={(e) => onChange({ ...item, name: e.target.value })} />
          }
        />
        <FieldRow
          label="Category"
          value={
            <select style={inputStyle} value={item.category}
              onChange={(e) => onChange({ ...item, category: e.target.value })}>
              {['Credit Card','Student Loan','Auto Loan','Mortgage','Personal Loan','Medical Debt','Other'].map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          }
        />
        <FieldRow
          label="Current Balance ($)"
          value={
            <input style={inputStyle} type="number" step="0.01" min="0"
              value={item.balance || ''}
              onChange={(e) => onChange({ ...item, balance: parseFloat(e.target.value) || 0 })} />
          }
        />
        <FieldRow
          label="Interest Rate (%)"
          value={
            <input style={inputStyle} type="number" step="0.01" min="0" max="100"
              value={item.interestRate || ''}
              onChange={(e) => onChange({ ...item, interestRate: parseFloat(e.target.value) || 0 })} />
          }
        />
        <FieldRow
          label="Minimum Payment ($)"
          value={
            <input style={inputStyle} type="number" step="0.01" min="0"
              value={item.minimumPayment || ''}
              onChange={(e) => onChange({ ...item, minimumPayment: parseFloat(e.target.value) || 0 })} />
          }
        />
        <FieldRow
          label="Due Date (day of month)"
          value={
            <input style={inputStyle} type="number" min="1" max="31"
              value={item.dueDate ?? ''}
              onChange={(e) => {
                const v = parseInt(e.target.value, 10);
                onChange({ ...item, dueDate: isNaN(v) ? null : v });
              }} />
          }
        />
      </div>

      <button
        type="button"
        onClick={onConfirm}
        style={{
          padding: '11px 20px', borderRadius: '8px', border: 'none',
          background: '#2563eb', color: '#ffffff', fontSize: '14px',
          fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
        }}
      >
        Add This Debt to My Plan
      </button>
    </div>
  );
}

function IncomeReview({
  item,
  onChange,
  onConfirm,
}: {
  item: ExtractedIncomeItem;
  onChange: (updated: ExtractedIncomeItem) => void;
  onConfirm: () => void;
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <p style={{ fontSize: '13px', color: '#64748b', margin: 0 }}>
        Review the extracted take-home amount. We{"'"}ll update your income record.
      </p>
      <FieldRow
        label="Monthly Take-Home ($)"
        value={
          <input style={inputStyle} type="number" step="0.01" min="0"
            value={item.monthlyTakeHome || ''}
            onChange={(e) => onChange({ ...item, monthlyTakeHome: parseFloat(e.target.value) || 0 })} />
        }
      />
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
        <div style={{ padding: '10px 14px', borderRadius: '8px', background: '#f8fafc', border: '1px solid rgba(15,23,42,0.08)' }}>
          <span style={{ fontSize: '11px', color: '#94a3b8', display: 'block', marginBottom: '3px' }}>Source</span>
          <span style={{ fontSize: '14px', fontWeight: 600, color: '#0f172a' }}>{item.source}</span>
        </div>
        <div style={{ padding: '10px 14px', borderRadius: '8px', background: '#f8fafc', border: '1px solid rgba(15,23,42,0.08)' }}>
          <span style={{ fontSize: '11px', color: '#94a3b8', display: 'block', marginBottom: '3px' }}>Pay Frequency</span>
          <span style={{ fontSize: '14px', fontWeight: 600, color: '#0f172a', textTransform: 'capitalize' }}>{item.frequency}</span>
        </div>
      </div>
      <button
        type="button"
        onClick={onConfirm}
        style={{
          padding: '11px 20px', borderRadius: '8px', border: 'none',
          background: '#2563eb', color: '#ffffff', fontSize: '14px',
          fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
        }}
      >
        Update My Income
      </button>
    </div>
  );
}

function StatementReview({
  result,
  onConfirm,
}: {
  result: ExtractedStatementResult;
  onConfirm: (selected: RecurringCharge[]) => void;
}) {
  const [selected, setSelected] = useState<Set<number>>(
    new Set(result.recurringCharges.map((_, i) => i)),
  );

  const toggle = (i: number) =>
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(i) ? next.delete(i) : next.add(i);
      return next;
    });

  const selectedCharges = result.recurringCharges.filter((_, i) => selected.has(i));
  const totalSelected = selectedCharges.reduce((s, c) => s + c.monthlyAmount, 0);
  const confBadge = (c: RecurringCharge['confidence']) =>
    c === 'high' ? { bg: 'rgba(16,185,129,0.1)', color: '#059669' } :
    c === 'medium' ? { bg: 'rgba(245,158,11,0.1)', color: '#d97706' } :
    { bg: 'rgba(239,68,68,0.1)', color: '#dc2626' };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
      <p style={{ fontSize: '13px', color: '#64748b', margin: 0, lineHeight: 1.6 }}>
        {result.analysisNotes} Select which recurring charges to add to your expense tracker.
      </p>

      {result.recurringCharges.length === 0 ? (
        <div style={{ padding: '24px', textAlign: 'center', color: '#94a3b8', fontSize: '13px', borderRadius: '12px', border: '1px dashed rgba(15,23,42,0.12)' }}>
          No recurring charges detected. Try uploading 2–3 months of statements for better results.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '300px', overflowY: 'auto' }}>
          {result.recurringCharges.map((charge, i) => {
            const isSelected = selected.has(i);
            const badge = confBadge(charge.confidence);
            return (
              <button
                key={i}
                type="button"
                onClick={() => toggle(i)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '10px 12px',
                  borderRadius: '10px',
                  border: `1px solid ${isSelected ? 'rgba(37,99,235,0.25)' : 'rgba(15,23,42,0.08)'}`,
                  background: isSelected ? 'rgba(37,99,235,0.04)' : '#ffffff',
                  cursor: 'pointer',
                  textAlign: 'left',
                  fontFamily: 'inherit',
                  transition: 'border-color 0.15s, background 0.15s',
                }}
              >
                <span style={{
                  width: 16, height: 16, borderRadius: '4px', flexShrink: 0,
                  border: `2px solid ${isSelected ? '#2563eb' : 'rgba(15,23,42,0.2)'}`,
                  background: isSelected ? '#2563eb' : 'transparent',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  {isSelected && <CheckCircle2 size={10} color="#fff" />}
                </span>
                <span style={{ flex: 1, minWidth: 0 }}>
                  <span style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#0f172a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {charge.name}
                  </span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: '11px', color: '#64748b', textTransform: 'capitalize' }}>{charge.category}</span>
                    <span style={{ fontSize: '11px', padding: '1px 6px', borderRadius: '4px', background: badge.bg, color: badge.color, fontWeight: 500 }}>
                      {charge.confidence}
                    </span>
                  </span>
                </span>
                <span style={{ flexShrink: 0, fontSize: '13px', fontWeight: 600, color: '#0f172a', fontVariantNumeric: 'tabular-nums' }}>
                  {formatCurrency(charge.monthlyAmount)}<span style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 400 }}>/mo</span>
                </span>
              </button>
            );
          })}
        </div>
      )}

      {result.recurringCharges.length > 0 && (
        <>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 12px', borderRadius: '8px', background: '#f8fafc', border: '1px solid rgba(15,23,42,0.08)' }}>
            <span style={{ fontSize: '13px', color: '#64748b' }}>{selected.size} selected · monthly total</span>
            <span style={{ fontSize: '14px', fontWeight: 700, color: '#0f172a', fontVariantNumeric: 'tabular-nums' }}>{formatCurrency(totalSelected)}</span>
          </div>
          <button
            type="button"
            disabled={selected.size === 0}
            onClick={() => onConfirm(selectedCharges)}
            style={{
              padding: '11px 20px', borderRadius: '8px', border: 'none',
              background: selected.size === 0 ? 'rgba(37,99,235,0.4)' : '#2563eb',
              color: '#ffffff', fontSize: '14px', fontWeight: 600,
              cursor: selected.size === 0 ? 'not-allowed' : 'pointer', fontFamily: 'inherit',
            }}
          >
            Add {selected.size} Expense{selected.size !== 1 ? 's' : ''} to My Plan
          </button>
        </>
      )}
    </div>
  );
}

// ── Main modal ────────────────────────────────────────────────────────────────

type Step = 'type' | 'upload' | 'review' | 'done';

export default function DocumentImportModal({
  onClose,
  onDebtImported,
  onIncomeImported,
  onExpensesImported,
}: DocumentImportModalProps) {
  const [step, setStep] = useState<Step>('type');
  const [fileType, setFileType] = useState<DocumentFileType | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [result, setResult] = useState<ExtractedResult | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Mutable review states
  const [debtItem, setDebtItem] = useState<ExtractedDebtItem | null>(null);
  const [incomeItem, setIncomeItem] = useState<ExtractedIncomeItem | null>(null);

  const upload = useDocumentUpload();

  const handleUpload = async () => {
    if (!file || !fileType) return;
    setUploadError(null);
    try {
      const { extractedData } = await upload.mutateAsync({ file, fileType });
      const data = extractedData as ExtractedResult;
      setResult(data);
      if (data.type === 'debt' && data.items.length > 0) {
        setDebtItem(data.items[0]);
      }
      if (data.type === 'income' && data.items.length > 0) {
        setIncomeItem(data.items[0]);
      }
      setStep('review');
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
      setUploadError(msg ?? 'Something went wrong extracting your document. Please try again.');
    }
  };

  const handleDebtConfirm = () => {
    if (!debtItem) return;
    onDebtImported({
      name: debtItem.name,
      category: debtItem.category,
      balance: debtItem.balance,
      interestRate: debtItem.interestRate,
      minimumPayment: debtItem.minimumPayment,
      creditLimit: debtItem.creditLimit || undefined,
      dueDate: debtItem.dueDate,
    });
    setStep('done');
  };

  const handleIncomeConfirm = () => {
    if (!incomeItem) return;
    onIncomeImported({ monthlyTakeHome: incomeItem.monthlyTakeHome });
    setStep('done');
  };

  const handleExpensesConfirm = (charges: RecurringCharge[]) => {
    onExpensesImported(charges.map((c) => ({
      name: c.name,
      amount: c.monthlyAmount,
      category: c.category,
      frequency: 'monthly',
    })));
    setStep('done');
  };

  const canGoBack = step === 'upload' || step === 'review';

  const handleBack = () => {
    if (step === 'upload') setStep('type');
    if (step === 'review') { setStep('upload'); setResult(null); }
  };

  const stepLabel: Record<Step, string> = {
    type: 'Choose document type',
    upload: 'Upload your document',
    review: 'Review extracted data',
    done: 'Import complete',
  };

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.45)',
          zIndex: 50, backdropFilter: 'blur(2px)',
        }}
      />

      {/* Modal */}
      <div
        style={{
          position: 'fixed',
          zIndex: 51,
          // Desktop: centered
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: 'min(560px, calc(100vw - 32px))',
          maxHeight: 'min(90vh, 700px)',
          display: 'flex',
          flexDirection: 'column',
          background: '#ffffff',
          borderRadius: '16px',
          border: '1px solid rgba(15,23,42,0.08)',
          boxShadow: '0 24px 64px rgba(15,23,42,0.18)',
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '18px 20px',
          borderBottom: '1px solid rgba(15,23,42,0.08)',
          flexShrink: 0,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            {canGoBack && (
              <button
                type="button"
                onClick={handleBack}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  width: 28, height: 28, borderRadius: '8px', border: 'none',
                  background: 'rgba(15,23,42,0.06)', cursor: 'pointer', flexShrink: 0,
                }}
              >
                <ChevronLeft size={15} style={{ color: '#64748b' }} />
              </button>
            )}
            <div>
              <h2 style={{ fontSize: '15px', fontWeight: 700, color: '#0f172a', margin: 0, lineHeight: 1.3 }}>
                Import from Document
              </h2>
              <p style={{ fontSize: '12px', color: '#94a3b8', margin: '2px 0 0' }}>
                {stepLabel[step]}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              width: 28, height: 28, borderRadius: '8px', border: 'none',
              background: 'rgba(15,23,42,0.06)', cursor: 'pointer',
            }}
          >
            <X size={15} style={{ color: '#64748b' }} />
          </button>
        </div>

        {/* Body — scrollable */}
        <div style={{ padding: '20px', overflowY: 'auto', flex: 1 }}>
          {step === 'type' && (
            <>
              <TypePicker selected={fileType} onSelect={setFileType} />
              <button
                type="button"
                disabled={!fileType}
                onClick={() => setStep('upload')}
                style={{
                  marginTop: '16px', width: '100%', padding: '11px 20px',
                  borderRadius: '8px', border: 'none',
                  background: !fileType ? 'rgba(37,99,235,0.4)' : '#2563eb',
                  color: '#ffffff', fontSize: '14px', fontWeight: 600,
                  cursor: !fileType ? 'not-allowed' : 'pointer', fontFamily: 'inherit',
                }}
              >
                Continue
              </button>
            </>
          )}

          {step === 'upload' && fileType && (
            <DropZone
              fileType={fileType}
              file={file}
              onFile={setFile}
              isPending={upload.isPending}
              error={uploadError}
              onUpload={handleUpload}
            />
          )}

          {step === 'review' && result && (
            <>
              {result.type === 'debt' && debtItem && (
                <DebtReview item={debtItem} onChange={setDebtItem} onConfirm={handleDebtConfirm} />
              )}
              {result.type === 'debt' && !debtItem && (
                <div style={{ textAlign: 'center', padding: '32px', color: '#94a3b8', fontSize: '13px' }}>
                  <AlertCircle size={28} style={{ margin: '0 auto 10px', color: '#f59e0b' }} />
                  <p>No debt data could be extracted from this document. Try a different file or enter the details manually.</p>
                </div>
              )}
              {result.type === 'income' && incomeItem && (
                <IncomeReview item={incomeItem} onChange={setIncomeItem} onConfirm={handleIncomeConfirm} />
              )}
              {result.type === 'income' && !incomeItem && (
                <div style={{ textAlign: 'center', padding: '32px', color: '#94a3b8', fontSize: '13px' }}>
                  <AlertCircle size={28} style={{ margin: '0 auto 10px', color: '#f59e0b' }} />
                  <p>No income data could be extracted. Try a pay stub or W2, or enter your take-home pay manually.</p>
                </div>
              )}
              {result.type === 'statement' && (
                <StatementReview result={result} onConfirm={handleExpensesConfirm} />
              )}
            </>
          )}

          {step === 'done' && (
            <div style={{ textAlign: 'center', padding: '32px 20px' }}>
              <CheckCircle2 size={40} style={{ color: '#10b981', margin: '0 auto 14px' }} />
              <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#0f172a', marginBottom: '8px' }}>
                Import successful
              </h3>
              <p style={{ fontSize: '13px', color: '#64748b', marginBottom: '24px' }}>
                Your plan has been updated with the imported data. Review and adjust anytime.
              </p>
              <button
                type="button"
                onClick={onClose}
                style={{
                  padding: '11px 28px', borderRadius: '8px', border: 'none',
                  background: '#2563eb', color: '#ffffff', fontSize: '14px',
                  fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
                }}
              >
                Done
              </button>
            </div>
          )}
        </div>

        {/* Step indicator dots */}
        {step !== 'done' && (
          <div style={{
            display: 'flex', justifyContent: 'center', gap: '6px',
            padding: '12px', borderTop: '1px solid rgba(15,23,42,0.06)', flexShrink: 0,
          }}>
            {(['type', 'upload', 'review'] as Step[]).map((s) => (
              <span
                key={s}
                style={{
                  width: step === s ? 20 : 6, height: 6, borderRadius: '9999px',
                  background: step === s ? '#2563eb' : 'rgba(15,23,42,0.12)',
                  transition: 'width 0.2s, background 0.2s',
                }}
              />
            ))}
          </div>
        )}
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @media (max-width: 640px) {
          [data-import-modal] {
            top: auto !important;
            bottom: 0 !important;
            left: 0 !important;
            transform: none !important;
            width: 100% !important;
            max-height: 92vh !important;
            border-radius: 16px 16px 0 0 !important;
          }
        }
      `}</style>
    </>
  )
}
