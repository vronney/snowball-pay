"use client";

export default function LandingBaseStyles() {
  return (
    <style>{`
      .lp { font-family: var(--font-outfit), -apple-system, 'Inter', sans-serif; }

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

      .lp-glass        { background: #ffffff; border: 1px solid rgba(15,23,42,0.08); box-shadow: 0 1px 3px rgba(15,23,42,0.04), 0 4px 12px rgba(15,23,42,0.04); }
      .lp-glass-hi     { background: #ffffff; border: 1px solid rgba(15,23,42,0.09); box-shadow: 0 4px 16px rgba(15,23,42,0.08), 0 1px 4px rgba(15,23,42,0.04); }
      .lp-glass-blue   { background: rgba(37,99,235,0.06);   border: 1px solid rgba(37,99,235,0.16); }
      .lp-glass-purple { background: rgba(124,58,237,0.06);  border: 1px solid rgba(124,58,237,0.16); }
      .lp-glass-green  { background: rgba(5,150,105,0.06);   border: 1px solid rgba(5,150,105,0.18); }
      .lp-glass-amber  { background: rgba(217,119,6,0.06);   border: 1px solid rgba(217,119,6,0.16); }
      .lp-glass-glow   { background: #ffffff; border: 1px solid rgba(37,99,235,0.2); box-shadow: 0 0 0 4px rgba(37,99,235,0.06), 0 20px 48px rgba(15,23,42,0.1); }

      .lp-orb { position: absolute; border-radius: 50%; filter: blur(100px); pointer-events: none; animation: lp-orb-float 8s ease-in-out infinite; }

      .lp-btn {
        display: inline-flex; align-items: center; gap: 8px; border-radius: 10px; font-weight: 700;
        font-size: 15px; text-decoration: none; cursor: pointer; border: none; font-family: inherit;
        position: relative; overflow: hidden;
        transition: box-shadow 0.22s ease, transform 0.22s cubic-bezier(0.34,1.56,0.64,1);
        white-space: nowrap;
      }
      .lp-btn::after { content: ''; position: absolute; inset: 0; background: linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.25) 50%, transparent 100%); transform: translateX(-110%); transition: transform 0.45s ease; pointer-events: none; }
      .lp-btn:hover::after { transform: translateX(110%); }

      .lp-btn-primary { color: #ffffff; background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%); box-shadow: 0 2px 8px rgba(37,99,235,0.28), 0 1px 0 rgba(255,255,255,0.12) inset; padding: 15px 30px; }
      .lp-btn-primary:hover { box-shadow: 0 6px 24px rgba(37,99,235,0.42); transform: translateY(-2px) scale(1.015); }

      .lp-btn-ghost { color: #475569; background: #ffffff; border: 1.5px solid rgba(15,23,42,0.14) !important; box-shadow: 0 1px 3px rgba(15,23,42,0.06); padding: 13px 26px; }
      .lp-btn-ghost:hover { background: #f8fafc !important; border-color: rgba(15,23,42,0.22) !important; color: #0f172a; transform: translateY(-1px); box-shadow: 0 4px 12px rgba(15,23,42,0.08); }

      .lp-nav { background: rgba(248,250,252,0.95); backdrop-filter: blur(24px); -webkit-backdrop-filter: blur(24px); border-bottom: 1px solid rgba(15,23,42,0.07); box-shadow: 0 1px 3px rgba(15,23,42,0.04); }

      .lp-nav-link    { font-size: 14px; color: #64748b; text-decoration: none; font-weight: 500; transition: color 0.18s; letter-spacing: 0.005em; }
      .lp-nav-link:hover { color: #0f172a; }

      .lp-ftr-link    { font-size: 14px; color: #94a3b8; text-decoration: none; font-weight: 500; transition: color 0.18s; }
      .lp-ftr-link:hover { color: #0f172a; }

      .lp-mobile-link { display: block; padding: 12px 4px; font-size: 15px; font-weight: 500; color: #475569; text-decoration: none; border-radius: 8px; transition: color 0.18s; }
      .lp-mobile-link:hover { color: #0f172a; }

      .lp-section-tag { display: inline-flex; align-items: center; gap: 8px; padding: 5px 14px; border-radius: 999px; font-size: 11px; font-weight: 700; letter-spacing: 0.12em; text-transform: uppercase; background: rgba(37,99,235,0.06); border: 1px solid rgba(37,99,235,0.14); color: #2563eb; margin-bottom: 18px; }

      .lp-trust-badge { display: inline-flex; align-items: center; gap: 8px; padding: 7px 14px; border-radius: 8px; background: #f8fafc; border: 1px solid rgba(15,23,42,0.08); font-size: 12px; font-weight: 600; color: #64748b; white-space: nowrap; transition: border-color 0.18s, color 0.18s; }
      .lp-trust-badge:hover { border-color: rgba(37,99,235,0.22); color: #334155; }

      .lp-live-dot { width: 7px; height: 7px; border-radius: 50%; background: #10b981; position: relative; display: inline-block; animation: lp-live-pulse 2s ease-in-out infinite; }
      .lp-live-dot::after { content: ''; position: absolute; inset: -4px; border-radius: 50%; border: 1px solid #10b981; animation: lp-ping 2s ease-out infinite; }

      .lp-track { height: 5px; border-radius: 999px; background: rgba(15,23,42,0.07); overflow: hidden; }
      .lp-bar   { height: 100%; border-radius: 999px; animation: lp-bar-fill 1.4s cubic-bezier(0.22,1,0.36,1) 0.6s both; }

      .lp-check-item { display: flex; align-items: flex-start; gap: 10px; font-size: 13.5px; color: #475569; line-height: 1.5; padding: 4px 0; }
    `}</style>
  );
}
