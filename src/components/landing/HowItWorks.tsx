const steps = [
  { num: '01', title: 'Add Your Debts',     desc: 'Enter balances, interest rates, and minimums. Takes under 2 minutes.',         color: '#3b82f6' },
  { num: '02', title: 'Pick Your Strategy', desc: 'Choose Snowball (smallest first) or Avalanche (highest rate first).',            color: '#6ec1e4' },
  { num: '03', title: 'Follow the Plan',    desc: 'Make your monthly payments. We track everything automatically.',                 color: '#8b5cf6' },
  { num: '04', title: 'Celebrate Freedom',  desc: "Watch debts disappear one by one until you're completely debt-free.",            color: '#10b981' },
];

export default function HowItWorks() {
  return (
    <section id="how-it-works" style={{ padding: '100px 24px', background: 'rgba(255,255,255,0.012)' }}>
      <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: '72px' }}>
          <p style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#6ec1e4', marginBottom: '12px' }}>Simple Process</p>
          <h2 style={{ fontSize: 'clamp(1.8rem, 4vw, 2.6rem)', fontWeight: 800, letterSpacing: '-0.03em', color: '#e2e8f0', margin: 0 }}>Go from debt to free in 4 steps</h2>
        </div>

        <div style={{ position: 'relative' }}>
          {/* Connector line */}
          <div style={{ position: 'absolute', top: '31px', left: 'calc(12.5% + 18px)', right: 'calc(12.5% + 18px)', height: '1px', background: 'linear-gradient(to right, rgba(59,130,246,0.3), rgba(16,185,129,0.3))', display: 'var(--connector-display, block)' }} />

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '32px' }}>
            {steps.map((s, i) => (
              <div key={i} style={{ textAlign: 'center', position: 'relative' }}>
                <div className="step-icon" style={{ width: '62px', height: '62px', borderRadius: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', fontWeight: 900, margin: '0 auto 20px', background: `${s.color}12`, border: `1px solid ${s.color}35`, color: s.color, position: 'relative', zIndex: 1, backdropFilter: 'blur(8px)' }}>
                  {s.num}
                </div>
                <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#e2e8f0', marginBottom: '8px' }}>{s.title}</h3>
                <p style={{ fontSize: '13px', lineHeight: 1.7, color: '#64748b', margin: 0 }}>{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
