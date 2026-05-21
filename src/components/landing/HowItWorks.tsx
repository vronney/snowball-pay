type StepPreview = "debts" | "plan" | "progress";

const steps: Array<{
  num: string;
  color: string;
  title: string;
  desc: string;
  preview: StepPreview;
}> = [
  {
    num: "01",
    color: "#2563eb",
    title: "Add Your Debts",
    desc: "Enter balances, rates, and minimum payments manually or from statement details. Your setup stays simple and private.",
    preview: "debts",
  },
  {
    num: "02",
    color: "#0891b2",
    title: "Get Your Plan",
    desc: "Compare Snowball and Avalanche, choose a payoff order, and see the monthly path behind your debt-free date.",
    preview: "plan",
  },
  {
    num: "03",
    color: "#0f9f6e",
    title: "Track Progress",
    desc: "Log payments, watch balances move, and keep momentum visible as each debt gets closer to zero.",
    preview: "progress",
  },
];

function MiniBrowserChrome() {
  return (
    <div
      style={{
        height: "30px",
        borderBottom: "1px solid rgba(15,23,42,0.08)",
        display: "flex",
        alignItems: "center",
        gap: "6px",
        padding: "0 12px",
        background: "rgba(248,250,252,0.86)",
      }}
    >
      {["#ef4444", "#f59e0b", "#10b981"].map((color) => (
        <span
          key={color}
          style={{
            width: "7px",
            height: "7px",
            borderRadius: "999px",
            background: color,
            opacity: 0.72,
          }}
        />
      ))}
      <span
        style={{
          marginLeft: "auto",
          width: "46%",
          height: "8px",
          borderRadius: "999px",
          background: "rgba(15,23,42,0.06)",
        }}
      />
    </div>
  );
}

