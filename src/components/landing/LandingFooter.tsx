import Image from "next/image";

const footerLinks = {
  Product: [
    { label: "Features", href: "/#features" },
    { label: "How It Works", href: "/#how-it-works" },
    { label: "Pricing", href: "/#pricing" },
    { label: "Calculator", href: "/calculator" },
    { label: "FAQ", href: "/#faq" },
  ],
  Company: [
    { label: "Privacy Policy", href: "/privacy" },
    { label: "Terms of Service", href: "/terms" },
    { label: "Contact", href: "mailto:support@getsnowballpay.com" },
  ],
  Resources: [
    { label: "Snowball vs Avalanche", href: "/learn" },
    { label: "Debt Snowball Guide", href: "/#how-it-works" },
    { label: "Interest Calculator", href: "/auth/login?returnTo=/dashboard" },
    { label: "Payoff Planner", href: "/auth/login?returnTo=/dashboard" },
  ],
};

export default function LandingFooter() {
  return (
    <footer
      style={{
        borderTop: "1px solid rgba(15,23,42,0.08)",
        backgroundColor: "#f1f5f9",
      }}
    >
      <div
        style={{
          maxWidth: "1160px",
          margin: "0 auto",
          padding: "64px 24px 40px",
        }}
      >
        <div
          className="lp-ftr-grid"
          style={{
            display: "grid",
            gridTemplateColumns: "2fr 1fr 1fr 1fr",
            gap: "48px",
            marginBottom: "56px",
          }}
        >
          <div>
            <a
              href="/"
              style={{
                display: "inline-block",
                marginBottom: "18px",
                textDecoration: "none",
              }}
            >
              <Image src="/logo-dark.svg" alt="SnowballPay" width={152} height={29} />
            </a>
            <p
              style={{
                fontSize: "14px",
                lineHeight: 1.7,
                color: "#64748b",
                maxWidth: "280px",
                marginBottom: "24px",
              }}
            >
              A debt payoff planner that turns overwhelming balances into a clear,
              motivating path.
            </p>
          </div>

          {Object.entries(footerLinks).map(([heading, links]) => (
            <div key={heading}>
              <p
                style={{
                  fontSize: "11px",
                  fontWeight: 800,
                  letterSpacing: "0.14em",
                  color: "#0f172a",
                  textTransform: "uppercase",
                  marginBottom: "20px",
                }}
              >
                {heading}
              </p>
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "11px",
                }}
              >
                {links.map((l) => (
                  <a key={l.label} href={l.href} className="lp-ftr-link">
                    {l.label}
                  </a>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div
          style={{
            height: "1px",
            background: "rgba(15,23,42,0.08)",
            marginBottom: "28px",
          }}
        />

        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: "12px",
          }}
        >
          <p style={{ fontSize: "13px", color: "#94a3b8" }}>
            (c) {new Date().getFullYear()} SnowballPay. All rights reserved.
          </p>
          <div style={{ display: "flex", gap: "16px", alignItems: "center" }}>
            <span style={{ fontSize: "11px", color: "#64748b", fontWeight: 600 }}>
              No bank connection required
            </span>
            <span style={{ fontSize: "11px", color: "#64748b", fontWeight: 600 }}>
              Cancel anytime
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}
