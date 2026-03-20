export default function LandingStyles() {
  return (
    <style>{`
      @keyframes pulseGlow {
        0%, 100% { opacity: 0.28; }
        50% { opacity: 0.6; }
      }
      @keyframes fillBar {
        from { width: 0%; }
        to { width: var(--bar-width); }
      }
      @keyframes fadeInUp {
        from { opacity: 0; transform: translateY(28px); }
        to { opacity: 1; transform: translateY(0); }
      }
      .hero-bg {
        background:
          radial-gradient(ellipse 90% 65% at 50% -10%, rgba(59,130,246,0.15) 0%, transparent 65%),
          radial-gradient(ellipse 55% 45% at 88% 85%, rgba(16,185,129,0.06) 0%, transparent 55%),
          radial-gradient(ellipse 60% 55% at 12% 72%, rgba(110,193,228,0.06) 0%, transparent 55%),
          #0d1424;
      }
      .text-gradient {
        background: linear-gradient(122deg, #4f9eff 0%, #7dd3fc 52%, #38bdf8 100%);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        background-clip: text;
      }
      .glass {
        background: rgba(255,255,255,0.032);
        border: 1px solid rgba(255,255,255,0.065);
        backdrop-filter: blur(20px);
        -webkit-backdrop-filter: blur(20px);
      }
      .glass-blue {
        background: rgba(59,130,246,0.07);
        border: 1px solid rgba(59,130,246,0.17);
      }
      .orb {
        position: absolute;
        border-radius: 50%;
        filter: blur(110px);
        pointer-events: none;
        animation: pulseGlow 6s ease-in-out infinite;
      }
      .btn-glow {
        box-shadow: 0 4px 22px rgba(59,130,246,0.28), 0 1px 0 rgba(255,255,255,0.07) inset;
        transition: box-shadow 0.25s ease, transform 0.25s cubic-bezier(0.34,1.56,0.64,1);
      }
      .btn-glow:hover {
        box-shadow: 0 6px 38px rgba(59,130,246,0.48), 0 1px 0 rgba(255,255,255,0.1) inset;
        transform: translateY(-2px) scale(1.015);
      }
      .btn-ghost {
        transition: background 0.2s ease, border-color 0.2s ease, transform 0.25s cubic-bezier(0.34,1.56,0.64,1);
      }
      .btn-ghost:hover {
        background: rgba(255,255,255,0.055);
        border-color: rgba(255,255,255,0.17);
        transform: translateY(-1px) scale(1.01);
      }
      .feat-card {
        transition: transform 0.3s cubic-bezier(0.34,1.56,0.64,1), border-color 0.25s ease, box-shadow 0.25s ease;
      }
      .feat-card:hover {
        transform: translateY(-7px);
        border-color: rgba(59,130,246,0.2);
        box-shadow: 0 22px 52px rgba(4,12,30,0.65), 0 0 0 1px rgba(59,130,246,0.07);
      }
      .nav-blur {
        background: rgba(13,20,36,0.88);
        backdrop-filter: blur(28px);
        -webkit-backdrop-filter: blur(28px);
        border-bottom: 1px solid rgba(255,255,255,0.045);
      }
      .fade-1 { animation: fadeInUp 0.7s cubic-bezier(0.22,1,0.36,1) 0.05s both; }
      .fade-2 { animation: fadeInUp 0.7s cubic-bezier(0.22,1,0.36,1) 0.16s both; }
      .fade-3 { animation: fadeInUp 0.7s cubic-bezier(0.22,1,0.36,1) 0.28s both; }
      .fade-4 { animation: fadeInUp 0.7s cubic-bezier(0.22,1,0.36,1) 0.4s both; }
      .fade-5 { animation: fadeInUp 0.7s cubic-bezier(0.22,1,0.36,1) 0.52s both; }
      .quote-card {
        transition: transform 0.3s cubic-bezier(0.34,1.56,0.64,1), border-color 0.25s ease;
      }
      .quote-card:hover {
        transform: translateY(-5px);
        border-color: rgba(59,130,246,0.18);
      }
      .step-icon {
        transition: transform 0.3s cubic-bezier(0.34,1.56,0.64,1);
      }
      .step-icon:hover {
        transform: scale(1.1) rotate(-3deg);
      }
      .stat-rule {
        width: 1px;
        min-height: 56px;
        background: linear-gradient(to bottom, transparent, rgba(255,255,255,0.08), transparent);
      }
    `}</style>
  );
}
