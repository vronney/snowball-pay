const stats = [
  { value: 'Clear Plan',     label: 'Prioritized Payoff Order', sub: 'know what to pay next',            color: '#2563eb' },
  { value: 'Built to Adapt', label: 'Scenario Modeling',        sub: 'adjust when life changes',         color: '#059669' },
  { value: 'Month by Month', label: 'Timeline Visibility',       sub: 'see your projected debt-free date', color: '#7c3aed' },
  { value: 'Stay Consistent', label: 'Progress Tracking',        sub: 'watch balances move every payment', color: '#d97706' },
];

const BRANDS = [
  'Debt Snowball Strategy', 'Debt Avalanche Comparison', 'Credit Card Payoff Plans', 'Personal Loan Planning',
  'Monthly Payment Calendar', 'Interest Impact Visibility', 'Progress Milestones', 'Debt-Free Date Forecast',
  'Debt Snowball Strategy', 'Debt Avalanche Comparison', 'Credit Card Payoff Plans', 'Personal Loan Planning',
  'Monthly Payment Calendar', 'Interest Impact Visibility', 'Progress Milestones', 'Debt-Free Date Forecast',
];

export default function SocialProofStrip() {
  return (
    <div>
      {/* Scrolling ticker */}
      <div style={{ borderTop: '1px solid rgba(15,23,42,0.07)', borderBottom: '1px solid rgba(15,23,42,0.07)', overflow: 'hidden', padding: '18px 0', background: '#ffffff', position: 'relative' }}>
        <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: '120px', background: 'linear-gradient(to right, #fff, transparent)', zIndex: 2, pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: '120px', background: 'linear-gradient(to left, #fff, transparent)', zIndex: 2, pointerEvents: 'none' }} />

        <div style={{ display: 'flex', alignItems: 'center', paddingLeft: '140px' }}>
          <div style={{ flexShrink: 0, paddingRight: '48px', fontSize: '9px', fontWeight: 800, letterSpacing: '0.16em', color: '#cbd5e1', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>
            What you get
          </div>
          <div style={{ overflow: 'hidden', flex: 1 }}>
            <div className="lp-ticker">
              {BRANDS.map((b, i) => (
                <span key={i} style={{ fontSize: '12px', fontWeight: 700, color: '#94a3b8', letterSpacing: '0.05em' }}>{b}</span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Stats bar */}
      <div style={{ background: '#f8fafc', borderBottom: '1px solid rgba(15,23,42,0.07)' }}>
        <div className="lp-stat-wrap" style={{ maxWidth: '1000px', margin: '0 auto', padding: '52px 24px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexWrap: 'wrap' }}>
          {stats.map((s, i) => (
            <div key={s.label} style={{ display: 'flex', alignItems: 'center' }}>
              <div style={{ textAlign: 'center', padding: '0 44px' }}>
                <div style={{
                  fontSize: 'clamp(1.8rem, 4.5vw, 2.4rem)',
                  fontWeight: 900,
                  letterSpacing: '-0.04em',
                  marginBottom: '5px',
                  color: s.color,
                  fontVariantNumeric: 'tabular-nums',
                }}>
                  {s.value}
                </div>
                <div style={{ fontSize: '12px', color: '#475569', letterSpacing: '0.02em', fontWeight: 600, marginBottom: '3px' }}>{s.label}</div>
                <div style={{ fontSize: '10px', color: '#94a3b8', fontWeight: 500 }}>{s.sub}</div>
              </div>
              {i < stats.length - 1 && (
                <div className="lp-stat-divider" style={{ width: '1px', height: '60px', background: 'linear-gradient(to bottom, transparent, rgba(15,23,42,0.1), transparent)', flexShrink: 0 }} />
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
