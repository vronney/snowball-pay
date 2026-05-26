/**
 * /ads/assets
 *
 * Internal export page for Google Ads image assets.
 * Preview and download all required sizes and variants.
 * No auth required — this is an internal marketing tool.
 */

import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Google Ads Image Assets — SnowballPay",
  robots: { index: false, follow: false },
};

const BASE = "/api/og/google-ads";

const SIZES = [
  {
    id: "landscape",
    label: "Landscape",
    dims: "1200 × 628",
    ratio: "1.91:1",
    usage: "Display · Discovery · YouTube · Performance Max",
    w: 1200,
    h: 628,
    previewScale: 0.42,
    logoOnly: false,
  },
  {
    id: "square",
    label: "Square",
    dims: "1200 × 1200",
    ratio: "1:1",
    usage: "Display · Discovery · Demand Gen · Performance Max",
    w: 1200,
    h: 1200,
    previewScale: 0.25,
    logoOnly: false,
  },
  {
    id: "portrait",
    label: "Portrait",
    dims: "960 × 1200",
    ratio: "4:5",
    usage: "Discovery · Demand Gen · Performance Max",
    w: 960,
    h: 1200,
    previewScale: 0.25,
    logoOnly: false,
  },
  {
    id: "logo-square",
    label: "Logo — Square",
    dims: "1200 × 1200",
    ratio: "1:1",
    usage: "Logo asset (all campaign types)",
    w: 1200,
    h: 1200,
    previewScale: 0.2,
    logoOnly: true,
  },
  {
    id: "logo-landscape",
    label: "Logo — Landscape",
    dims: "1200 × 300",
    ratio: "4:1",
    usage: "Logo asset (all campaign types)",
    w: 1200,
    h: 300,
    previewScale: 0.42,
    logoOnly: true,
  },
] as const;

const VARIANTS = [
  {
    id: "awareness",
    label: "Awareness",
    desc: "Top-of-funnel — brand + debt-free date positioning",
    color: "#2563eb",
  },
  {
    id: "intent",
    label: "Intent / Calculator",
    desc: "Mid-funnel — free calculator, high-intent keywords",
    color: "#0891b2",
  },
  {
    id: "retargeting",
    label: "Retargeting",
    desc: "Onboarding drop-off — finish your plan messaging",
    color: "#7c3aed",
  },
] as const;

type SizeId = (typeof SIZES)[number]["id"];
type VariantId = (typeof VARIANTS)[number]["id"];

function assetUrl(size: SizeId, variant?: VariantId) {
  const params = new URLSearchParams({ size });
  if (variant) params.set("variant", variant);
  return `${BASE}?${params.toString()}`;
}

