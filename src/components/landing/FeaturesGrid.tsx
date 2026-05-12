function IconTarget() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="8.5" stroke="currentColor" strokeWidth="1.35" />
      <circle cx="12" cy="12" r="3.5" stroke="currentColor" strokeWidth="1.35" />
      <path d="M12 3.5v2.2M20.5 12h-2.2M12 18.3v2.2M5.7 12H3.5" stroke="currentColor" strokeWidth="1.35" strokeLinecap="round" />
    </svg>
  );
}

function IconTrajectory() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M4 17.5c4.2-.2 6.8-1.5 8.4-3.8 1.1-1.6 1.7-3.4 4.2-4.2 1.1-.4 2.3-.5 3.4-.4" stroke="currentColor" strokeWidth="1.35" strokeLinecap="round" />
      <path d="M17.2 6.4 20 9.1l-3.2 2.2" stroke="currentColor" strokeWidth="1.35" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M4 20h16" stroke="currentColor" strokeWidth="1.35" strokeLinecap="round" opacity="0.4" />
    </svg>
  );
}

function IconGuardrail() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M12 3.4 19 6v5.2c0 4.2-2.8 7.7-7 9.4-4.2-1.7-7-5.2-7-9.4V6l7-2.6Z" stroke="currentColor" strokeWidth="1.35" strokeLinejoin="round" />
      <path d="M8.3 12.1 10.8 14.6 15.9 9.4" stroke="currentColor" strokeWidth="1.35" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function IconScenario() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M5 6.5h6M5 12h14M13 17.5h6" stroke="currentColor" strokeWidth="1.35" strokeLinecap="round" />
      <circle cx="15.5" cy="6.5" r="2.25" stroke="currentColor" strokeWidth="1.35" />
      <circle cx="8.5" cy="17.5" r="2.25" stroke="currentColor" strokeWidth="1.35" />
    </svg>
  );
}

const primaryFeatures = [
  {
    eyebrow: "01",
    title: "Payoff order that makes the next move obvious",
    desc: "Compare Snowball, Avalanche, and your own custom order, then follow the one that best fits your motivation, interest cost, and cash flow.",
    detail: "Strategy comparison with a clear focus debt",
    accent: "#2563eb",
    Icon: IconTarget,
  },
  {
    eyebrow: "02",
    title: "A month-by-month path instead of a static calculator result",
    desc: "Track remaining balances, payoff dates, and progress milestones as your numbers change. SnowballPay recalculates the plan around the real month you are in.",
    detail: "Progress views, milestones, and timeline updates",
    accent: "#0f9f6e",
    Icon: IconTrajectory,
  },
];

const supportFeatures = [
  {
    title: "Cash-flow guardrails",
    desc: "See how much room you have after minimums, essentials, and acceleration so the plan stays realistic.",
    accent: "#0891b2",
    Icon: IconGuardrail,
  },
  {
    title: "What-if simulations",
    desc: "Test an extra payment, a strategy switch, or a custom priority queue before changing the plan.",
    accent: "#d97706",
    Icon: IconScenario,
  },
  {
    title: "Planner intelligence",
    desc: "Use guidance, risk flags, and monthly change summaries when you need help staying consistent.",
    accent: "#7c3aed",
    Icon: IconTarget,
  },
];

export default function FeaturesGrid() {
  return (
    <section
      id="features"
      style={{
        padding: "128px 24px",
        position: "relative",
        background: "#eef3f8",
      }}
    >
      <div style={{ maxWidth: "1120px", margin: "0 auto", position: "relative", zIndex: 1 }}>
        <div style={{ maxWidth: "680px", marginBottom: "64px" }}>
          <div className="lp-section-tag">
            <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#2563eb" }} />
            Planner system
          </div>
          <h2
            style={{
              fontSize: "clamp(2.15rem, 5vw, 3.45rem)",
              fontWeight: 900,
              letterSpacing: "-0.04em",
              color: "#0b1220",
              margin: "0 0 18px",
              lineHeight: 1.04,
            }}
          >
            Built around the decision people avoid every month.
          </h2>
          <p style={{ fontSize: "17px", color: "#536078", maxWidth: "560px", lineHeight: 1.72, margin: 0 }}>
            SnowballPay keeps the plan specific: what to pay first, how much progress you made, and when your current path reaches zero.
          </p>
        </div>

        <div className="lp-feature-bento">
          <div className="lp-feature-stack">
            {primaryFeatures.map((feature) => (
              <div key={feature.eyebrow} className="lp-bezel lp-card-hover">
                <div className="lp-core" style={{ minHeight: "260px", padding: "34px", display: "flex", flexDirection: "column" }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "18px", marginBottom: "34px" }}>
                    <div
                      style={{
                        width: "54px",
                        height: "54px",
                        borderRadius: "18px",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: feature.accent,
                        background: "rgba(15,23,42,0.035)",
                        border: "1px solid rgba(15,23,42,0.08)",
                      }}
                    >
                      <feature.Icon />
                    </div>
                    <span style={{ color: feature.accent, fontSize: "11px", fontWeight: 900, letterSpacing: "0.16em" }}>
                      {feature.eyebrow}
                    </span>
                  </div>
                  <h3 style={{ fontSize: "25px", fontWeight: 900, letterSpacing: "-0.035em", color: "#0b1220", margin: "0 0 14px", lineHeight: 1.12 }}>
                    {feature.title}
                  </h3>
                  <p style={{ fontSize: "14.5px", lineHeight: 1.78, color: "#536078", margin: "0 0 26px" }}>
                    {feature.desc}
                  </p>
                  <div style={{ marginTop: "auto", color: feature.accent, fontSize: "12px", fontWeight: 800 }}>
                    {feature.detail}
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="lp-feature-stack">
            {supportFeatures.map((feature, index) => (
              <div key={feature.title} className="lp-bezel lp-card-hover" style={{ transform: index === 1 ? "translateY(14px)" : undefined }}>
                <div className="lp-core" style={{ padding: "26px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "14px", marginBottom: "18px" }}>
                    <div
                      style={{
                        width: "44px",
                        height: "44px",
                        borderRadius: "15px",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: feature.accent,
                        background: "rgba(15,23,42,0.035)",
                        border: "1px solid rgba(15,23,42,0.08)",
                      }}
                    >
                      <feature.Icon />
                    </div>
                    <h3 style={{ fontSize: "16px", fontWeight: 900, color: "#0b1220", letterSpacing: "-0.02em", margin: 0 }}>
                      {feature.title}
                    </h3>
                  </div>
                  <p style={{ fontSize: "13.5px", lineHeight: 1.72, color: "#536078", margin: 0 }}>
                    {feature.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
