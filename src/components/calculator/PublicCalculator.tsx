'use client';

import { useState, useMemo } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { type PayoffMethod, calculateDebtSnowball, calculateDebtAvalanche } from '@/lib/snowball';
import type { Debt } from '@/types';
import type { ChartEntry } from '@/components/payoff/BalanceOverTimeChart';
import DebtTable from './DebtTable';
import BudgetPanel from './BudgetPanel';
import ResultsPanel from './ResultsPanel';

const LOGIN_URL = '/auth/login?returnTo=/dashboard';

// ── Types ─────────────────────────────────────────────────────────────────────

export type DebtRow = {
  id: string;
  name: string;
  balance: string;
  rate: string;
  minimum: string;
};

// ── Helpers ───────────────────────────────────────────────────────────────────

const SEED_DEBTS: DebtRow[] = [
  { id: '1', name: 'Credit Card',  balance: '14200', rate: '24.99', minimum: '285' },
  { id: '2', name: 'Car Loan',     balance: '4800',  rate: '6.9',   minimum: '145' },
  { id: '3', name: 'Student Loan', balance: '22500', rate: '5.2',   minimum: '210' },
];

function newRow(): DebtRow {
  return { id: Date.now().toString(), name: '', balance: '', rate: '', minimum: '' };
}

