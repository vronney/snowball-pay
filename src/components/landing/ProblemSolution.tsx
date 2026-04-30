const problems = [
  { text: "Juggling multiple minimum payments with no clear strategy" },
  { text: "Watching interest charges erase your hard-earned payments" },
  { text: "Not knowing which debt to tackle first - or why" },
  { text: "Feeling stuck in a cycle with no visible progress" },
];

const solutions = [
  {
    color: "#2563eb",
    text: "One clear, prioritized payoff plan built around your situation",
  },
  {
    color: "#059669",
    text: "Live progress tracking that makes every payment feel meaningful",
  },
  {
    color: "#7c3aed",
    text: "AI recommendations that adapt as your finances change",
  },
  {
    color: "#d97706",
    text: "A practical system you can follow even with multiple debts and changing budgets",
  },
];

export default function ProblemSolution() {
  return (
    <section
      style={{
        padding: "112px 24px",
        position: "relative",
        overflow: "hidden",
        background: "#ffffff",
      }}
    >
      <div
        style={{
          maxWidth: "1120px",
          margin: "0 auto",
          position: "relative",
          zIndex: 1,
        }}
      >
        <div style={{ textAlign: "center", marginBottom: "72px" }}>
          <div className="lp-section-tag">
            <svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor">
              <circle cx="5" cy="5" r="5" />
            </svg>
            The Problem &amp; Solution
          </div>
          <h2
            style={{
              fontSize: "clamp(2rem, 5vw, 3rem)",
              fontWeight: 900,
              letterSpacing: "-0.04em",
              color: "#0f172a",
              maxWidth: "560px",
              margin: "0 auto 20px",
              lineHeight: 1.1,
            }}
          >
            Debt is overwhelming.
            <br />
            <span className="lp-text-blue">We make it simple.</span>
          </h2>
          <p
            style={{
              fontSize: "17px",
              color: "#64748b",
              maxWidth: "480px",
              margin: "0 auto",
              lineHeight: 1.7,
            }}
          >
            Most people know they need to pay off debt. Very few have a system
            that actually works long-term.
          </p>
        </div>

        <div
          className="lp-ps-cols"
          style={{ display: "flex", gap: "20px", alignItems: "stretch" }}
        >
          <div style={{ flex: 1 }}>
            <div
              style={{
                borderRadius: "20px",
                padding: "36px",
                height: "100%",
                background: "#fef2f2",
                border: "1px solid rgba(239,68,68,0.22)",
                boxShadow: "0 1px 3px rgba(239,68,68,0.08)",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "12px",
                  marginBottom: "28px",
                }}
              >
                <div
                  style={{
                    width: "36px",
                    height: "36px",
                    borderRadius: "10px",
                    background: "rgba(239,68,68,0.1)",
                    border: "1px solid rgba(239,68,68,0.18)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "16px",
                    color: "#ef4444",
                    fontWeight: 700,
                  }}
                >
                  x
                </div>
                <h3
                  style={{
                    fontSize: "13px",
                    fontWeight: 800,
                    color: "#dc2626",
                    letterSpacing: "0.08em",
                    textTransform: "uppercase",
                  }}
                >
                  Without SnowballPay
                </h3>
              </div>
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "12px",
                }}
              >
                {problems.map((p, i) => (
                  <div
                    key={i}
                    style={{
                      display: "flex",
                      alignItems: "flex-start",
                      gap: "12px",
                      padding: "14px 16px",
                      borderRadius: "12px",
                      background: "rgba(239,68,68,0.08)",
                      border: "1px solid rgba(239,68,68,0.16)",
                    }}
                  >
                    <span
                      style={{
                        width: "18px",
                        height: "18px",
                        borderRadius: "50%",
                        background: "rgba(239,68,68,0.12)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: "10px",
                        color: "#dc2626",
                        flexShrink: 0,
                        marginTop: "1px",
                        fontWeight: 700,
                      }}
                    >
                      x
                    </span>
                    <p
                      style={{
                        fontSize: "14px",
                        lineHeight: 1.6,
                        color: "#64748b",
                        margin: 0,
                      }}
                    >
                      {p.text}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
              padding: "0 6px",
            }}
          >
            <div
              style={{
                width: "40px",
                height: "40px",
                borderRadius: "50%",
                background: "linear-gradient(135deg, #3b82f6, #0ea5e9)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "18px",
                color: "#fff",
                boxShadow: "0 6px 20px rgba(37,99,235,0.3)",
                flexShrink: 0,
              }}
            >
              &gt;
            </div>
          </div>

          <div style={{ flex: 1 }}>
            <div
              style={{
                borderRadius: "20px",
                padding: "36px",
                height: "100%",
                background: "#ecfdf5",
                border: "1px solid rgba(16,185,129,0.24)",
                boxShadow: "0 1px 3px rgba(16,185,129,0.09)",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "12px",
                  marginBottom: "28px",
                }}
              >
                <div
                  style={{
                    width: "36px",
                    height: "36px",
                    borderRadius: "10px",
                    background: "rgba(16,185,129,0.1)",
                    border: "1px solid rgba(16,185,129,0.2)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "16px",
                    color: "#059669",
                    fontWeight: 700,
                  }}
                >
                  +
                </div>
                <h3
                  style={{
                    fontSize: "13px",
                    fontWeight: 800,
                    color: "#059669",
                    letterSpacing: "0.08em",
                    textTransform: "uppercase",
                  }}
                >
                  With SnowballPay
                </h3>
              </div>
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "12px",
                }}
              >
                {solutions.map((s, i) => (
                  <div
                    key={i}
                    style={{
                      display: "flex",
                      alignItems: "flex-start",
                      gap: "12px",
                      padding: "14px 16px",
                      borderRadius: "12px",
                      background: "rgba(16,185,129,0.08)",
                      border: "1px solid rgba(16,185,129,0.16)",
                    }}
                  >
                    <span
                      style={{
                        width: "18px",
                        height: "18px",
                        borderRadius: "50%",
                        background: `${s.color}15`,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: "10px",
                        color: s.color,
                        flexShrink: 0,
                        marginTop: "1px",
                        fontWeight: 700,
                      }}
                    >
                      +
                    </span>
                    <p
                      style={{
                        fontSize: "14px",
                        lineHeight: 1.6,
                        color: "#475569",
                        margin: 0,
                      }}
                    >
                      {s.text}
                    </p>
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
