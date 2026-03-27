"use client";

export default function LandingAnimationStyles() {
  return (
    <style>{`
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

      .lp-float  { animation: lp-float 6s ease-in-out infinite; }
      .lp-float2 { animation: lp-float 8s ease-in-out 1.5s infinite; }
      .lp-float3 { animation: lp-float 7s ease-in-out 0.8s infinite; }

      .lp-f1 { animation: lp-fade-up 0.75s cubic-bezier(0.22,1,0.36,1) 0.05s both; }
      .lp-f2 { animation: lp-fade-up 0.75s cubic-bezier(0.22,1,0.36,1) 0.15s both; }
      .lp-f3 { animation: lp-fade-up 0.75s cubic-bezier(0.22,1,0.36,1) 0.25s both; }
      .lp-f4 { animation: lp-fade-up 0.75s cubic-bezier(0.22,1,0.36,1) 0.35s both; }
      .lp-f5 { animation: lp-fade-up 0.75s cubic-bezier(0.22,1,0.36,1) 0.45s both; }
      .lp-f6 { animation: lp-fade-up 0.75s cubic-bezier(0.22,1,0.36,1) 0.55s both; }

      .lp-ticker { display: flex; align-items: center; gap: 72px; white-space: nowrap; animation: lp-ticker 32s linear infinite; }
      .lp-ticker:hover { animation-play-state: paused; }

      .lp-chart-line { stroke-dasharray: 800; stroke-dashoffset: 800; animation: lp-draw-line 2s cubic-bezier(0.22,1,0.36,1) 0.9s forwards; }
      .lp-stat-num   { animation: lp-number-in 0.55s cubic-bezier(0.22,1,0.36,1) both; }
    `}</style>
  );
}