function toDebt(row: DebtRow, index: number): Debt | null {
  const balance = parseFloat(row.balance);
  if (!balance || balance <= 0) return null;
  return {
    id: row.id,
    userId: '',
    name: row.name.trim() || `Debt ${index + 1}`,
    category: 'Credit Card',
    balance,
    originalBalance: balance,
    interestRate: parseFloat(row.rate) || 0,
    minimumPayment: parseFloat(row.minimum) || 0,
    creditLimit: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function PublicCalculator() {
  const [debtRows, setDebtRows] = useState<DebtRow[]>(SEED_DEBTS);
  const [takeHome, setTakeHome]   = useState('5200');
  const [essential, setEssential] = useState('2400');
  const [extra, setExtra]         = useState('200');
  const [method, setMethod]       = useState<PayoffMethod>('snowball');

  // ── Derived state ──────────────────────────────────────────────────────────

  const validDebts = useMemo(
    () => debtRows.map((r, i) => toDebt(r, i)).filter((d): d is Debt => d !== null),
    [debtRows],
  );

  const takeHomeNum      = parseFloat(takeHome)  || 0;
  const essentialNum     = parseFloat(essential) || 0;
  const totalMinPayments = validDebts.reduce((s, d) => s + d.minimumPayment, 0);
  const availableForDebt = Math.max(0, takeHomeNum - essentialNum - totalMinPayments);
  const extraNum         = Math.min(parseFloat(extra) || 0, availableForDebt);

  const planResult = useMemo(() => {
    if (validDebts.length === 0 || takeHomeNum <= 0) return null;
    const calc = method === 'avalanche' ? calculateDebtAvalanche : calculateDebtSnowball;
    const adjustedExtra = extraNum - availableForDebt;
    return calc(validDebts, takeHomeNum, essentialNum, 0, adjustedExtra);
  }, [validDebts, takeHomeNum, essentialNum, extraNum, availableForDebt, method]);

  const minimumsResult = useMemo(() => {
    if (validDebts.length === 0) return null;
    const totalMin = validDebts.reduce((s, d) => s + d.minimumPayment, 0);
    return calculateDebtSnowball(validDebts, totalMin, 0, 0, 0);
  }, [validDebts]);

  const balanceChartData = useMemo((): ChartEntry[] => {
    if (!planResult || !minimumsResult) return [];
    const projMap = new Map(planResult.monthlyBalances.map((mb) => [mb.date, mb.totalBalance]));
    const minMap  = new Map(minimumsResult.monthlyBalances.map((mb) => [mb.date, mb.totalBalance]));
    const base    = minimumsResult.months >= planResult.months
      ? minimumsResult.monthlyBalances
      : planResult.monthlyBalances;
    return base.map((mb) => ({
      date:            mb.date,
      totalBalance:    projMap.get(mb.date),
      minimumsBalance: minMap.get(mb.date),
      actualBalance:   undefined,
    }));
  }, [planResult, minimumsResult]);

  const effectiveAccel = planResult ? planResult.monthlyPayment - totalMinPayments : 0;
  const interestSaved  = planResult && minimumsResult
    ? Math.max(0, minimumsResult.totalInterestPaid - planResult.totalInterestPaid) : 0;
  const showMinimumsLine = effectiveAccel > 0;

  const years   = planResult ? Math.floor(planResult.months / 12) : 0;
  const months  = planResult ? planResult.months % 12 : 0;
  const timeStr = planResult
    ? years > 0 ? `${years}y ${months}m` : `${months}m`
    : null;

  // ── Handlers ───────────────────────────────────────────────────────────────

  const updateRow = (id: string, field: keyof DebtRow, val: string) =>
    setDebtRows((prev) => prev.map((r) => r.id === id ? { ...r, [field]: val } : r));

  const removeRow = (id: string) =>
    setDebtRows((prev) => prev.filter((r) => r.id !== id));

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen text-txt" style={{ backgroundColor: '#f5f7fa', color: '#0f172a' }}>

      {/* Nav */}
      <nav style={{ borderBottom: '1px solid rgba(15,23,42,0.07)', background: '#ffffff' }}>
        <div className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/">
            <Image src="/logo-dark.svg" alt="SnowballPay" width={148} height={28} priority />
          </Link>
          <div className="flex items-center gap-3">
            <a
              href={LOGIN_URL}
              className="hidden sm:block text-sm px-4 py-2 rounded-lg transition"
              style={{ color: '#64748b', border: '1px solid rgba(15,23,42,0.12)' }}
            >
              Sign In
            </a>
            <a
              href={LOGIN_URL}
              className="text-sm px-4 py-2 rounded-lg font-semibold transition"
              style={{ background: '#3b82f6', color: '#fff' }}
            >
              Get Started Free
            </a>
          </div>
        </div>
      </nav>

      <main className="max-w-5xl mx-auto px-6 py-10">

        {/* Hero */}
        <div className="text-center mb-10">
          <h1 className="text-3xl sm:text-4xl font-bold mb-3">
            When will you be debt-free?
          </h1>
          <p className="text-base max-w-xl mx-auto" style={{ color: '#64748b' }}>
            Enter your debts and income below. See your exact payoff date, total interest,
            and how much faster snowball beats paying minimums — free, no account needed.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">

          {/* Left: Inputs */}
          <div className="space-y-5">
            <DebtTable
              rows={debtRows}
              onRowChange={updateRow}
              onRowRemove={removeRow}
              onRowAdd={() => setDebtRows((p) => [...p, newRow()])}
            />
            <BudgetPanel
              takeHome={takeHome}
              essential={essential}
              extra={extra}
              takeHomeNum={takeHomeNum}
              essentialNum={essentialNum}
              totalMinPayments={totalMinPayments}
              availableForDebt={availableForDebt}
              extraNum={extraNum}
              onTakeHomeChange={setTakeHome}
              onEssentialChange={setEssential}
              onExtraChange={setExtra}
            />

            {/* Strategy */}
            <div className="rounded-2xl p-5" style={{ background: '#ffffff', border: '1px solid rgba(15,23,42,0.08)', boxShadow: '0 1px 4px rgba(15,23,42,0.06)' }}>
              <h2 className="font-semibold text-base mb-3">Payoff Strategy</h2>
              <div className="grid grid-cols-2 gap-2">
                {(['snowball', 'avalanche'] as const).map((m) => (
                  <button
                    key={m}
                    onClick={() => setMethod(m)}
                    className="p-3 rounded-xl text-sm font-medium transition cursor-pointer"
                    style={{
                      border: `1px solid ${method === m ? '#3b82f6' : 'rgba(15,23,42,0.08)'}`,
                      background: method === m ? 'rgba(59,130,246,0.12)' : '#f8fafc',
                      color: method === m ? '#1d4ed8' : '#334155',
                    }}
                  >
                    {m === 'snowball' ? 'Snowball' : 'Avalanche'}
                    <div className="text-xs font-normal mt-0.5" style={{ color: '#64748b' }}>
                      {m === 'snowball' ? 'Smallest balance first' : 'Highest interest first'}
                    </div>
                  </button>
                ))}
              </div>
              <p className="text-xs mt-3" style={{ color: '#64748b' }}>
                {method === 'snowball'
                  ? 'Snowball builds momentum — pay off the smallest debt first to stay motivated.'
                  : 'Avalanche minimizes total interest — attack the highest-rate debt first.'}
              </p>
            </div>
          </div>

          {/* Right: Results */}
          <ResultsPanel
            planResult={planResult}
            balanceChartData={balanceChartData}
            interestSaved={interestSaved}
            effectiveAccel={effectiveAccel}
            showMinimumsLine={showMinimumsLine}
            timeStr={timeStr}
          />
        </div>
      </main>

      {/* Footer */}
      <footer className="mt-16 pb-10 text-center text-xs" style={{ color: '#94a3b8' }}>
        <Link href="/" className="hover:opacity-60 transition mr-4" style={{ color: 'inherit' }}>Home</Link>
        <Link href="/privacy" className="hover:opacity-60 transition mr-4" style={{ color: 'inherit' }}>Privacy</Link>
        <Link href="/terms" className="hover:opacity-60 transition" style={{ color: 'inherit' }}>Terms</Link>
      </footer>
    </div>
  );
}
