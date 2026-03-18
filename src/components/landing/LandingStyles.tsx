export default function LandingStyles() {
  return (
    <style>{`
      @keyframes gradientShift {
        0%, 100% { background-position: 0% 50%; }
        50% { background-position: 100% 50%; }
      }
      @keyframes pulseGlow {
        0%, 100% { opacity: 0.35; }
        50% { opacity: 0.7; }
      }
      @keyframes fillBar {
        from { width: 0%; }
        to { width: var(--bar-width); }
      }
      @keyframes fadeInUp {
        from { opacity: 0; transform: translateY(20px); }
        to { opacity: 1; transform: translateY(0); }
      }
      .hero-bg {
        background: radial-gradient(ellipse 80% 60% at 50% -10%, rgba(59,130,246,0.18) 0%, transparent 70%),
                    radial-gradient(ellipse 60% 50% at 80% 80%, rgba(110,193,228,0.08) 0%, transparent 60%),
                    #0f1729;
      }
      .text-gradient {
        background: linear-gradient(130deg, #3b82f6 0%, #6ec1e4 60%, #38bdf8 100%);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        background-clip: text;
      }
      .glass {
        background: rgba(255,255,255,0.04);
        border: 1px solid rgba(255,255,255,0.08);
        backdrop-filter: blur(16px);
        -webkit-backdrop-filter: blur(16px);
      }
      .glass-blue {
        background: rgba(59,130,246,0.08);
        border: 1px solid rgba(59,130,246,0.2);
      }
      .orb {
        position: absolute;
        border-radius: 50%;
        filter: blur(90px);
        pointer-events: none;
        animation: pulseGlow 5s ease-in-out infinite;
      }
      .btn-glow {
        box-shadow: 0 0 28px rgba(59,130,246,0.35);
        transition: box-shadow 0.3s ease, transform 0.3s ease;
      }
      .btn-glow:hover {
        box-shadow: 0 0 48px rgba(59,130,246,0.55);
        transform: translateY(-2px);
      }
      .btn-ghost {
        transition: background 0.2s ease, border-color 0.2s ease, transform 0.2s ease;
      }
      .btn-ghost:hover {
        background: rgba(255,255,255,0.07);
        border-color: rgba(255,255,255,0.2);
        transform: translateY(-1px);
      }
      .feat-card {
        transition: transform 0.25s ease, border-color 0.25s ease, box-shadow 0.25s ease;
      }
      .feat-card:hover {
        transform: translateY(-5px);
        border-color: rgba(59,130,246,0.28);
        box-shadow: 0 16px 40px rgba(0,0,0,0.3);
      }
      .nav-blur {
        background: rgba(15,23,41,0.82);
        backdrop-filter: blur(24px);
        -webkit-backdrop-filter: blur(24px);
        border-bottom: 1px solid rgba(255,255,255,0.06);
      }
      .fade-1 { animation: fadeInUp 0.65s ease-out 0.1s both; }
      .fade-2 { animation: fadeInUp 0.65s ease-out 0.25s both; }
      .fade-3 { animation: fadeInUp 0.65s ease-out 0.4s both; }
      .fade-4 { animation: fadeInUp 0.65s ease-out 0.55s both; }
      .fade-5 { animation: fadeInUp 0.65s ease-out 0.7s both; }
      .quote-card {
        transition: transform 0.25s ease, border-color 0.25s ease;
      }
      .quote-card:hover {
        transform: translateY(-3px);
        border-color: rgba(59,130,246,0.25);
      }
      .step-icon {
        transition: transform 0.25s ease;
      }
      .step-icon:hover {
        transform: scale(1.08);
      }
    `}</style>
  );
}
