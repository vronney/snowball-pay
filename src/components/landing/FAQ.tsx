"use client";

import { useState } from "react";

const supportHref = "/contact";

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
  const [openIndex, setOpenIndex] = useState(0);

  return (
    <section id="faq" className="lp-faq-section">
      <div className="lp-faq-wrap">
        <div className="lp-faq-header">
          <div className="lp-section-tag lp-section-tag-faq">
            <svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor">
              <circle cx="5" cy="5" r="5" />
            </svg>
            FAQ
          </div>
          <h2 className="lp-faq-title">
            Questions, answered with
            <br />
            practical clarity
          </h2>
          <p className="lp-faq-subtitle">
            Everything you need to know before you start your debt payoff plan.
          </p>
        </div>

        <div className="lp-faq-shell">
          <div className="lp-faq-core">
            {faqs.map((item, index) => (
              <details
                key={item.q}
                className="lp-faq-item"
                open={openIndex === index}
              >
                <summary
                  className="lp-faq-trigger"
                  onClick={(event) => {
                    event.preventDefault();
                    setOpenIndex((current) => (current === index ? -1 : index));
                  }}
                >
                  <span className="lp-faq-question">{item.q}</span>
                  <span className="lp-faq-plus-wrap" aria-hidden="true">
                    <span className="lp-faq-plus">+</span>
                  </span>
                </summary>
                <div className="lp-faq-answer">
                  <p>{item.a}</p>
                </div>
              </details>
            ))}
          </div>
        </div>

        <p className="lp-faq-support">
          Still have questions?{" "}
          <a href={supportHref}>
            Contact support {"->"}
          </a>
        </p>
      </div>
    </section>
  );
}
