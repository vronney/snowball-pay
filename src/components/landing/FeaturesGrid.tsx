function IconSnowball() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <path d="M12 2v20M2 12h20M4.93 4.93l14.14 14.14M19.07 4.93L4.93 19.07" />
    </svg>
  );
}

function IconChart() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" />
      <polyline points="16 7 22 7 22 13" />
    </svg>
  );
}

function IconBrain() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9.5 2a2.5 2.5 0 0 1 5 0c1.38 0 2.5 1.12 2.5 2.5 0 .8-.38 1.5-.96 1.96C17.26 7.1 18 8.24 18 9.5c0 1.46-.95 2.7-2.26 3.13.17.42.26.88.26 1.37 0 2.21-1.79 4-4 4s-4-1.79-4-4c0-.49.09-.95.26-1.37C6.95 12.2 6 10.96 6 9.5c0-1.26.74-2.4 1.96-3.04A2.49 2.49 0 0 1 7 4.5C7 3.12 8.12 2 9.5 2z" />
      <line x1="12" y1="18" x2="12" y2="22" />
      <line x1="8" y1="22" x2="16" y2="22" />
    </svg>
  );
}

function IconLayers() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="12 2 2 7 12 12 22 7 12 2" />
      <polyline points="2 17 12 22 22 17" />
      <polyline points="2 12 12 17 22 12" />
    </svg>
  );
}

function IconCalc() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="4" y="2" width="16" height="20" rx="2" />
      <line x1="8" y1="6" x2="16" y2="6" />
      <line x1="8" y1="10" x2="8" y2="10" />
      <line x1="12" y1="10" x2="12" y2="10" />
      <line x1="16" y1="10" x2="16" y2="10" />
      <line x1="8" y1="14" x2="8" y2="14" />
      <line x1="12" y1="14" x2="12" y2="14" />
      <line x1="16" y1="14" x2="16" y2="18" />
      <line x1="8" y1="18" x2="8" y2="18" />
      <line x1="12" y1="18" x2="12" y2="18" />
    </svg>
  );
}

const featured = [
  {
    accent: "#2563eb",
    bg: "rgba(37,99,235,0.06)",
    border: "rgba(37,99,235,0.12)",
    shadow: "rgba(37,99,235,0.12)",
    num: "01",
    Icon: IconSnowball,
    title: "Snowball Strategy",
    desc: "Target your smallest debts first. Each payoff builds real momentum - the wins accumulate fast and keep you moving toward zero.",
    detail: "Designed to keep motivation high with quick visible wins",
  },
  {
    accent: "#059669",
    bg: "rgba(5,150,105,0.06)",
    border: "rgba(5,150,105,0.12)",
    shadow: "rgba(5,150,105,0.12)",
    num: "02",
    Icon: IconChart,
    title: "Real-Time Progress",
    desc: "Watch balances shrink in real time. Animated charts and progress bars transform abstract numbers into visible, satisfying wins.",
    detail: "Visual feedback makes consistency easier",
  },
];

const compact = [
  {
    accent: "#7c3aed",
    bg: "rgba(124,58,237,0.06)",
    border: "rgba(124,58,237,0.12)",
    num: "03",
    Icon: IconBrain,
    title: "AI Recommendations",
    desc: "Personalized payoff advice with spending insights, monthly change highlights, and behavior nudges.",
  },
  {
    accent: "#0891b2",
    bg: "rgba(8,145,178,0.06)",
    border: "rgba(8,145,178,0.12)",
    num: "04",
    Icon: IconLayers,
    title: "Multi-Debt Tracking",
    desc: "Credit cards, car loans, and student debt - every balance organized in one clean dashboard.",
  },
  {
    accent: "#db2777",
    bg: "rgba(219,39,119,0.06)",
    border: "rgba(219,39,119,0.12)",
    num: "05",
    Icon: IconCalc,
    title: "Interest Calculator",
    desc: "See exactly how much interest you'll save with each extra payment you make.",
  },
];

