"use client";

import { track, Events } from "@/lib/analytics";

const FILES = {
  xlsx: "/downloads/snowballpay-debt-payoff-plan-template.xlsx",
  csv: "/downloads/snowballpay-debt-payoff-plan-template.csv",
} as const;

// Published Notion template (duplicate-as-template enabled).
const NOTION_TEMPLATE_URL =
  "https://flat-tower-0cf.notion.site/Debt-Payoff-Plan-Free-Template-070fc8324df88322aa6101f67e29848a?source=copy_link";

type TemplateFormat = keyof typeof FILES | "notion";

/**
 * The actual downloadable template promised by /learn/debt-payoff-plan-template.
 * No email gate — friction-free download is the reciprocity play; the
 * calculator CTA below the fold is the "want this automated?" upgrade path.
 */
export default function TemplateDownload({ source }: { source: string }) {
  const handleDownload = (format: TemplateFormat) => {
    track(Events.TEMPLATE_DOWNLOADED, { format, source });
  };

  return (
    <div
      style={{
        borderRadius: "16px",
        padding: "32px",
        background: "#ffffff",
        border: "1px solid rgba(37,99,235,0.25)",
        boxShadow: "0 4px 24px rgba(15,23,42,0.06)",
        maxWidth: "640px",
        margin: "0 auto",
        textAlign: "center",
      }}
    >
      <p
        style={{
          fontSize: "12px",
          fontWeight: 800,
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          color: "#1d4ed8",
          marginBottom: "10px",
        }}
      >
        Free download — no email required
      </p>
      <h2
        style={{
          fontSize: "22px",
          fontWeight: 900,
          letterSpacing: "-0.03em",
          color: "#0f172a",
          marginBottom: "10px",
        }}
      >
        Get the Debt Payoff Plan Template
      </h2>
      <p
        style={{
          fontSize: "14px",
          color: "#64748b",
          lineHeight: 1.65,
          marginBottom: "22px",
        }}
      >
        Three tabs: your debt list with totals, a payoff-order guide, and a
        24-month check-in tracker. Works in Excel, Google Sheets, and Numbers —
        or duplicate the Notion version with progress tracking and charts built
        in.
      </p>
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          gap: "12px",
          flexWrap: "wrap",
        }}
      >
        <a
          href={FILES.xlsx}
          download
          onClick={() => handleDownload("xlsx")}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "8px",
            padding: "13px 26px",
            borderRadius: "8px",
            background: "#2563eb",
            color: "#ffffff",
            fontSize: "14px",
            fontWeight: 700,
            textDecoration: "none",
          }}
        >
          Download for Excel / Sheets
        </a>
        <a
          href={NOTION_TEMPLATE_URL}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => handleDownload("notion")}
          style={{
            display: "inline-flex",
            alignItems: "center",
            padding: "13px 22px",
            borderRadius: "8px",
            background: "#ffffff",
            border: "1px solid rgba(15,23,42,0.16)",
            color: "#334155",
            fontSize: "14px",
            fontWeight: 700,
            textDecoration: "none",
          }}
        >
          Notion template
        </a>
        <a
          href={FILES.csv}
          download
          onClick={() => handleDownload("csv")}
          style={{
            display: "inline-flex",
            alignItems: "center",
            padding: "13px 22px",
            borderRadius: "8px",
            background: "#ffffff",
            border: "1px solid rgba(15,23,42,0.16)",
            color: "#334155",
            fontSize: "14px",
            fontWeight: 700,
            textDecoration: "none",
          }}
        >
          CSV version
        </a>
      </div>
      <p
        style={{
          fontSize: "12px",
          color: "#94a3b8",
          marginTop: "16px",
          margin: "16px 0 0",
        }}
      >
        Tip: in Google Sheets, use File → Import → Upload to open the Excel
        file.
      </p>
    </div>
  );
}
