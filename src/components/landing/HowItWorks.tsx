const steps = [
  { num: '01', title: 'Add Your Debts',     desc: 'Enter balances, interest rates, and minimums. Takes under 2 minutes.',           color: '#3b82f6' },
  { num: '02', title: 'Pick Your Strategy', desc: 'Choose Snowball (smallest first) or Avalanche (highest rate first).',              color: '#6ec1e4' },
  { num: '03', title: 'Follow the Plan',    desc: 'Make your monthly payments. We track everything automatically.',                   color: '#8b5cf6' },
  { num: '04', title: 'Celebrate Freedom',  desc: "Watch debts disappear one by one until you're completely debt-free.",              color: '#10b981' },
];

export default function HowItWorks() {
  return (
    <section id="how-it-works" style={{ padding: '100px 24px', background: 'rgba(255,255,255,0.015)' }}>
      <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: '64px' }}>
          <p style={{ fontSize: '12px', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#6ec1e4', marginBottom: '12px' }}>Simple Process</p>
          <h2 style={{ fontSize: 'clamp(1.8rem, 4vw, 2.6rem)', fontWeight: 800, letterSpacing: '-0.03em', color: '#e2e8f0', margin: 0 }}>Go from debt to free in 4 steps</h2>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '32px' }}>
          {steps.map((s, i) => (
            <div key={i} style={{ textAlign: 'center', position: 'relative' }}>
              <div className="step-icon" style={{ width: '64px', height: '64px', borderRadius: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', fontWeight: 900, margin: '0 auto 18px', background: `${s.color}18`, border: `1px solid ${s.color}40`, color: s.color }}>
                {s.num}
              </div>
              <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#e2e8f0', marginBottom: '8px' }}>{s.title}</h3>
              <p style={{ fontSize: '13px', lineHeight: 1.65, color: '#64748b', margin: 0 }}>{s.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
