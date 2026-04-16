const proofCards = [
  {
    title: "Clear next action",
    detail: "Know which debt to pay next based on your selected strategy.",
    tag: "Prioritized order",
    color: "#2563eb",
    offset: "0px",
  },
  {
    title: "Visible progress",
    detail: "Track balances month by month so momentum does not fade.",
    tag: "Progress tracking",
    color: "#7c3aed",
    offset: "28px",
  },
  {
    title: "Flexible planning",
    detail: "Adjust extra payments, debt order, and timing as life changes.",
    tag: "Scenario updates",
    color: "#059669",
    offset: "14px",
  },
  {
    title: "Consistent execution",
    detail: "Turn a payoff goal into a plan you can follow every month.",
    tag: "Habit support",
    color: "#d97706",
    offset: "42px",
  },
];

export default function Testimonials() {
  return (
    <section
      id="testimonials"
      style={{
        padding: "112px 24px",
        background: "#f8fafc",
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
              color: "#d97706",
              background: "rgba(217,119,6,0.06)",
              borderColor: "rgba(217,119,6,0.14)",
            }}
          >
            <svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor">
              <circle cx="5" cy="5" r="5" />
            </svg>
            Why It Works
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
            Built for consistency, <span className="lp-text-blue">not guesswork</span>
          </h2>
          <p
            style={{
              fontSize: "17px",
              color: "#64748b",
              maxWidth: "500px",
              margin: "0 auto",
              lineHeight: 1.7,
            }}
          >
            SnowballPay focuses on clear decisions, visible progress, and flexible
            planning so you can stay on track.
          </p>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
            gap: "18px",
            alignItems: "start",
          }}
        >
          {proofCards.map((card, i) => (
            <div
              key={i}
              className="lp-glass lp-quote-card"
              style={{
                borderRadius: "20px",
                padding: "28px",
                marginTop: card.offset,
                position: "relative",
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  right: 0,
                  height: "3px",
                  background: `linear-gradient(to right, ${card.color}, ${card.color}44)`,
                }}
              />

              <span
                style={{
                  fontSize: "10px",
                  fontWeight: 700,
                  padding: "4px 11px",
                  borderRadius: "999px",
                  background: `${card.color}0e`,
                  border: `1px solid ${card.color}20`,
                  color: card.color,
                  letterSpacing: "0.04em",
                  display: "inline-block",
                  marginBottom: "14px",
                }}
              >
                {card.tag}
              </span>

              <h3
                style={{
                  fontSize: "18px",
                  fontWeight: 800,
                  color: "#0f172a",
                  letterSpacing: "-0.02em",
                  margin: "0 0 10px",
                }}
              >
                {card.title}
              </h3>

              <p
                style={{
                  fontSize: "14px",
                  lineHeight: 1.78,
                  color: "#475569",
                  margin: 0,
                }}
              >
                {card.detail}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
