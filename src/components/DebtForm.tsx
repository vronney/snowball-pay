import { useState } from 'react';
import { Plus, Check, ChevronRight, ChevronLeft } from 'lucide-react';
import { Debt } from '@/types';

interface DebtFormProps {
  onSubmit: (data: any) => void;
  onCancel: () => void;
  isLoading: boolean;
  initialData?: Partial<Debt>;
  submitLabel?: string;
}

const CATEGORIES = [
  'Credit Card',
  'Student Loan',
  'Auto Loan',
  'Mortgage',
  'Personal Loan',
  'Medical Debt',
  'Other',
];

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '9px 12px',
  borderRadius: '9px',
  border: '1px solid rgba(15,23,42,0.15)',
  fontSize: '14px',
  background: '#f8fafc',
  color: '#0f172a',
  outline: 'none',
  boxSizing: 'border-box',
};

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: '12px',
  fontWeight: 500,
  color: '#64748b',
  marginBottom: '5px',
};

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      <label style={labelStyle}>{label}</label>
      {children}
    </div>
  );
}

// Flat form used for editing an existing debt (all fields visible at once)
function FlatForm({ formData, setFormData, onSubmit, onCancel, isLoading, submitLabel, error }: {
  formData: ReturnType<typeof buildInitialState>;
  setFormData: (d: ReturnType<typeof buildInitialState>) => void;
  onSubmit: (e: React.FormEvent) => void;
  onCancel: () => void;
  isLoading: boolean;
  submitLabel?: string;
  error: string;
}) {
  return (
    <form onSubmit={onSubmit} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
      <Field label="Debt Name">
        <input style={inputStyle} type="text" placeholder="e.g. Chase Visa" value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })} required />
      </Field>
      <Field label="Category">
        <select style={inputStyle} value={formData.category}
          onChange={(e) => setFormData({ ...formData, category: e.target.value })} required>
          <option value="">Select type…</option>
          {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
      </Field>
      <Field label="Current Balance ($)">
        <input style={inputStyle} type="number" step="0.01" min="0" placeholder="5000"
          value={formData.balance} onChange={(e) => setFormData({ ...formData, balance: e.target.value })} required />
      </Field>
      <Field label="Interest Rate (%)">
        <input style={inputStyle} type="number" step="0.01" min="0" max="100" placeholder="19.99"
          value={formData.interestRate} onChange={(e) => setFormData({ ...formData, interestRate: e.target.value })} required />
      </Field>
      <Field label="Minimum Payment ($)">
        <input style={inputStyle} type="number" step="0.01" min="0" placeholder="150"
          value={formData.minimumPayment} onChange={(e) => setFormData({ ...formData, minimumPayment: e.target.value })} required />
      </Field>
      <Field label="Credit Limit (optional)">
        <input style={inputStyle} type="number" step="0.01" min="0" placeholder="10000"
          value={formData.creditLimit} onChange={(e) => setFormData({ ...formData, creditLimit: e.target.value })} />
      </Field>
      <Field label="Due Date (day of month)">
        <input style={inputStyle} type="number" min="1" max="31" placeholder="15"
          value={formData.dueDate} onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })} />
      </Field>
      <div style={{ gridColumn: '1 / -1', display: 'flex', gap: '8px', marginTop: '4px' }}>
        <button type="submit" disabled={isLoading} style={{
          flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
          padding: '10px 16px', borderRadius: '9px', border: 'none', cursor: isLoading ? 'not-allowed' : 'pointer',
          background: isLoading ? '#94a3b8' : '#2563eb', color: '#fff', fontSize: '14px', fontWeight: 600,
        }}>
          <Check size={15} />
          {isLoading ? 'Saving…' : (submitLabel ?? 'Save Changes')}
        </button>
        <button type="button" onClick={onCancel} style={{
          flex: 1, padding: '10px 16px', borderRadius: '9px', border: '1px solid rgba(15,23,42,0.1)',
          background: '#f8fafc', color: '#64748b', fontSize: '14px', fontWeight: 500, cursor: 'pointer',
        }}>Cancel</button>
      </div>
      {error && <div style={{ gridColumn: '1 / -1', color: '#ef4444', fontSize: '12px' }}>{error}</div>}
    </form>
  );
}

