"use client";

export default function LandingComponentStyles() {
  return (
    <style>{`
      .lp-card-hover { transition: transform 0.3s cubic-bezier(0.34,1.56,0.64,1), box-shadow 0.25s ease, border-color 0.2s; }
      .lp-card-hover:hover { transform: translateY(-6px); box-shadow: 0 16px 48px rgba(15,23,42,0.1), 0 4px 16px rgba(15,23,42,0.06) !important; border-color: rgba(37,99,235,0.2) !important; }

      .lp-shimmer { position: relative; overflow: hidden; }
      .lp-shimmer::before { content: ''; position: absolute; top: 0; left: 0; right: 0; bottom: 0; background: linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.7) 50%, transparent 100%); transform: translateX(-110%); animation: lp-shimmer 3.5s ease-in-out 1.2s infinite; z-index: 3; pointer-events: none; border-radius: inherit; }

      .lp-quote-card { transition: transform 0.3s cubic-bezier(0.34,1.56,0.64,1), box-shadow 0.25s; }
      .lp-quote-card:hover { transform: translateY(-6px); box-shadow: 0 16px 48px rgba(15,23,42,0.1) !important; }

      .lp-faq-row { border-bottom: 1px solid rgba(15,23,42,0.08); transition: border-color 0.18s; }
      .lp-faq-row:hover { border-color: rgba(37,99,235,0.2); }
      .lp-faq-trigger { width: 100%; background: none; border: none; padding: 24px 0; display: flex; justify-content: space-between; align-items: center; cursor: pointer; font-family: inherit; font-size: 16px; font-weight: 600; color: #1e293b; text-align: left; transition: color 0.18s; gap: 24px; }
      .lp-faq-trigger:hover { color: #0f172a; }

      .lp-step-icon { transition: transform 0.3s cubic-bezier(0.34,1.56,0.64,1), box-shadow 0.25s; }
      .lp-step-icon:hover { transform: scale(1.1) rotate(-4deg); box-shadow: 0 8px 28px var(--icon-glow, rgba(37,99,235,0.25)); }

      .lp-feat-icon { width: 48px; height: 48px; border-radius: 14px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; transition: transform 0.3s cubic-bezier(0.34,1.56,0.64,1), box-shadow 0.25s; }
      .lp-card-hover:hover .lp-feat-icon { transform: scale(1.1) rotate(-5deg); }

      .lp-pricing-card { border-radius: 20px; padding: 36px; position: relative; overflow: hidden; transition: transform 0.3s cubic-bezier(0.34,1.56,0.64,1), box-shadow 0.25s; background: #ffffff; border: 1px solid rgba(15,23,42,0.08); box-shadow: 0 1px 3px rgba(15,23,42,0.04), 0 4px 12px rgba(15,23,42,0.04); }
      .lp-pricing-card:hover { transform: translateY(-6px); box-shadow: 0 16px 48px rgba(15,23,42,0.1); }
      .lp-pricing-featured { background: #ffffff; border: 1.5px solid rgba(37,99,235,0.3); box-shadow: 0 0 0 4px rgba(37,99,235,0.06), 0 16px 40px rgba(37,99,235,0.12), 0 4px 12px rgba(15,23,42,0.06); }
      .lp-pricing-featured:hover { transform: translateY(-8px); box-shadow: 0 0 0 4px rgba(37,99,235,0.08), 0 24px 56px rgba(37,99,235,0.16), 0 8px 24px rgba(15,23,42,0.08); }

      .lp-hero-bg {
        background:
          radial-gradient(ellipse 110% 65% at 50% -5%,  rgba(37,99,235,0.07)  0%, transparent 65%),
          radial-gradient(ellipse 55% 50% at 95% 80%,   rgba(124,58,237,0.05) 0%, transparent 55%),
          radial-gradient(ellipse 50% 45% at 4% 65%,    rgba(14,165,233,0.04) 0%, transparent 52%),
          #f8fafc;
      }
      .lp-grid-overlay {
        position: absolute; inset: 0; pointer-events: none;
        background-image: linear-gradient(rgba(15,23,42,0.035) 1px, transparent 1px), linear-gradient(90deg, rgba(15,23,42,0.035) 1px, transparent 1px);
        background-size: 64px 64px;
        mask-image: radial-gradient(ellipse 80% 55% at 50% 0%, black 15%, transparent 75%);
        -webkit-mask-image: radial-gradient(ellipse 80% 55% at 50% 0%, black 15%, transparent 75%);
      }

      @media (max-width: 900px) {
        .lp-hero-cols   { flex-direction: column !important; }
        .lp-hero-right  { max-width: 100% !important; margin-top: 48px; }
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