export default function FeaturesGrid() {
  return (
    <section id="features" style={{ padding: "112px 24px", position: "relative", background: "#f8fafc" }}>
      <div style={{ maxWidth: "1120px", margin: "0 auto", position: "relative", zIndex: 1 }}>
        <div style={{ textAlign: "center", marginBottom: "72px" }}>
          <div className="lp-section-tag">
            <svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor">
              <circle cx="5" cy="5" r="5" />
            </svg>
            Everything You Need
          </div>
          <h2 style={{ fontSize: "clamp(2rem, 5vw, 3rem)", fontWeight: 900, letterSpacing: "-0.04em", color: "#0f172a", margin: "0 0 18px", lineHeight: 1.1 }}>
            Built for serious debt payoff
          </h2>
          <p style={{ fontSize: "17px", color: "#64748b", maxWidth: "480px", margin: "0 auto", lineHeight: 1.7 }}>
            Every feature is designed around one goal: helping you stay consistent and pay off debt with a clear plan.
          </p>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(340px, 1fr))", gap: "16px", marginBottom: "16px" }}>
          {featured.map((f) => (
            <div
              key={f.num}
              className="lp-card-hover"
              style={{ borderRadius: "20px", padding: "36px", cursor: "default", background: "#ffffff", border: `1px solid ${f.border}`, position: "relative", overflow: "hidden", boxShadow: `0 1px 3px ${f.shadow}` }}
            >
              <div style={{ position: "absolute", top: "-30px", right: "-30px", width: "140px", height: "140px", borderRadius: "50%", background: f.bg, filter: "blur(48px)", pointerEvents: "none" }} />

              <div style={{ display: "flex", alignItems: "center", gap: "14px", marginBottom: "24px", position: "relative" }}>
                <div className="lp-feat-icon" style={{ background: f.bg, border: `1px solid ${f.border}`, color: f.accent, boxShadow: `0 4px 16px ${f.shadow}` }}>
                  <f.Icon />
                </div>
                <div style={{ flex: 1, height: "1px", background: `linear-gradient(to right, ${f.border}, transparent)` }} />
                <span style={{ fontSize: "11px", fontWeight: 800, color: f.accent, letterSpacing: "0.06em", opacity: 0.6 }}>{f.num}</span>
              </div>

              <h3 style={{ fontSize: "20px", fontWeight: 800, color: "#0f172a", marginBottom: "12px", letterSpacing: "-0.02em", position: "relative" }}>{f.title}</h3>
              <p style={{ fontSize: "14px", lineHeight: 1.75, color: "#64748b", marginBottom: "22px", position: "relative" }}>{f.desc}</p>
              <div style={{ fontSize: "12px", color: f.accent, fontWeight: 600, padding: "7px 14px", borderRadius: "8px", background: f.bg, border: `1px solid ${f.border}`, display: "inline-block", position: "relative" }}>
                {f.detail}
              </div>
            </div>
          ))}
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(226px, 1fr))", gap: "16px" }}>
          {compact.map((f) => (
            <div key={f.num} className="lp-glass lp-card-hover" style={{ borderRadius: "16px", padding: "26px", cursor: "default", position: "relative", overflow: "hidden" }}>
              <div style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "2px", background: `linear-gradient(to right, ${f.accent}55, transparent)` }} />
              <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "16px" }}>
                <div className="lp-feat-icon" style={{ width: "40px", height: "40px", borderRadius: "11px", background: f.bg, border: `1px solid ${f.border}`, color: f.accent }}>
                  <f.Icon />
                </div>
                <span style={{ fontSize: "10px", fontWeight: 800, letterSpacing: "0.1em", color: f.accent, opacity: 0.7 }}>{f.num}</span>
              </div>
              <h3 style={{ fontSize: "15px", fontWeight: 700, color: "#0f172a", marginBottom: "8px" }}>{f.title}</h3>
              <p style={{ fontSize: "13px", lineHeight: 1.68, color: "#64748b", margin: 0 }}>{f.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