function buildInitialState(initialData?: Partial<Debt>) {
  return {
    name: initialData?.name ?? '',
    category: initialData?.category ?? '',
    balance: initialData?.balance != null ? String(initialData.balance) : '',
    interestRate: initialData?.interestRate != null ? String(initialData.interestRate) : '',
    minimumPayment: initialData?.minimumPayment != null ? String(initialData.minimumPayment) : '',
    creditLimit: initialData?.creditLimit ? String(initialData.creditLimit) : '',
    dueDate: initialData?.dueDate != null ? String(initialData.dueDate) : '',
  };
}

const STEPS = [
  { label: 'Debt Info', subtitle: 'Name & type' },
  { label: 'Amounts',   subtitle: 'Balance & rate' },
  { label: 'Details',   subtitle: 'Optional extras' },
] as const;

// Multi-step wizard used when adding a new debt
function WizardForm({ formData, setFormData, onSubmit, onCancel, isLoading, error }: {
  formData: ReturnType<typeof buildInitialState>;
  setFormData: (d: ReturnType<typeof buildInitialState>) => void;
  onSubmit: () => void;
  onCancel: () => void;
  isLoading: boolean;
  error: string;
}) {
  const [step, setStep] = useState(0);
  const [stepErrors, setStepErrors] = useState<string>('');

  const validateStep = () => {
    if (step === 0) {
      if (!formData.name.trim()) { setStepErrors('Debt name is required.'); return false; }
      if (!formData.category) { setStepErrors('Please select a category.'); return false; }
    }
    if (step === 1) {
      if (!formData.balance || parseFloat(formData.balance) <= 0) { setStepErrors('Enter a valid balance.'); return false; }
      if (!formData.interestRate) { setStepErrors('Enter an interest rate (0 is ok).'); return false; }
      if (!formData.minimumPayment || parseFloat(formData.minimumPayment) < 0) { setStepErrors('Enter a minimum payment.'); return false; }
    }
    setStepErrors('');
    return true;
  };

  const next = () => { if (validateStep()) setStep((s) => s + 1); };
  const back = () => { setStepErrors(''); setStep((s) => s - 1); };

  return (
    <div>
      {/* Step indicator */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0', marginBottom: '20px' }}>
        {STEPS.map((s, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', flex: i < STEPS.length - 1 ? 1 : 'none' }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px' }}>
              <div style={{
                width: '28px', height: '28px', borderRadius: '50%', display: 'flex', alignItems: 'center',
                justifyContent: 'center', fontSize: '12px', fontWeight: 700,
                background: i < step ? '#2563eb' : i === step ? '#eff6ff' : '#f1f5f9',
                color: i < step ? '#fff' : i === step ? '#2563eb' : '#94a3b8',
                border: i === step ? '2px solid #2563eb' : '2px solid transparent',
                transition: 'all 0.2s',
              }}>
                {i < step ? <Check size={13} /> : i + 1}
              </div>
              <span style={{ fontSize: '10px', fontWeight: i === step ? 600 : 400, color: i === step ? '#1e40af' : '#94a3b8', whiteSpace: 'nowrap' }}>
                {s.label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div style={{ flex: 1, height: '2px', margin: '0 6px', marginBottom: '14px', background: i < step ? '#2563eb' : '#e2e8f0', transition: 'background 0.2s' }} />
            )}
          </div>
        ))}
      </div>

      {/* Step content */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', minHeight: '120px' }}>
        {step === 0 && (
          <>
            <Field label="Debt Name *">
              <input style={inputStyle} type="text" placeholder="e.g. Chase Visa, Student Loan"
                value={formData.name} autoFocus
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); next(); } }}
              />
            </Field>
            <Field label="Category *">
              <select style={inputStyle} value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}>
                <option value="">Select debt type…</option>
                {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </Field>
          </>
        )}

        {step === 1 && (
          <>
            <Field label="Current Balance ($) *">
              <input style={inputStyle} type="number" step="0.01" min="0" placeholder="5000" autoFocus
                value={formData.balance} onChange={(e) => setFormData({ ...formData, balance: e.target.value })}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); next(); } }}
              />
            </Field>
            <Field label="Annual Interest Rate (%) *">
              <input style={inputStyle} type="number" step="0.01" min="0" max="100" placeholder="19.99"
                value={formData.interestRate} onChange={(e) => setFormData({ ...formData, interestRate: e.target.value })}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); next(); } }}
              />
            </Field>
            <Field label="Minimum Monthly Payment ($) *">
              <input style={inputStyle} type="number" step="0.01" min="0" placeholder="150"
                value={formData.minimumPayment} onChange={(e) => setFormData({ ...formData, minimumPayment: e.target.value })}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); next(); } }}
              />
            </Field>
          </>
        )}

        {step === 2 && (
          <>
            <p style={{ fontSize: '12px', color: '#64748b', margin: '0 0 4px' }}>
              These fields are optional — skip them if they don&apos;t apply.
            </p>
            <Field label="Credit Limit (Credit Cards)">
              <input style={inputStyle} type="number" step="0.01" min="0" placeholder="10000" autoFocus
                value={formData.creditLimit} onChange={(e) => setFormData({ ...formData, creditLimit: e.target.value })} />
            </Field>
            <Field label="Payment Due Date (day of month, 1–31)">
              <input style={inputStyle} type="number" min="1" max="31" placeholder="15"
                value={formData.dueDate} onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })} />
            </Field>
          </>
        )}
      </div>

      {/* Error */}
      {(stepErrors || error) && (
        <div style={{ color: '#ef4444', fontSize: '12px', marginTop: '8px' }}>{stepErrors || error}</div>
      )}

      {/* Navigation */}
      <div style={{ display: 'flex', gap: '8px', marginTop: '16px' }}>
        {step > 0 ? (
          <button type="button" onClick={back} style={{
            display: 'flex', alignItems: 'center', gap: '4px',
            padding: '9px 14px', borderRadius: '9px', border: '1px solid rgba(15,23,42,0.12)',
            background: '#f8fafc', color: '#64748b', fontSize: '13px', fontWeight: 500, cursor: 'pointer',
          }}>
            <ChevronLeft size={15} /> Back
          </button>
        ) : (
          <button type="button" onClick={onCancel} style={{
            padding: '9px 14px', borderRadius: '9px', border: '1px solid rgba(15,23,42,0.12)',
            background: '#f8fafc', color: '#64748b', fontSize: '13px', fontWeight: 500, cursor: 'pointer',
          }}>Cancel</button>
        )}

        {step < 2 ? (
          <button type="button" onClick={next} style={{
            flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
            padding: '9px 16px', borderRadius: '9px', border: 'none', cursor: 'pointer',
            background: '#2563eb', color: '#fff', fontSize: '14px', fontWeight: 600,
          }}>
            Continue <ChevronRight size={15} />
          </button>
        ) : (
          <button type="button" onClick={onSubmit} disabled={isLoading} style={{
            flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
            padding: '9px 16px', borderRadius: '9px', border: 'none', cursor: isLoading ? 'not-allowed' : 'pointer',
            background: isLoading ? '#94a3b8' : '#2563eb', color: '#fff', fontSize: '14px', fontWeight: 600,
          }}>
            <Plus size={15} />
            {isLoading ? 'Saving…' : 'Add Debt'}
          </button>
        )}
      </div>
    </div>
  );
}

