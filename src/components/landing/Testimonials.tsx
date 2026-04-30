const testimonials = [
  {
    quote:
      "This finally helped me visualize my student loans without feeling overwhelmed.",
    name: "Maya R.",
    context: "Beta user - student loans",
    tag: "Clarity",
    color: "#2563eb",
  },
  {
    quote:
      "Seeing my debt-free date update each month gave me the push to stay consistent.",
    name: "Jordan K.",
    context: "Beta user - mixed debt",
    tag: "Momentum",
    color: "#0891b2",
  },
  {
    quote:
      "I changed my payment amount after a job switch and my whole plan adjusted instantly.",
    name: "Nina S.",
    context: "Beta user - life change",
    tag: "Flexibility",
    color: "#059669",
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
        style={{
          maxWidth: "1120px",
          margin: "0 auto",
          position: "relative",
          zIndex: 1,
        }}
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
            Early Social Proof
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
            Real feedback from <span className="lp-text-blue">beta users</span>
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
            People using SnowballPay report more clarity, less stress, and
            stronger follow-through month to month.
          </p>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
            gap: "18px",
            alignItems: "start",
          }}
        >
          {testimonials.map((card, i) => (
            <div
              key={i}
              className="lp-glass lp-quote-card"
              style={{
                borderRadius: "20px",
                padding: "28px",
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

              <p
                style={{
                  fontSize: "15px",
                  lineHeight: 1.75,
                  color: "#334155",
                  margin: "0 0 18px",
                }}
              >
                &ldquo;{card.quote}&rdquo;
              </p>

              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: "10px",
                }}
              >
                <span
                  style={{
                    fontSize: "13px",
                    fontWeight: 700,
                    color: "#0f172a",
                  }}
                >
                  {card.name}
                </span>
                <span
                  style={{
                    fontSize: "11px",
                    color: "#64748b",
                    fontWeight: 600,
                  }}
                >
                  {card.context}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