export default function AdsAssetsPage() {
  return (
    <div
      style={{
        minHeight: "100vh",
        backgroundColor: "#0f172a",
        color: "#f1f5f9",
        fontFamily: "system-ui, sans-serif",
        padding: "48px 32px",
      }}
    >
      {/* Header */}
      <div style={{ maxWidth: "1280px", margin: "0 auto" }}>
        <div style={{ marginBottom: "48px" }}>
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "8px",
              fontSize: "11px",
              fontWeight: 700,
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              color: "#60a5fa",
              background: "rgba(37,99,235,0.15)",
              border: "1px solid rgba(37,99,235,0.3)",
              borderRadius: "6px",
              padding: "4px 12px",
              marginBottom: "16px",
            }}
          >
            Internal · Not indexed
          </div>
          <h1
            style={{
              fontSize: "36px",
              fontWeight: 900,
              letterSpacing: "-0.03em",
              marginBottom: "12px",
            }}
          >
            Google Ads Image Assets
          </h1>
          <p style={{ fontSize: "16px", color: "#94a3b8", maxWidth: "600px", lineHeight: 1.6 }}>
            All 5 required Google Ads sizes × 3 ad variants. Right-click any image to save,
            or use the download button beneath each one.
          </p>
        </div>

        {/* Policy note */}
        <div
          style={{
            marginBottom: "48px",
            padding: "16px 20px",
            borderRadius: "12px",
            background: "rgba(220,38,38,0.08)",
            border: "1px solid rgba(220,38,38,0.2)",
          }}
        >
          <p style={{ fontSize: "13px", color: "#fca5a5", fontWeight: 600, marginBottom: "4px" }}>
            ⚠️ Google Ads Targeting Policy Reminder
          </p>
          <p style={{ fontSize: "13px", color: "#94a3b8", lineHeight: 1.6 }}>
            This product falls under the &quot;negative financial status&quot; sensitive interest category.
            Use <strong style={{ color: "#f1f5f9" }}>predefined Google audiences only</strong> — In-market,
            Affinity, Demographics, Life Events. Remove all Customer Match,
            Your Data segments, lookalikes, and audience expansion from campaigns
            that use these assets.
          </p>
        </div>

        {/* Logo assets */}
        <section style={{ marginBottom: "64px" }}>
          <h2
            style={{
              fontSize: "20px",
              fontWeight: 800,
              marginBottom: "24px",
              paddingBottom: "12px",
              borderBottom: "1px solid rgba(255,255,255,0.08)",
            }}
          >
            Logo Assets
          </h2>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "24px" }}>
            {SIZES.filter((s) => s.logoOnly).map((size) => {
              const url = assetUrl(size.id as SizeId);
              const pw = Math.round(size.w * size.previewScale);
              const ph = Math.round(size.h * size.previewScale);
              return (
                <div
                  key={size.id}
                  style={{
                    background: "rgba(255,255,255,0.04)",
                    border: "1px solid rgba(255,255,255,0.1)",
                    borderRadius: "16px",
                    padding: "24px",
                    display: "flex",
                    flexDirection: "column",
                    gap: "16px",
                  }}
                >
                  <div>
                    <div style={{ fontSize: "15px", fontWeight: 700, marginBottom: "4px" }}>
                      {size.label}
                    </div>
                    <div style={{ fontSize: "12px", color: "#64748b" }}>
                      {size.dims} · {size.ratio} · {size.usage}
                    </div>
                  </div>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={url}
                    alt={`${size.label} logo`}
                    width={pw}
                    height={ph}
                    style={{ borderRadius: "8px", border: "1px solid rgba(255,255,255,0.08)" }}
                  />
                  <a
                    href={url}
                    download={`snowballpay-${size.id}.png`}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "6px",
                      fontSize: "13px",
                      fontWeight: 600,
                      color: "#60a5fa",
                      background: "rgba(37,99,235,0.12)",
                      border: "1px solid rgba(37,99,235,0.25)",
                      borderRadius: "8px",
                      padding: "8px 16px",
                      textDecoration: "none",
                    }}
                  >
                    ↓ Download {size.dims}
                  </a>
                </div>
              );
            })}
          </div>
        </section>

        {/* Ad image assets by variant */}
        {VARIANTS.map((variant) => (
          <section key={variant.id} style={{ marginBottom: "72px" }}>
            <div style={{ marginBottom: "28px" }}>
              <h2
                style={{
                  fontSize: "22px",
                  fontWeight: 800,
                  marginBottom: "6px",
                }}
              >
                <span
                  style={{
                    display: "inline-block",
                    width: "10px",
                    height: "10px",
                    borderRadius: "50%",
                    background: variant.color,
                    marginRight: "10px",
                    verticalAlign: "middle",
                  }}
                />
                {variant.label}
              </h2>
              <p style={{ fontSize: "14px", color: "#64748b" }}>{variant.desc}</p>
            </div>

            <div style={{ display: "flex", flexWrap: "wrap", gap: "24px" }}>
              {SIZES.filter((s) => !s.logoOnly).map((size) => {
                const url = assetUrl(size.id as SizeId, variant.id as VariantId);
                const pw = Math.round(size.w * size.previewScale);
                const ph = Math.round(size.h * size.previewScale);
                return (
                  <div
                    key={size.id}
                    style={{
                      background: "rgba(255,255,255,0.04)",
                      border: "1px solid rgba(255,255,255,0.08)",
                      borderRadius: "16px",
                      padding: "20px",
                      display: "flex",
                      flexDirection: "column",
                      gap: "14px",
                    }}
                  >
                    <div>
                      <div style={{ fontSize: "14px", fontWeight: 700, marginBottom: "2px" }}>
                        {size.label}
                      </div>
                      <div style={{ fontSize: "11px", color: "#475569" }}>
                        {size.dims} · {size.ratio}
                      </div>
                      <div style={{ fontSize: "11px", color: "#475569", marginTop: "2px" }}>
                        {size.usage}
                      </div>
                    </div>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={url}
                      alt={`${size.label} — ${variant.label}`}
                      width={pw}
                      height={ph}
                      style={{
                        borderRadius: "8px",
                        border: "1px solid rgba(255,255,255,0.08)",
                        display: "block",
                      }}
                    />
                    <a
                      href={url}
                      download={`snowballpay-${variant.id}-${size.id}.png`}
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: "6px",
                        fontSize: "12px",
                        fontWeight: 600,
                        color: "#60a5fa",
                        background: "rgba(37,99,235,0.1)",
                        border: "1px solid rgba(37,99,235,0.2)",
                        borderRadius: "8px",
                        padding: "7px 14px",
                        textDecoration: "none",
                      }}
                    >
                      ↓ Download {size.dims}
                    </a>
                  </div>
                );
              })}
            </div>
          </section>
        ))}

        {/* Usage guide */}
        <section
          style={{
            background: "rgba(255,255,255,0.03)",
            border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: "16px",
            padding: "32px",
            marginBottom: "48px",
          }}
        >
          <h2 style={{ fontSize: "18px", fontWeight: 800, marginBottom: "20px" }}>
            Which asset goes where
          </h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "16px" }}>
            {[
              {
                campaign: "Performance Max",
                assets: "All 3 sizes (landscape + square + portrait) + both logos. All 3 variants.",
              },
              {
                campaign: "Display campaigns",
                assets: "Landscape + square. Use awareness for cold audiences, intent for keyword-matched placements.",
              },
              {
                campaign: "Discovery / Demand Gen",
                assets: "Landscape + square + portrait. Awareness for new audiences, retargeting for drop-off.",
              },
              {
                campaign: "YouTube (companion banner)",
                assets: "Landscape 1200×628 only.",
              },
            ].map((row) => (
              <div key={row.campaign} style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                <div style={{ fontSize: "13px", fontWeight: 700, color: "#60a5fa" }}>
                  {row.campaign}
                </div>
                <div style={{ fontSize: "13px", color: "#94a3b8", lineHeight: 1.5 }}>
                  {row.assets}
                </div>
              </div>
            ))}
          </div>
        </section>

        <p style={{ fontSize: "12px", color: "#334155", textAlign: "center" }}>
          /ads/assets · Internal use only · Not indexed by search engines
        </p>
      </div>
    </div>
  );
}