export default function DebtForm({ onSubmit, onCancel, isLoading, initialData, submitLabel }: DebtFormProps) {
  const [formData, setFormData] = useState(() => buildInitialState(initialData));
  const [error, setError] = useState('');

  const handleSubmit = () => {
    setError('');
    if (!formData.name || !formData.category || !formData.balance || !formData.interestRate || !formData.minimumPayment) {
      setError('Please fill in all required fields.');
      return;
    }
    onSubmit({
      name: formData.name,
      category: formData.category,
      balance: parseFloat(formData.balance),
      interestRate: parseFloat(formData.interestRate),
      minimumPayment: parseFloat(formData.minimumPayment),
      creditLimit: formData.creditLimit ? parseFloat(formData.creditLimit) : 0,
      dueDate: formData.dueDate ? parseInt(formData.dueDate) : undefined,
    });
    if (!initialData) {
      setFormData(buildInitialState());
    }
  };

  const handleFlatSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleSubmit();
  };

  // Edit mode: flat form with all fields
  if (initialData) {
    return (
      <FlatForm
        formData={formData}
        setFormData={setFormData}
        onSubmit={handleFlatSubmit}
        onCancel={onCancel}
        isLoading={isLoading}
        submitLabel={submitLabel}
        error={error}
      />
    );
  }

  // Add mode: multi-step wizard
  return (
    <WizardForm
      formData={formData}
      setFormData={setFormData}
      onSubmit={handleSubmit}
      onCancel={onCancel}
      isLoading={isLoading}
      error={error}
    />
  );
}
