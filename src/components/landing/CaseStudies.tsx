const scenarios = [
  {
    accent: "#2563eb",
    title: "Snowball Focus",
    summary:
      "For users who want fast early wins by clearing the smallest balances first.",
    tag: "Snowball",
    points: [
      { label: "Debt Mix", value: "Cards + auto loan" },
      { label: "Primary Move", value: "Smallest balance first" },
      { label: "Planning Cadence", value: "Monthly updates" },
    ],
  },
  {
    accent: "#7c3aed",
    title: "Avalanche Focus",
    summary:
      "For users who want to prioritize highest-rate debt to reduce interest drag.",
    tag: "Avalanche",
    points: [
      { label: "Debt Mix", value: "Student + card balances" },
      { label: "Primary Move", value: "Highest rate first" },
      { label: "Planning Cadence", value: "Monthly updates" },
    ],
  },
  {
    accent: "#059669",
    title: "Hybrid Focus",
    summary:
      "For users who switch between methods based on cash flow and motivation.",
    tag: "Hybrid",
    points: [
      { label: "Debt Mix", value: "Multiple loan types" },
      { label: "Primary Move", value: "Custom order" },
      { label: "Planning Cadence", value: "As income changes" },
    ],
  },
];

export default function CaseStudies() {
  return (
    <section
      style={{
        padding: "112px 24px",
        background: "#ffffff",
        position: "relative",
        overflow: "hidden",
      }}
    >
      <div
        style={{ maxWidth: "1120px", margin: "0 auto", position: "relative", zIndex: 1 }}
      >
        <div style={{ textAlign: "center", marginBottom: "72px" }}>
          <div
            className="lp-section-tag"
            style={{
              color: "#059669",
              background: "rgba(5,150,105,0.06)",
              borderColor: "rgba(5,150,105,0.14)",
            }}
          >
            <svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor">
              <circle cx="5" cy="5" r="5" />
            </svg>
            Planning Scenarios
          </div>
          <h2
            style={{
              fontSize: "clamp(2rem, 5vw, 3rem)",
              fontWeight: 900,
              letterSpacing: "-0.04em",
              color: "#0f172a",
              margin: "0 0 18px",
              lineHeight: 1.1,
            }}
          >
            Different debt profiles, <span className="lp-text-blue">clear next steps</span>
          </h2>
          <p
            style={{
              fontSize: "17px",
              color: "#64748b",
              maxWidth: "520px",
              margin: "0 auto",
              lineHeight: 1.7,
            }}
          >
            SnowballPay supports different payoff styles so you can pick the approach
            that matches your situation and stay consistent.
          </p>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
            gap: "20px",
          }}
        >
          {scenarios.map((scenario, i) => (
            <div
              key={i}
              className="lp-glass lp-quote-card"
              style={{ borderRadius: "20px", padding: "32px", overflow: "hidden", position: "relative" }}
            >
              <div
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  right: 0,
                  height: "3px",
                  background: `linear-gradient(to right, ${scenario.accent}, ${scenario.accent}44)`,
                }}
              />

              <div style={{ display: "flex", alignItems: "center", marginBottom: "18px" }}>
                <h3
                  style={{
                    fontSize: "18px",
                    fontWeight: 800,
                    color: "#0f172a",
                    letterSpacing: "-0.02em",
                    margin: 0,
                  }}
                >
                  {scenario.title}
                </h3>
                <div style={{ marginLeft: "auto" }}>
                  <span
                    style={{
                      fontSize: "10px",
                      fontWeight: 700,
                      padding: "4px 11px",
                      borderRadius: "999px",
                      background: `${scenario.accent}0f`,
                      border: `1px solid ${scenario.accent}22`,
                      color: scenario.accent,
                      letterSpacing: "0.04em",
                    }}
                  >
                    {scenario.tag}
                  </span>
                </div>
              </div>

              <p
                style={{
                  fontSize: "14px",
                  lineHeight: 1.75,
                  color: "#475569",
                  marginBottom: "24px",
                }}
              >
                {scenario.summary}
              </p>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(3, 1fr)",
                  borderTop: "1px solid rgba(15,23,42,0.07)",
                  paddingTop: "20px",
                }}
              >
                {scenario.points.map((point, pi) => (
                  <div
                    key={pi}
                    style={{
                      textAlign: "center",
                      padding: "0 8px",
                      borderRight:
                        pi < scenario.points.length - 1
                          ? "1px solid rgba(15,23,42,0.07)"
                          : "none",
                    }}
                  >
                    <div
                      style={{
                        fontSize: "12px",
                        fontWeight: 800,
                        color: scenario.accent,
                        letterSpacing: "-0.01em",
                        marginBottom: "6px",
                      }}
                    >
                      {point.value}
                    </div>
                    <div
                      style={{
                        fontSize: "9px",
                        color: "#94a3b8",
                        fontWeight: 700,
                        letterSpacing: "0.06em",
                        textTransform: "uppercase",
                      }}
                    >
                      {point.label}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
