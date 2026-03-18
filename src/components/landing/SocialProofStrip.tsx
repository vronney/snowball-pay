const stats = [
  { value: '10,000+', label: 'Active Users',           icon: '👥' },
  { value: '$14,200', label: 'Avg. Interest Saved',    icon: '💰' },
  { value: '3.2 yrs', label: 'Avg. Time to Debt-Free', icon: '🎯' },
];

export default function SocialProofStrip() {
  return (
    <div style={{ background: 'rgba(255,255,255,0.025)', borderTop: '1px solid rgba(255,255,255,0.06)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
      <div style={{ maxWidth: '800px', margin: '0 auto', padding: '36px 24px', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '24px', textAlign: 'center' }}>
        {stats.map((s, i) => (
          <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
            <span style={{ fontSize: '24px', marginBottom: '4px' }}>{s.icon}</span>
            <span className="text-gradient" style={{ fontSize: '28px', fontWeight: 800, letterSpacing: '-0.03em' }}>{s.value}</span>
            <span style={{ fontSize: '13px', color: '#64748b' }}>{s.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
