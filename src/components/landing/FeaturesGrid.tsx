const features = [
  { icon: '❄️', title: 'Snowball Strategy',     desc: 'Target smallest debts first. Build momentum with every payoff. Feel the wins accumulate fast.' },
  { icon: '📊', title: 'Real-Time Progress',    desc: 'Watch your balances shrink. Charts and progress bars update live as you pay down each debt.' },
  { icon: '🤖', title: 'Smart Recommendations', desc: 'Get AI-powered payoff tips personalised to your income and goals. No guesswork needed.' },
  { icon: '💳', title: 'Multi-Debt Tracking',   desc: 'Manage credit cards, personal loans, car loans, and more — all in one unified dashboard.' },
  { icon: '📄', title: 'Document Import',       desc: 'Upload bank statements to auto-fill your debts. Get fully set up in under 60 seconds.' },
  { icon: '🧮', title: 'Savings Calculator',    desc: "See exactly how much interest you'll save vs. paying minimums. The numbers are motivating." },
];

export default function FeaturesGrid() {
  return (
    <section style={{ padding: '100px 24px' }}>
      <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: '60px' }}>
          <p style={{ fontSize: '12px', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#3b82f6', marginBottom: '12px' }}>Everything You Need</p>
          <h2 style={{ fontSize: 'clamp(1.8rem, 4vw, 2.6rem)', fontWeight: 800, letterSpacing: '-0.03em', color: '#e2e8f0', margin: 0 }}>Built for serious debt payoff</h2>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px' }}>
          {features.map((f, i) => (
            <div key={i} className="glass feat-card" style={{ borderRadius: '18px', padding: '28px', cursor: 'default' }}>
              <div style={{ fontSize: '30px', marginBottom: '16px' }}>{f.icon}</div>
              <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#e2e8f0', marginBottom: '8px' }}>{f.title}</h3>
              <p style={{ fontSize: '14px', lineHeight: 1.65, color: '#64748b', margin: 0 }}>{f.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