function DebtSetupPreview() {
  const rows = [
    ["Credit Card", "$3,200", "24.9%", "$95"],
    ["Auto Loan", "$8,100", "7.2%", "$310"],
    ["Student Loan", "$7,120", "5.8%", "$180"],
  ];

  return (
    <div style={{ padding: "16px", display: "grid", gap: "12px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "12px" }}>
        <div>
          <p style={{ margin: "0 0 4px", fontSize: "10px", color: "#667085", fontWeight: 900, letterSpacing: "0.14em", textTransform: "uppercase" }}>
            Debt setup
          </p>
          <p style={{ margin: 0, fontSize: "17px", color: "#0b1220", fontWeight: 900, letterSpacing: "-0.03em" }}>
            3 debts added
          </p>
        </div>
        <span
          style={{
            padding: "7px 10px",
            borderRadius: "999px",
            background: "rgba(37,99,235,0.08)",
            color: "#1d4ed8",
            fontSize: "11px",
            fontWeight: 900,
          }}
        >
          Manual entry
        </span>
      </div>

      <div style={{ display: "grid", gap: "8px" }}>
        {rows.map(([name, balance, rate, minimum]) => (
          <div
            key={name}
            style={{
              display: "grid",
              gridTemplateColumns: "1fr auto",
              gap: "8px",
              padding: "11px 12px",
              borderRadius: "16px",
              background: "#ffffff",
              border: "1px solid rgba(15,23,42,0.08)",
              boxShadow: "inset 0 1px 0 rgba(255,255,255,0.86)",
            }}
          >
            <div>
              <p style={{ margin: 0, fontSize: "12px", color: "#172033", fontWeight: 900 }}>{name}</p>
              <p style={{ margin: "3px 0 0", fontSize: "10px", color: "#667085" }}>
                APR {rate} · minimum {minimum}
              </p>
            </div>
            <p style={{ margin: 0, fontSize: "12px", color: "#0b1220", fontWeight: 900, fontVariantNumeric: "tabular-nums" }}>
              {balance}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

function PlanPreview() {
  return (
    <div style={{ padding: "16px", display: "grid", gap: "13px" }}>
      <div
        style={{
          padding: "14px",
          borderRadius: "18px",
          background: "#0b1220",
          color: "#ffffff",
          boxShadow: "0 18px 40px rgba(15,23,42,0.18)",
        }}
      >
        <p style={{ margin: "0 0 6px", fontSize: "10px", color: "rgba(255,255,255,0.62)", fontWeight: 900, letterSpacing: "0.14em", textTransform: "uppercase" }}>
          Debt-free date
        </p>
        <p style={{ margin: 0, fontSize: "25px", fontWeight: 900, letterSpacing: "-0.04em" }}>Mar 2027</p>
        <p style={{ margin: "6px 0 0", fontSize: "11px", color: "rgba(255,255,255,0.68)" }}>
          using Snowball with $340 monthly target
        </p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "9px" }}>
        {[
          ["Snowball", "Fast wins", "#2563eb"],
          ["Avalanche", "Lower interest", "#0891b2"],
        ].map(([label, helper, color], index) => (
          <div
            key={label}
            style={{
              padding: "11px",
              borderRadius: "15px",
              background: index === 0 ? "rgba(37,99,235,0.08)" : "#ffffff",
              border: `1px solid ${index === 0 ? "rgba(37,99,235,0.18)" : "rgba(15,23,42,0.08)"}`,
            }}
          >
            <p style={{ margin: 0, fontSize: "12px", color, fontWeight: 900 }}>{label}</p>
            <p style={{ margin: "4px 0 0", fontSize: "10px", color: "#667085" }}>{helper}</p>
          </div>
        ))}
      </div>

      <div style={{ display: "grid", gap: "8px" }}>
        {[
          ["1", "Credit Card", "focus first"],
          ["2", "Auto Loan", "next"],
          ["3", "Student Loan", "final"],
        ].map(([num, label, status]) => (
          <div key={label} style={{ display: "flex", alignItems: "center", gap: "9px" }}>
            <span
              style={{
                width: "22px",
                height: "22px",
                borderRadius: "999px",
                background: "rgba(8,145,178,0.10)",
                color: "#0891b2",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "10px",
                fontWeight: 900,
              }}
            >
              {num}
            </span>
            <span style={{ fontSize: "12px", color: "#172033", fontWeight: 800 }}>{label}</span>
            <span style={{ marginLeft: "auto", fontSize: "10px", color: "#667085" }}>{status}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function ProgressPreview() {
  const bars = [
    ["Credit Card", 72, "#2563eb"],
    ["Auto Loan", 43, "#0891b2"],
    ["Student Loan", 24, "#0f9f6e"],
  ] as const;

  return (
    <div style={{ padding: "16px", display: "grid", gap: "13px" }}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr auto", alignItems: "center", gap: "12px" }}>
        <div>
          <p style={{ margin: "0 0 4px", fontSize: "10px", color: "#667085", fontWeight: 900, letterSpacing: "0.14em", textTransform: "uppercase" }}>
            Monthly progress
          </p>
          <p style={{ margin: 0, fontSize: "18px", color: "#0b1220", fontWeight: 900, letterSpacing: "-0.03em" }}>
            $1,420 paid down
          </p>
        </div>
        <span
          style={{
            width: "44px",
            height: "44px",
            borderRadius: "16px",
            background: "rgba(15,159,110,0.10)",
            color: "#0f9f6e",
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "18px",
            fontWeight: 900,
          }}
        >
          ✓
        </span>
      </div>

      <div
        style={{
          padding: "14px",
          borderRadius: "18px",
          background: "#ffffff",
          border: "1px solid rgba(15,23,42,0.08)",
        }}
      >
        <svg viewBox="0 0 280 78" style={{ display: "block", width: "100%", height: "78px" }} aria-hidden="true">
          <path d="M0,16 C42,16 76,24 112,36 C158,51 205,63 280,68" fill="none" stroke="#2563eb" strokeWidth="2" strokeLinecap="round" />
          <path d="M0,16 C42,16 76,24 112,36 C158,51 205,63 280,68 L280,78 L0,78 Z" fill="rgba(37,99,235,0.08)" />
          <circle cx="112" cy="36" r="4" fill="#2563eb" />
          <circle cx="280" cy="68" r="4" fill="#0f9f6e" />
        </svg>
      </div>

      <div style={{ display: "grid", gap: "8px" }}>
        {bars.map(([label, pct, color]) => (
          <div key={label}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "5px", fontSize: "10px", color: "#667085", fontWeight: 800 }}>
              <span>{label}</span>
              <span>{pct}%</span>
            </div>
            <div style={{ height: "6px", borderRadius: "999px", background: "rgba(15,23,42,0.07)", overflow: "hidden" }}>
              <div style={{ width: `${pct}%`, height: "100%", borderRadius: "999px", background: color }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ProductPreview({ kind }: { kind: StepPreview }) {
  return (
    <div
      className="lp-bezel"
      style={{
        marginTop: "24px",
        padding: "7px",
        boxShadow: "0 22px 60px rgba(15,23,42,0.10)",
      }}
    >
      <div
        className="lp-core"
        style={{
          overflow: "hidden",
          minHeight: "298px",
          background:
            "linear-gradient(180deg, rgba(255,255,255,0.98), rgba(248,251,255,0.94))",
        }}
      >
        <MiniBrowserChrome />
        {kind === "debts" && <DebtSetupPreview />}
        {kind === "plan" && <PlanPreview />}
        {kind === "progress" && <ProgressPreview />}
      </div>
    </div>
  );
}

export default function HowItWorks() {
  return (
    <section
      id="how-it-works"
      style={{
        padding: "128px 24px",
        position: "relative",
        overflow: "hidden",
        background: "#f4f7fb",
      }}
    >
      <div style={{ maxWidth: "1120px", margin: "0 auto", position: "relative", zIndex: 1 }}>
        <div style={{ maxWidth: "640px", margin: "0 auto 76px", textAlign: "center" }}>
          <div className="lp-section-tag" style={{ display: "inline-flex" }}>
            <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#0891b2" }} />
            Simple process
          </div>
          <h2
            style={{
              fontSize: "clamp(2.15rem, 5vw, 3.35rem)",
              fontWeight: 900,
              letterSpacing: "-0.04em",
              color: "#0b1220",
              margin: "0 0 18px",
              lineHeight: 1.04,
            }}
          >
            See the plan take shape before you commit.
          </h2>
          <p style={{ fontSize: "17px", color: "#536078", maxWidth: "520px", margin: "0 auto", lineHeight: 1.72 }}>
            A visual walkthrough helps new users understand what they enter, what SnowballPay calculates, and what they track after the first plan is built.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-7 items-start">
          {steps.map((step) => (
            <article key={step.num} style={{ position: "relative" }}>
              <div className="lp-bezel lp-card-hover" style={{ height: "100%" }}>
                <div className="lp-core" style={{ padding: "28px", height: "100%" }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "16px", marginBottom: "22px" }}>
                    <span
                      style={{
                        width: "48px",
                        height: "48px",
                        borderRadius: "17px",
                        background: "rgba(15,23,42,0.035)",
                        border: "1px solid rgba(15,23,42,0.08)",
                        color: step.color,
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: "15px",
                        fontWeight: 900,
                      }}
                    >
                      {step.num}
                    </span>
                    <span style={{ width: "38px", height: "2px", borderRadius: "999px", background: step.color, opacity: 0.45 }} />
                  </div>

                  <h3 style={{ fontSize: "20px", fontWeight: 900, color: "#0b1220", margin: "0 0 10px", letterSpacing: "-0.03em" }}>
                    {step.title}
                  </h3>
                  <p style={{ fontSize: "14px", lineHeight: 1.72, color: "#536078", margin: 0 }}>
                    {step.desc}
                  </p>

                  <ProductPreview kind={step.preview} />
                </div>
              </div>
            </article>
          ))}
        </div>

        <div
          className="lp-bezel"
          style={{
            marginTop: "72px",
          }}
        >
          <div
            className="lp-core"
            style={{
              padding: "28px 34px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              flexWrap: "wrap",
              gap: "20px",
            }}
          >
            <div>
              <p style={{ fontSize: "18px", fontWeight: 900, color: "#0b1220", margin: "0 0 5px", letterSpacing: "-0.02em" }}>
                Ready to see your personalized plan?
              </p>
              <p style={{ fontSize: "13px", color: "#667085", margin: 0 }}>
                Start with the free calculator or save a plan in your dashboard.
              </p>
            </div>
            <a
              href="/auth/login?returnTo=/dashboard"
              className="lp-btn lp-btn-primary lp-btn-with-icon"
              style={{ fontSize: "15px", padding: "12px 10px 12px 24px", flexShrink: 0 }}
            >
              Build My Plan
              <span className="lp-btn-arrow" aria-hidden="true">
                <span>{">"}</span>
              </span>
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
