'use client';

import { type PayoffMethod } from '@/lib/snowball';

interface StrategySelectorProps {
  payoffMethod: PayoffMethod;
  onMethodChange: (method: PayoffMethod) => void;
}

export default function StrategySelector({ payoffMethod, onMethodChange }: StrategySelectorProps) {
  return (
    <div className="rounded-2xl p-3" style={{ background: 'rgba(19,29,46,1)' }}>
      <div className="text-xs opacity-60 mb-2">Payoff Strategy</div>
      <div className="grid grid-cols-3 gap-2">
        {(['snowball', 'avalanche', 'custom'] as const).map((method) => {
          const selected = payoffMethod === method;
          return (
            <button
              key={method}
              type="button"
              onClick={() => onMethodChange(method)}
              className="rounded-lg px-3 py-2 text-xs font-semibold transition"
              style={{
                background: selected ? 'rgba(59,130,246,0.16)' : 'rgba(255,255,255,0.03)',
                border: selected ? '1px solid #3b82f6' : '1px solid rgba(255,255,255,0.08)',
                color: selected ? '#93c5fd' : 'rgba(255,255,255,0.8)',
              }}
            >
              {method === 'snowball' ? 'Snowball' : method === 'avalanche' ? 'Avalanche' : 'Custom'}
            </button>
          );
        })}
      </div>
    </div>
  );
}
