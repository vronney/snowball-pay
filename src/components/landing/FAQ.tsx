"use client";

import { useState } from "react";

const supportComposeUrl =
  "https://mail.google.com/mail/?view=cm&fs=1&to=support@getsnowballpay.com&su=SnowballPay%20Support";

const faqs = [
  {
    q: "What is the Debt Snowball method?",
    a: "The Debt Snowball method pays off your smallest debt first while you keep minimum payments on the rest. Once one balance is gone, you roll that payment into the next debt to build momentum.",
  },
  {
    q: "How is Snowball different from the Avalanche method?",
    a: "Avalanche prioritizes the highest interest rate first to minimize total interest paid. Snowball prioritizes the smallest balance first for faster early wins. SnowballPay supports both approaches.",
  },
  {
    q: "How does the document import feature work?",
    a: "You can upload a PDF statement or CSV export. SnowballPay reads balances, rates, and minimum payments so you can build your plan faster.",
  },
  {
    q: "Is my financial data secure?",
    a: "SnowballPay applies safeguards to protect your account data and limit unauthorized access. Review the Privacy Policy for the latest details.",
  },
  {
    q: "Does SnowballPay connect to my bank accounts?",
    a: "No. SnowballPay does not require a bank connection. You can add debts manually or import statement files.",
  },
  {
    q: "What types of debt can I track?",
    a: "You can track credit cards, personal loans, auto loans, student loans, medical debt, and more. Each debt includes fields for balance, rate, and minimum payment.",
  },
  {
    q: "Can I change my payoff strategy after I start?",
    a: "Yes. You can switch between Snowball and Avalanche or define a custom order. Your projected timeline updates automatically.",
  },
];

export default function FAQ() {
  const [open, setOpen] = useState<number | null>(0);

  return (
    <section
      id="faq"
      style={{
        padding: "112px 24px",
        position: "relative",
        overflow: "hidden",
        background: "#ffffff",
      }}
    >
      <div
        style={{
          maxWidth: "760px",
          margin: "0 auto",
          position: "relative",
          zIndex: 1,
        }}
      >
        <div style={{ textAlign: "center", marginBottom: "68px" }}>
          <div
            className="lp-section-tag"
            style={{
              color: "#7c3aed",
              background: "rgba(124,58,237,0.06)",
              borderColor: "rgba(124,58,237,0.14)",
            }}
          >
            <svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor">
              <circle cx="5" cy="5" r="5" />
            </svg>
            FAQ
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
            Questions and answers
          </h2>
          <p
            style={{
              fontSize: "17px",
              color: "#64748b",
              maxWidth: "420px",
              margin: "0 auto",
              lineHeight: 1.7,
            }}
          >
            Everything you need to know before you start your debt payoff plan.
          </p>
        </div>

        <div>
          {faqs.map((f, i) => (
            <div key={i} className="lp-faq-row">
              <button
                className="lp-faq-trigger"
                onClick={() => setOpen(open === i ? null : i)}
                aria-expanded={open === i}
              >
                <span>{f.q}</span>
                <span
                  style={{
                    width: "28px",
                    height: "28px",
                    borderRadius: "8px",
                    flexShrink: 0,
                    background:
                      open === i
                        ? "rgba(37,99,235,0.08)"
                        : "rgba(15,23,42,0.04)",
                    border: `1px solid ${
                      open === i ? "rgba(37,99,235,0.25)" : "rgba(15,23,42,0.1)"
                    }`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "16px",
                    color: open === i ? "#2563eb" : "#94a3b8",
                    transition:
                      "background 0.2s, border-color 0.2s, color 0.2s, transform 0.25s",
                    transform: open === i ? "rotate(45deg)" : "rotate(0deg)",
                  }}
                >
                  +
                </span>
              </button>
              {open === i && (
                <p
                  style={{
                    fontSize: "15px",
                    lineHeight: 1.78,
                    color: "#64748b",
                    paddingBottom: "26px",
                    margin: 0,
                  }}
                >
                  {f.a}
                </p>
              )}
            </div>
          ))}
        </div>

        <p
          style={{
            textAlign: "center",
            fontSize: "14px",
            color: "#94a3b8",
            marginTop: "48px",
          }}
        >
          Still have questions?{" "}
          <a
            href={supportComposeUrl}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              color: "#2563eb",
              textDecoration: "none",
              fontWeight: 600,
            }}
          >
            Email our team -&gt;
          </a>
        </p>
      </div>
    </section>
  );
}
