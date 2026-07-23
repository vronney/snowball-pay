interface RadialGaugeProps {
  /** 0–100 */
  pct: number;
  size?: number;
  stroke?: number;
  color?: string;
}

/**
 * Thin SVG arc gauge for payoff progress — track uses the border token so the
 * fill (primary blue by default) stays the only color, per DESIGN.md.
 */
export default function RadialGauge({
  pct,
  size = 56,
  stroke = 4,
  color = "#2563eb",
}: RadialGaugeProps) {
  const clamped = Math.max(0, Math.min(100, pct));
  const r = (size - stroke) / 2;
  const circumference = 2 * Math.PI * r;

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      role="img"
      aria-label={`${Math.round(clamped)}% paid off`}
      style={{ flexShrink: 0 }}
    >
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke="#e2e8f0"
        strokeWidth={stroke}
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke={color}
        strokeWidth={stroke}
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={circumference * (1 - clamped / 100)}
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
        style={{
          filter: `drop-shadow(0 0 3px ${color}59)`,
          transition: "stroke-dashoffset 0.5s cubic-bezier(0,0,0.2,1)",
        }}
      />
      <text
        x="50%"
        y="50%"
        dominantBaseline="central"
        textAnchor="middle"
        className="mono"
        style={{
          fontSize: size * 0.24,
          fontWeight: 700,
          fill: "#0f172a",
          fontVariantNumeric: "tabular-nums",
        }}
      >
        {Math.round(clamped)}%
      </text>
    </svg>
  );
}
