'use client';

export default function LandingStyles() {
  return (
    <style>{`
      /* ─── Design tokens ──────────────────────────────── */
      .lp { font-family: var(--font-outfit), -apple-system, 'Inter', sans-serif; }

      /* ─── Keyframes ──────────────────────────────────── */
      @keyframes lp-glow-pulse {
        0%, 100% { opacity: 0.22; transform: scale(1); }
        50%       { opacity: 0.52; transform: scale(1.05); }
      }
      @keyframes lp-fade-up {
        from { opacity: 0; transform: translateY(36px); }
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
        0%, 100% { transform: translateY(0px) rotate(0deg); }
        33%       { transform: translateY(-11px) rotate(0.4deg); }
        66%       { transform: translateY(-5px) rotate(-0.3deg); }
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

      /* ─── Gradient text ──────────────────────────────── */
      .lp-text-blue {
        background: linear-gradient(118deg, #6bb8ff 0%, #a8d8ff 40%, #7dd3fc 70%, #4f9eff 100%);
        background-size: 220% 220%;
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        background-clip: text;
        animation: lp-gradient-shift 6s ease infinite;
      }
      .lp-text-purple {
        background: linear-gradient(118deg, #a78bfa 0%, #c4b5fd 55%, #818cf8 100%);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        background-clip: text;
      }
      .lp-text-warm {
        background: linear-gradient(118deg, #f59e0b 0%, #fcd34d 50%, #fb923c 100%);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        background-clip: text;
      }

      /* ─── Glass surfaces ─────────────────────────────── */
      .lp-glass {
        background: rgba(255,255,255,0.026);
        border: 1px solid rgba(255,255,255,0.065);
        backdrop-filter: blur(24px);
        -webkit-backdrop-filter: blur(24px);
      }
      .lp-glass-hi {
        background: rgba(255,255,255,0.048);
        border: 1px solid rgba(255,255,255,0.1);
        backdrop-filter: blur(32px);
        -webkit-backdrop-filter: blur(32px);
      }
      .lp-glass-blue {
        background: rgba(79,158,255,0.07);
        border: 1px solid rgba(79,158,255,0.18);
        backdrop-filter: blur(16px);
        -webkit-backdrop-filter: blur(16px);
      }
      .lp-glass-purple {
        background: rgba(139,92,246,0.07);
        border: 1px solid rgba(139,92,246,0.18);
        backdrop-filter: blur(16px);
        -webkit-backdrop-filter: blur(16px);
      }
      .lp-glass-green {
        background: rgba(16,185,129,0.07);
        border: 1px solid rgba(16,185,129,0.2);
        backdrop-filter: blur(16px);
        -webkit-backdrop-filter: blur(16px);
      }
      .lp-glass-amber {
        background: rgba(245,158,11,0.07);
        border: 1px solid rgba(245,158,11,0.18);
        backdrop-filter: blur(16px);
        -webkit-backdrop-filter: blur(16px);
      }

      /* ─── Orbs ───────────────────────────────────────── */
      .lp-orb {
        position: absolute;
        border-radius: 50%;
        filter: blur(120px);
        pointer-events: none;
        animation: lp-glow-pulse 7s ease-in-out infinite;
      }

      /* ─── Buttons ────────────────────────────────────── */
      .lp-btn {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        border-radius: 12px;
        font-weight: 800;
        font-size: 15px;
        text-decoration: none;
        cursor: pointer;
        border: none;
        font-family: inherit;
        position: relative;
        overflow: hidden;
        transition: box-shadow 0.25s ease, transform 0.25s cubic-bezier(0.34,1.56,0.64,1);
        white-space: nowrap;
      }
      .lp-btn::after {
        content: '';
        position: absolute;
        inset: 0;
        background: linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.13) 50%, transparent 100%);
        transform: translateX(-110%);
        transition: transform 0.5s ease;
        pointer-events: none;
      }
      .lp-btn:hover::after { transform: translateX(110%); }

      .lp-btn-primary {
        color: #fff;
        background: linear-gradient(135deg, #4f9eff 0%, #2d68e8 100%);
        box-shadow: 0 4px 22px rgba(59,130,246,0.32), 0 1px 0 rgba(255,255,255,0.08) inset;
        padding: 15px 30px;
      }
      .lp-btn-primary:hover {
        box-shadow: 0 8px 44px rgba(59,130,246,0.55), 0 1px 0 rgba(255,255,255,0.12) inset;
        transform: translateY(-2px) scale(1.015);
      }
      .lp-btn-ghost {
        color: #8ba8cc;
        background: rgba(255,255,255,0.04);
        border: 1px solid rgba(255,255,255,0.09) !important;
        backdrop-filter: blur(16px);
        padding: 14px 26px;
      }
      .lp-btn-ghost:hover {
        background: rgba(255,255,255,0.075) !important;
        border-color: rgba(255,255,255,0.16) !important;
        color: #eef4ff;
        transform: translateY(-1px);
      }

      /* ─── Nav ────────────────────────────────────────── */
      .lp-nav {
        background: rgba(5,9,26,0.88);
        backdrop-filter: blur(36px);
        -webkit-backdrop-filter: blur(36px);
        border-bottom: 1px solid rgba(255,255,255,0.05);
      }
      .lp-ftr-link {
        font-size: 14px;
        color: #3d5570;
        text-decoration: none;
        font-weight: 500;
        transition: color 0.2s;
      }
      .lp-ftr-link:hover { color: #eef4ff; }

      .lp-nav-link {
        font-size: 14px;
        color: #4a6680;
        text-decoration: none;
        font-weight: 500;
        transition: color 0.2s;
        letter-spacing: 0.01em;
      }
      .lp-nav-link:hover { color: #eef4ff; }

      /* ─── Cards ──────────────────────────────────────── */
      .lp-card-hover {
        transition: transform 0.35s cubic-bezier(0.34,1.56,0.64,1), border-color 0.3s, box-shadow 0.3s;
      }
      .lp-card-hover:hover {
        transform: translateY(-9px);
        border-color: rgba(79,158,255,0.24) !important;
        box-shadow: 0 32px 72px rgba(2,8,26,0.72), 0 0 0 1px rgba(79,158,255,0.1) !important;
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
        background: linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.042) 50%, transparent 100%);
        transform: translateX(-110%);
        animation: lp-shimmer 3.5s ease-in-out 1.2s infinite;
        z-index: 3;
        pointer-events: none;
        border-radius: inherit;
      }

      /* ─── Float animation ────────────────────────────── */
      .lp-float  { animation: lp-float 7s ease-in-out infinite; }
      .lp-float2 { animation: lp-float 9s ease-in-out 2s  infinite; }
      .lp-float3 { animation: lp-float 8s ease-in-out 1s  infinite; }

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
      .lp-f1 { animation: lp-fade-up 0.85s cubic-bezier(0.22,1,0.36,1) 0.05s both; }
      .lp-f2 { animation: lp-fade-up 0.85s cubic-bezier(0.22,1,0.36,1) 0.18s both; }
      .lp-f3 { animation: lp-fade-up 0.85s cubic-bezier(0.22,1,0.36,1) 0.31s both; }
      .lp-f4 { animation: lp-fade-up 0.85s cubic-bezier(0.22,1,0.36,1) 0.44s both; }
      .lp-f5 { animation: lp-fade-up 0.85s cubic-bezier(0.22,1,0.36,1) 0.57s both; }
      .lp-f6 { animation: lp-fade-up 0.85s cubic-bezier(0.22,1,0.36,1) 0.70s both; }

      /* ─── Testimonial card ───────────────────────────── */
      .lp-quote-card {
        transition: transform 0.35s cubic-bezier(0.34,1.56,0.64,1), border-color 0.3s;
      }
      .lp-quote-card:hover {
        transform: translateY(-7px);
        border-color: rgba(79,158,255,0.2) !important;
      }

      /* ─── FAQ ────────────────────────────────────────── */
      .lp-faq-row { border-bottom: 1px solid rgba(255,255,255,0.055); transition: border-color 0.2s; }
      .lp-faq-row:hover { border-color: rgba(79,158,255,0.18); }
      .lp-faq-trigger {
        width: 100%;
        background: none;
        border: none;
        padding: 26px 0;
        display: flex;
        justify-content: space-between;
        align-items: center;
        cursor: pointer;
        font-family: inherit;
        font-size: 16px;
        font-weight: 600;
        color: #b8d0e8;
        text-align: left;
        transition: color 0.2s;
        gap: 24px;
      }
      .lp-faq-trigger:hover { color: #eef4ff; }

      /* ─── Progress ───────────────────────────────────── */
      .lp-track {
        height: 6px;
        border-radius: 999px;
        background: rgba(255,255,255,0.055);
        overflow: hidden;
      }
      .lp-bar {
        height: 100%;
        border-radius: 999px;
        animation: lp-bar-fill 1.4s cubic-bezier(0.22,1,0.36,1) 0.6s both;
      }

      /* ─── Hero section background ────────────────────── */
      .lp-hero-bg {
        background:
          radial-gradient(ellipse 90% 65% at 50% -5%,  rgba(79,158,255,0.13) 0%, transparent 62%),
          radial-gradient(ellipse 55% 48% at 92% 82%,  rgba(139,92,246,0.09) 0%, transparent 52%),
          radial-gradient(ellipse 55% 48% at 7%  65%,  rgba(6,182,212,0.07)  0%, transparent 52%),
          #05091a;
      }

      /* ─── Step connector line ────────────────────────── */
      .lp-step-icon {
        transition: transform 0.3s cubic-bezier(0.34,1.56,0.64,1), box-shadow 0.3s;
      }
      .lp-step-icon:hover {
        transform: scale(1.12) rotate(-4deg);
        box-shadow: 0 0 28px var(--icon-glow, rgba(79,158,255,0.4));
      }

      /* ─── Responsive ─────────────────────────────────── */
      @media (max-width: 900px) {
        .lp-hero-cols  { flex-direction: column !important; }
        .lp-hero-right { max-width: 100% !important; margin-top: 56px; }
      }
      @media (max-width: 720px) {
        .lp-hide-sm   { display: none !important; }
        .lp-grid-sm1  { grid-template-columns: 1fr !important; }
        .lp-grid-sm2  { grid-template-columns: 1fr 1fr !important; }
        .lp-ftr-grid  { grid-template-columns: 1fr 1fr !important; }
        .lp-ps-cols   { flex-direction: column !important; }
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
