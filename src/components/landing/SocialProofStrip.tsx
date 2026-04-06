const stats = [
  { value: '10,000+', label: 'Active Users',             sub: 'and growing daily',          color: '#2563eb' },
  { value: '$14,200', label: 'Avg. Interest Saved',       sub: 'per user lifetime',           color: '#059669' },
  { value: '3.2 yrs', label: 'Avg. Time to Debt-Free',   sub: 'vs. 8.4 yrs minimums only',  color: '#7c3aed' },
  { value: '97%',     label: 'User Satisfaction',         sub: 'from post-payoff surveys',    color: '#d97706' },
];

const BRANDS = [
  'Forbes', 'TechCrunch', 'Product Hunt', 'Hacker News',
  'Business Insider', 'The Motley Fool', 'NerdWallet', 'Lifehacker',
  'Forbes', 'TechCrunch', 'Product Hunt', 'Hacker News',
  'Business Insider', 'The Motley Fool', 'NerdWallet', 'Lifehacker',
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
            As seen in
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
