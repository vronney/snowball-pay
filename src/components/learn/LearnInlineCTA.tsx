import Link from "next/link";

interface LearnInlineCTAProps {
  /** Headline — override per article for relevance */
  headline?: string;
  /** Body copy */
  body?: string;
  isLoggedIn?: boolean;
}

/**
 * Mid-article conversion nudge for /learn pages.
 * Appears after the first major content section, while the reader is engaged.
 * Links to /calculator (no account required) as primary action.
 */
export default function LearnInlineCTA({
  headline = "See what this looks like for your debts",
  body = "Run the free calculator — enter your balances and see your debt-free date in under 2 minutes. No account required.",
  isLoggedIn = false,
}: LearnInlineCTAProps) {
  return (
    <aside
      style={{
        margin: "0 auto",
        maxWidth: "720px",
        padding: "0 24px",
      }}
    >
      <div
        style={{
          borderRadius: "16px",
          padding: "28px 32px",
          background: "#eff6ff",
          border: "1px solid #bfdbfe",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "24px",
          flexWrap: "wrap",
        }}
      >
        <div style={{ flex: "1 1 280px" }}>
          <p
            style={{
              fontSize: "16px",
              fontWeight: 800,
              color: "#0f172a",
              letterSpacing: "-0.02em",
              marginBottom: "6px",
            }}
          >
            {headline}
          </p>
          <p
            style={{
              fontSize: "14px",
              color: "#475569",
              lineHeight: 1.6,
              margin: 0,
            }}
          >
            {body}
          </p>
        </div>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "8px",
            alignItems: "flex-start",
            flexShrink: 0,
          }}
        >
          <Link
            href="/calculator"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              padding: "11px 22px",
              borderRadius: "8px",
              background: "#2563eb",
              color: "#ffffff",
              fontSize: "14px",
              fontWeight: 700,
              textDecoration: "none",
              whiteSpace: "nowrap",
            }}
          >
            Try the Calculator →
          </Link>
          {!isLoggedIn && (
            <p
              style={{
                fontSize: "11px",
                color: "#64748b",
                margin: 0,
                paddingLeft: "2px",
              }}
            >
              Free account — no card needed
            </p>
          )}
        </div>
      </div>
    </aside>
  );
}
