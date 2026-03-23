const problems = [
  { icon: '😰', text: 'Juggling multiple minimum payments with no clear strategy' },
  { icon: '📉', text: 'Watching interest charges erase your hard-earned payments' },
  { icon: '😤', text: 'Not knowing which debt to tackle first — or why' },
  { icon: '🔄', text: 'Feeling stuck in a cycle with no visible progress' },
];

const solutions = [
  { icon: '🎯', color: '#4f9eff', text: 'One clear, prioritized payoff plan built around your situation' },
  { icon: '📊', color: '#10b981', text: 'Live progress tracking that makes every payment feel meaningful' },
  { icon: '🧠', color: '#8b5cf6', text: 'AI recommendations that adapt as your finances change' },
  { icon: '🏆', color: '#f59e0b', text: 'A proven method used by 10,000+ people to reach debt-free' },
];

export default function ProblemSolution() {
  return (
    <section style={{ padding: '112px 24px', position: 'relative', overflow: 'hidden', background: 'rgba(255,255,255,0.015)' }}>
      <div className="lp-orb" style={{ width: '500px', height: '500px', background: 'rgba(139,92,246,0.06)', top: '50%', left: '-200px', transform: 'translateY(-50%)', animationDelay: '1s' }} />

      <div style={{ maxWidth: '1120px', margin: '0 auto', position: 'relative', zIndex: 1 }}>

        {/* Section header */}
        <div style={{ textAlign: 'center', marginBottom: '80px' }}>
          <span className="lp-text-purple" style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.16em', textTransform: 'uppercase', marginBottom: '14px', display: 'block' }}>
            The Problem &amp; Solution
          </span>
          <h2 style={{ fontSize: 'clamp(2rem, 5vw, 3rem)', fontWeight: 900, letterSpacing: '-0.04em', color: '#eef4ff', maxWidth: '560px', margin: '0 auto 20px', lineHeight: 1.1 }}>
            Debt is overwhelming.
            <br />
            <span className="lp-text-blue">We make it simple.</span>
          </h2>
          <p style={{ fontSize: '17px', color: '#7a9bbf', maxWidth: '480px', margin: '0 auto', lineHeight: 1.7 }}>
            Most people know they need to pay off debt. Very few have a system that actually works long-term.
          </p>
        </div>

        {/* Two-column layout */}
        <div className="lp-ps-cols" style={{ display: 'flex', gap: '24px', alignItems: 'stretch' }}>

          {/* Problem side */}
          <div style={{ flex: 1 }}>
            <div className="lp-glass" style={{ borderRadius: '24px', padding: '36px', height: '100%', borderColor: 'rgba(239,68,68,0.12)', background: 'rgba(239,68,68,0.025)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '32px' }}>
                <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px' }}>✕</div>
                <h3 style={{ fontSize: '15px', fontWeight: 800, color: '#f87171', letterSpacing: '0.06em', textTransform: 'uppercase' }}>Without SnowballPay</h3>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {problems.map((p, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '14px', padding: '16px 18px', borderRadius: '14px', background: 'rgba(239,68,68,0.04)', border: '1px solid rgba(239,68,68,0.08)' }}>
                    <span style={{ fontSize: '20px', flexShrink: 0, marginTop: '1px' }}>{p.icon}</span>
                    <p style={{ fontSize: '14px', lineHeight: 1.65, color: '#8ba8cc', margin: 0 }}>{p.text}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Divider arrow */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, padding: '0 8px' }}>
            <div style={{ width: '44px', height: '44px', borderRadius: '50%', background: 'linear-gradient(135deg, #4f9eff, #8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', boxShadow: '0 8px 24px rgba(79,158,255,0.3)', flexShrink: 0 }}>
              →
            </div>
          </div>

          {/* Solution side */}
          <div style={{ flex: 1 }}>
            <div className="lp-glass" style={{ borderRadius: '24px', padding: '36px', height: '100%', borderColor: 'rgba(16,185,129,0.12)', background: 'rgba(16,185,129,0.02)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '32px' }}>
                <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.22)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px' }}>✓</div>
                <h3 style={{ fontSize: '15px', fontWeight: 800, color: '#34d399', letterSpacing: '0.06em', textTransform: 'uppercase' }}>With SnowballPay</h3>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {solutions.map((s, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '14px', padding: '16px 18px', borderRadius: '14px', background: 'rgba(16,185,129,0.04)', border: '1px solid rgba(16,185,129,0.09)' }}>
                    <span style={{ fontSize: '20px', flexShrink: 0, marginTop: '1px' }}>{s.icon}</span>
                    <p style={{ fontSize: '14px', lineHeight: 1.65, color: '#8ba8cc', margin: 0 }}>{s.text}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
