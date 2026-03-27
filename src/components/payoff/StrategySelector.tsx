import { type PayoffMethod } from '@/lib/snowball';

interface StrategySelectorProps {
  payoffMethod: PayoffMethod;
  onMethodChange: (method: PayoffMethod) => void;
}

export default function StrategySelector({ payoffMethod, onMethodChange }: StrategySelectorProps) {
  return (
    <div className="rounded-2xl p-3" style={{ background: 'rgb(255, 255, 255)', border: '1px solid rgba(15, 23, 42, 0.08)', boxShadow: 'rgba(15, 23, 42, 0.06) 0px 1px 4px' }}>
      <h2 className="font-semibold text-base mb-2" style={{ color: '#334155' }}>Payoff Strategy</h2>
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
                background: selected ? 'rgba(59,130,246,0.14)' : '#f8fafc',
                border: selected ? '1px solid #3b82f6' : '1px solid rgba(15,23,42,0.08)',
                color: selected ? '#1d4ed8' : '#334155',
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
