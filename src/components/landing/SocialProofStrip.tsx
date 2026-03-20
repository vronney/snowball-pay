const stats = [
  { value: '10,000+', label: 'Active Users' },
  { value: '$14,200', label: 'Avg. Interest Saved' },
  { value: '3.2 yrs',  label: 'Avg. Time to Debt-Free' },
];

export default function SocialProofStrip() {
  return (
    <div style={{ background: 'rgba(255,255,255,0.02)', borderTop: '1px solid rgba(255,255,255,0.055)', borderBottom: '1px solid rgba(255,255,255,0.055)' }}>
      <div style={{ maxWidth: '760px', margin: '0 auto', padding: '40px 24px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0' }}>
        {stats.map((s, i) => (
          <>
            <div key={s.label} style={{ flex: 1, textAlign: 'center', padding: '0 24px' }}>
              <div className="text-gradient" style={{ fontSize: 'clamp(1.5rem, 4vw, 2rem)', fontWeight: 800, letterSpacing: '-0.03em', marginBottom: '4px' }}>{s.value}</div>
              <div style={{ fontSize: '12px', color: '#64748b', letterSpacing: '0.02em' }}>{s.label}</div>
            </div>
            {i < stats.length - 1 && (
              <div key={`rule-${i}`} className="stat-rule" />
            )}
          </>
        ))}
      </div>
    </div>
  );
}
