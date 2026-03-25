'use client';

export default function LandingStyles() {
  return (
    <style>{`
      /* ─── Design tokens ──────────────────────────────── */
      .lp { font-family: var(--font-outfit), -apple-system, 'Inter', sans-serif; }

      /* ─── Keyframes ──────────────────────────────────── */
      @keyframes lp-fade-up {
        from { opacity: 0; transform: translateY(28px); }
        to   { opacity: 1; transform: translateY(0); }
      }
      @keyframes lp-shimmer {
        from { transform: translateX(-110%); }
        to   { transform: translateX(120%); }
      }
      @keyframes lp-ticker {
        from { transform: translateX(0); }
        to   { transform: translateX(-50%); }
      }
      @keyframes lp-float {
        0%, 100% { transform: translateY(0px); }
        50%       { transform: translateY(-10px); }
      }
      @keyframes lp-gradient-shift {
        0%   { background-position: 0% 50%; }
        50%  { background-position: 100% 50%; }
        100% { background-position: 0% 50%; }
      }
      @keyframes lp-bar-fill {
        from { width: 0%; }
        to   { width: var(--bar-w); }
      }
      @keyframes lp-draw-line {
        from { stroke-dashoffset: 800; }
        to   { stroke-dashoffset: 0; }
      }
      @keyframes lp-ping {
        0%        { transform: scale(1); opacity: 0.8; }
        75%, 100% { transform: scale(2.4); opacity: 0; }
      }
      @keyframes lp-live-pulse {
        0%, 100% { opacity: 1; }
        50%       { opacity: 0.4; }
      }
      @keyframes lp-number-in {
        from { opacity: 0; transform: translateY(10px); }
        to   { opacity: 1; transform: translateY(0); }
      }
      @keyframes lp-orb-float {
        0%, 100% { transform: scale(1) translate(0,0); opacity: 0.45; }
        50%       { transform: scale(1.08) translate(8px,-12px); opacity: 0.7; }
      }

      /* ─── Gradient text ──────────────────────────────── */
      .lp-text-blue {
        background: linear-gradient(118deg, #1d4ed8 0%, #2563eb 35%, #3b82f6 70%, #0ea5e9 100%);
        background-size: 200% 200%;
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        background-clip: text;
        animation: lp-gradient-shift 6s ease infinite;
      }
      .lp-text-purple {
        background: linear-gradient(118deg, #6d28d9 0%, #7c3aed 55%, #8b5cf6 100%);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        background-clip: text;
      }
      .lp-text-warm {
        background: linear-gradient(118deg, #d97706 0%, #f59e0b 50%, #ea580c 100%);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        background-clip: text;
      }

      /* ─── Card / surface (replaces glassmorphism) ─────── */
      .lp-glass {
        background: #ffffff;
        border: 1px solid rgba(15,23,42,0.08);
        box-shadow: 0 1px 3px rgba(15,23,42,0.04), 0 4px 12px rgba(15,23,42,0.04);
      }
      .lp-glass-hi {
        background: #ffffff;
        border: 1px solid rgba(15,23,42,0.09);
        box-shadow: 0 4px 16px rgba(15,23,42,0.08), 0 1px 4px rgba(15,23,42,0.04);
      }
      .lp-glass-blue {
        background: rgba(37,99,235,0.06);
        border: 1px solid rgba(37,99,235,0.16);
      }
      .lp-glass-purple {
        background: rgba(124,58,237,0.06);
        border: 1px solid rgba(124,58,237,0.16);
      }
      .lp-glass-green {
        background: rgba(5,150,105,0.06);
        border: 1px solid rgba(5,150,105,0.18);
      }
      .lp-glass-amber {
        background: rgba(217,119,6,0.06);
        border: 1px solid rgba(217,119,6,0.16);
      }
      .lp-glass-glow {
        background: #ffffff;
        border: 1px solid rgba(37,99,235,0.2);
        box-shadow:
          0 0 0 4px rgba(37,99,235,0.06),
          0 20px 48px rgba(15,23,42,0.1);
      }

      /* ─── Decorative orbs (very subtle in light mode) ── */
      .lp-orb {
        position: absolute;
        border-radius: 50%;
        filter: blur(100px);
        pointer-events: none;
        animation: lp-orb-float 8s ease-in-out infinite;
      }

      /* ─── Buttons ────────────────────────────────────── */
      .lp-btn {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        border-radius: 10px;
        font-weight: 700;
        font-size: 15px;
        text-decoration: none;
        cursor: pointer;
        border: none;
        font-family: inherit;
        position: relative;
        overflow: hidden;
        transition: box-shadow 0.22s ease, transform 0.22s cubic-bezier(0.34,1.56,0.64,1);
        white-space: nowrap;
      }
      .lp-btn::after {
        content: '';
        position: absolute;
        inset: 0;
        background: linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.25) 50%, transparent 100%);
        transform: translateX(-110%);
        transition: transform 0.45s ease;
        pointer-events: none;
      }
      .lp-btn:hover::after { transform: translateX(110%); }

      .lp-btn-primary {
        color: #ffffff;
        background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
        box-shadow: 0 2px 8px rgba(37,99,235,0.28), 0 1px 0 rgba(255,255,255,0.12) inset;
        padding: 15px 30px;
      }
      .lp-btn-primary:hover {
        box-shadow: 0 6px 24px rgba(37,99,235,0.42);
        transform: translateY(-2px) scale(1.015);
      }
      .lp-btn-ghost {
        color: #475569;
        background: #ffffff;
        border: 1.5px solid rgba(15,23,42,0.14) !important;
        box-shadow: 0 1px 3px rgba(15,23,42,0.06);
        padding: 13px 26px;
      }
      .lp-btn-ghost:hover {
        background: #f8fafc !important;
        border-color: rgba(15,23,42,0.22) !important;
        color: #0f172a;
        transform: translateY(-1px);
        box-shadow: 0 4px 12px rgba(15,23,42,0.08);
      }

      /* ─── Nav ────────────────────────────────────────── */
      .lp-nav {
        background: rgba(248,250,252,0.95);
        backdrop-filter: blur(24px);
        -webkit-backdrop-filter: blur(24px);
        border-bottom: 1px solid rgba(15,23,42,0.07);
        box-shadow: 0 1px 3px rgba(15,23,42,0.04);
      }
      .lp-ftr-link {
        font-size: 14px;
        color: #94a3b8;
        text-decoration: none;
        font-weight: 500;
        transition: color 0.18s;
      }
      .lp-ftr-link:hover { color: #0f172a; }

      .lp-nav-link {
        font-size: 14px;
        color: #64748b;
        text-decoration: none;
        font-weight: 500;
        transition: color 0.18s;
        letter-spacing: 0.005em;
      }
      .lp-nav-link:hover { color: #0f172a; }

      /* ─── Mobile nav link ────────────────────────────── */
      .lp-mobile-link {
        display: block;
        padding: 12px 4px;
        font-size: 15px;
        font-weight: 500;
        color: #475569;
        text-decoration: none;
        border-radius: 8px;
        transition: color 0.18s;
      }
      .lp-mobile-link:hover { color: #0f172a; }

      /* ─── Card hover ─────────────────────────────────── */
      .lp-card-hover {
        transition: transform 0.3s cubic-bezier(0.34,1.56,0.64,1), box-shadow 0.25s ease, border-color 0.2s;
      }
      .lp-card-hover:hover {
        transform: translateY(-6px);
        box-shadow: 0 16px 48px rgba(15,23,42,0.1), 0 4px 16px rgba(15,23,42,0.06) !important;
        border-color: rgba(37,99,235,0.2) !important;
      }

      /* ─── Shimmer card ───────────────────────────────── */
      .lp-shimmer {
        position: relative;
        overflow: hidden;
      }
      .lp-shimmer::before {
        content: '';
        position: absolute;
        top: 0; left: 0; right: 0; bottom: 0;
        background: linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.7) 50%, transparent 100%);
        transform: translateX(-110%);
        animation: lp-shimmer 3.5s ease-in-out 1.2s infinite;
        z-index: 3;
        pointer-events: none;
        border-radius: inherit;
      }

      /* ─── Float animation ────────────────────────────── */
      .lp-float  { animation: lp-float 6s ease-in-out infinite; }
      .lp-float2 { animation: lp-float 8s ease-in-out 1.5s infinite; }
      .lp-float3 { animation: lp-float 7s ease-in-out 0.8s infinite; }

      /* ─── Ticker ─────────────────────────────────────── */
      .lp-ticker {
        display: flex;
        align-items: center;
        gap: 72px;
        white-space: nowrap;
        animation: lp-ticker 32s linear infinite;
      }
      .lp-ticker:hover { animation-play-state: paused; }

      /* ─── Fade-in stagger ────────────────────────────── */
      .lp-f1 { animation: lp-fade-up 0.75s cubic-bezier(0.22,1,0.36,1) 0.05s both; }
      .lp-f2 { animation: lp-fade-up 0.75s cubic-bezier(0.22,1,0.36,1) 0.15s both; }
      .lp-f3 { animation: lp-fade-up 0.75s cubic-bezier(0.22,1,0.36,1) 0.25s both; }
      .lp-f4 { animation: lp-fade-up 0.75s cubic-bezier(0.22,1,0.36,1) 0.35s both; }
      .lp-f5 { animation: lp-fade-up 0.75s cubic-bezier(0.22,1,0.36,1) 0.45s both; }
      .lp-f6 { animation: lp-fade-up 0.75s cubic-bezier(0.22,1,0.36,1) 0.55s both; }

      /* ─── Testimonial card ───────────────────────────── */
      .lp-quote-card {
        transition: transform 0.3s cubic-bezier(0.34,1.56,0.64,1), box-shadow 0.25s;
      }
      .lp-quote-card:hover {
        transform: translateY(-6px);
        box-shadow: 0 16px 48px rgba(15,23,42,0.1) !important;
      }

      /* ─── FAQ ────────────────────────────────────────── */
      .lp-faq-row { border-bottom: 1px solid rgba(15,23,42,0.08); transition: border-color 0.18s; }
      .lp-faq-row:hover { border-color: rgba(37,99,235,0.2); }
      .lp-faq-trigger {
        width: 100%;
        background: none;
        border: none;
        padding: 24px 0;
        display: flex;
        justify-content: space-between;
        align-items: center;
        cursor: pointer;
        font-family: inherit;
        font-size: 16px;
        font-weight: 600;
        color: #1e293b;
        text-align: left;
        transition: color 0.18s;
        gap: 24px;
      }
      .lp-faq-trigger:hover { color: #0f172a; }

      /* ─── Progress ───────────────────────────────────── */
      .lp-track {
        height: 5px;
        border-radius: 999px;
        background: rgba(15,23,42,0.07);
        overflow: hidden;
      }
      .lp-bar {
        height: 100%;
        border-radius: 999px;
        animation: lp-bar-fill 1.4s cubic-bezier(0.22,1,0.36,1) 0.6s both;
      }

      /* ─── Hero background ────────────────────────────── */
      .lp-hero-bg {
        background:
          radial-gradient(ellipse 110% 65% at 50% -5%,  rgba(37,99,235,0.07)  0%, transparent 65%),
          radial-gradient(ellipse 55% 50% at 95% 80%,   rgba(124,58,237,0.05) 0%, transparent 55%),
          radial-gradient(ellipse 50% 45% at 4% 65%,    rgba(14,165,233,0.04) 0%, transparent 52%),
          #f8fafc;
      }

      /* ─── Hero grid overlay ──────────────────────────── */
      .lp-grid-overlay {
        position: absolute; inset: 0; pointer-events: none;
        background-image:
          linear-gradient(rgba(15,23,42,0.035) 1px, transparent 1px),
          linear-gradient(90deg, rgba(15,23,42,0.035) 1px, transparent 1px);
        background-size: 64px 64px;
        mask-image: radial-gradient(ellipse 80% 55% at 50% 0%, black 15%, transparent 75%);
        -webkit-mask-image: radial-gradient(ellipse 80% 55% at 50% 0%, black 15%, transparent 75%);
      }

      /* ─── Step icon ──────────────────────────────────── */
      .lp-step-icon {
        transition: transform 0.3s cubic-bezier(0.34,1.56,0.64,1), box-shadow 0.25s;
      }
      .lp-step-icon:hover {
        transform: scale(1.1) rotate(-4deg);
        box-shadow: 0 8px 28px var(--icon-glow, rgba(37,99,235,0.25));
      }

      /* ─── Section tag ────────────────────────────────── */
      .lp-section-tag {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        padding: 5px 14px;
        border-radius: 999px;
        font-size: 11px;
        font-weight: 700;
        letter-spacing: 0.12em;
        text-transform: uppercase;
        background: rgba(37,99,235,0.06);
        border: 1px solid rgba(37,99,235,0.14);
        color: #2563eb;
        margin-bottom: 18px;
      }

      /* ─── Live dot ───────────────────────────────────── */
      .lp-live-dot {
        width: 7px; height: 7px; border-radius: 50%;
        background: #10b981;
        position: relative; display: inline-block;
        animation: lp-live-pulse 2s ease-in-out infinite;
      }
      .lp-live-dot::after {
        content: ''; position: absolute; inset: -4px; border-radius: 50%;
        border: 1px solid #10b981; animation: lp-ping 2s ease-out infinite;
      }

      /* ─── Chart line ─────────────────────────────────── */
      .lp-chart-line {
        stroke-dasharray: 800;
        stroke-dashoffset: 800;
        animation: lp-draw-line 2s cubic-bezier(0.22,1,0.36,1) 0.9s forwards;
      }

      /* ─── Feature icon ───────────────────────────────── */
      .lp-feat-icon {
        width: 48px; height: 48px; border-radius: 14px;
        display: flex; align-items: center; justify-content: center;
        flex-shrink: 0;
        transition: transform 0.3s cubic-bezier(0.34,1.56,0.64,1), box-shadow 0.25s;
      }
      .lp-card-hover:hover .lp-feat-icon {
        transform: scale(1.1) rotate(-5deg);
      }

      /* ─── Pricing cards ──────────────────────────────── */
      .lp-pricing-card {
        border-radius: 20px;
        padding: 36px;
        position: relative;
        overflow: hidden;
        transition: transform 0.3s cubic-bezier(0.34,1.56,0.64,1), box-shadow 0.25s;
        background: #ffffff;
        border: 1px solid rgba(15,23,42,0.08);
        box-shadow: 0 1px 3px rgba(15,23,42,0.04), 0 4px 12px rgba(15,23,42,0.04);
      }
      .lp-pricing-card:hover {
        transform: translateY(-6px);
        box-shadow: 0 16px 48px rgba(15,23,42,0.1);
      }
      .lp-pricing-featured {
        background: #ffffff;
        border: 1.5px solid rgba(37,99,235,0.3);
        box-shadow:
          0 0 0 4px rgba(37,99,235,0.06),
          0 16px 40px rgba(37,99,235,0.12),
          0 4px 12px rgba(15,23,42,0.06);
      }
      .lp-pricing-featured:hover {
        transform: translateY(-8px);
        box-shadow:
          0 0 0 4px rgba(37,99,235,0.08),
          0 24px 56px rgba(37,99,235,0.16),
          0 8px 24px rgba(15,23,42,0.08);
      }

      /* ─── Check list item ────────────────────────────── */
      .lp-check-item {
        display: flex;
        align-items: flex-start;
        gap: 10px;
        font-size: 13.5px;
        color: #475569;
        line-height: 1.5;
        padding: 4px 0;
      }

      /* ─── Trust badge ────────────────────────────────── */
      .lp-trust-badge {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        padding: 7px 14px;
        border-radius: 8px;
        background: #f8fafc;
        border: 1px solid rgba(15,23,42,0.08);
        font-size: 12px;
        font-weight: 600;
        color: #64748b;
        white-space: nowrap;
        transition: border-color 0.18s, color 0.18s;
      }
      .lp-trust-badge:hover { border-color: rgba(37,99,235,0.22); color: #334155; }

      /* ─── Stat number ────────────────────────────────── */
      .lp-stat-num {
        animation: lp-number-in 0.55s cubic-bezier(0.22,1,0.36,1) both;
      }

      /* ─── Responsive ─────────────────────────────────── */
      @media (max-width: 900px) {
        .lp-hero-cols  { flex-direction: column !important; }
        .lp-hero-right { max-width: 100% !important; margin-top: 48px; }
        .lp-pricing-grid { grid-template-columns: 1fr !important; max-width: 480px !important; margin-left: auto !important; margin-right: auto !important; }
      }
      @media (max-width: 720px) {
        .lp-hide-sm      { display: none !important; }
        .lp-show-sm      { display: flex !important; }
        .lp-grid-sm1     { grid-template-columns: 1fr !important; }
        .lp-grid-sm2     { grid-template-columns: 1fr 1fr !important; }
        .lp-ftr-grid     { grid-template-columns: 1fr 1fr !important; }
        .lp-ps-cols      { flex-direction: column !important; }
        .lp-pricing-grid { grid-template-columns: 1fr !important; max-width: 420px !important; margin-left: auto !important; margin-right: auto !important; }
      }
      @media (max-width: 480px) {
        .lp-ftr-grid   { grid-template-columns: 1fr !important; }
        .lp-stat-wrap  { flex-direction: column !important; gap: 28px !important; }
        .lp-ticker     { animation-duration: 20s; }
        .lp-cta-btns   { flex-direction: column !important; align-items: stretch !important; }
        .lp-cta-btns .lp-btn { justify-content: center; }
      }
    `}</style>
  );
}
