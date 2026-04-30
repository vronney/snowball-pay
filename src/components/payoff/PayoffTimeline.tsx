"use client";

import {
  BarChart,
  Bar,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  LabelList,
  ResponsiveContainer,
} from "recharts";
import { getCategoryColor } from "@/lib/utils";

type TimelineEntry = {
  debtName: string;
  monthPaidOff: number;
  category: string;
};

interface PayoffTimelineProps {
  data: TimelineEntry[];
}

export default function PayoffTimeline({ data }: PayoffTimelineProps) {
  return (
    <div
      className="rounded-2xl p-5"
      style={{
        background: "rgb(255, 255, 255)",
        border: "1px solid rgba(15, 23, 42, 0.08)",
        boxShadow: "rgba(15, 23, 42, 0.06) 0px 1px 4px",
      }}
    >
      <h2 className="font-semibold text-base mb-4">Payoff Timeline</h2>

      {/* Desktop chart */}
      <div className="hidden sm:block h-72">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data}
            layout="vertical"
            margin={{ top: 8, right: 40, left: 16, bottom: 8 }}
          >
            <CartesianGrid stroke="rgba(15,23,42,0.08)" strokeDasharray="4 4" />
            <XAxis
              type="number"
              tick={{ fill: "rgba(15,23,42,0.45)", fontSize: 11 }}
              tickLine={false}
              axisLine={{ stroke: "rgba(15,23,42,0.15)" }}
              tickFormatter={(value: number) => `${value}m`}
            />
            <YAxis
              type="category"
              dataKey="debtName"
              width={110}
              tick={{ fill: "rgba(15,23,42,0.7)", fontSize: 11 }}
              tickLine={false}
              axisLine={false}
            />
            <Tooltip
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null;
                const d = payload[0];
                const months = d.value as number;
                const years = Math.floor(months / 12);
                const rem = months % 12;
                const timeLabel =
                  years > 0 ? `${years}y ${rem}m` : `${months}m`;
                const color =
                  (d.payload as { fill?: string }).fill ?? "#f59e0b";
                return (
                  <div
                    style={{
                      background: "#ffffff",
                      border: "1px solid rgba(15,23,42,0.12)",
                      borderRadius: 10,
                      padding: "10px 14px",
                      boxShadow: "0 1px 6px rgba(15,23,42,0.12)",
                    }}
                  >
                    <div
                      style={{
                        fontSize: 13,
                        fontWeight: 600,
                        color: "#0f172a",
                        marginBottom: 4,
                      }}
                    >
                      {(d.payload as { debtName?: string }).debtName}
                    </div>
                    <div style={{ fontSize: 12, color: "#64748b" }}>
                      Paid off in{" "}
                      <span style={{ color, fontWeight: 700 }}>
                        {timeLabel}
                      </span>
                    </div>
                  </div>
                );
              }}
            />
            <Bar dataKey="monthPaidOff" radius={[0, 6, 6, 0]}>
              {data.map((entry) => (
                <Cell
                  key={entry.debtName}
                  fill={getCategoryColor(entry.category)}
                />
              ))}
              <LabelList
                dataKey="monthPaidOff"
                position="right"
                content={(props) => {
                  const { x, y, width, height } = props as {
                    x?: number;
                    y?: number;
                    width?: number;
                    height?: number;
                  };
                  if (x == null || y == null || width == null || height == null)
                    return null;
                  return (
                    <text
                      x={(x as number) + (width as number) + 6}
                      y={(y as number) + (height as number) / 2}
                      dominantBaseline="middle"
                      fontSize={13}
                      fill="#059669"
                    >
                      ✓
                    </text>
                  );
                }}
              />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Mobile list */}
      <div className="block sm:hidden space-y-2">
        {data.map((entry) => {
          const color = getCategoryColor(entry.category);
          const yrs = Math.floor(entry.monthPaidOff / 12);
          const mos = entry.monthPaidOff % 12;
          const timeLabel = yrs > 0 ? `${yrs}y ${mos}m` : `${mos}m`;
          return (
            <div
              key={entry.debtName}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "8px 10px",
                borderRadius: "8px",
                background: "#f8fafc",
                border: "1px solid rgba(15,23,42,0.06)",
              }}
            >
              <div
                style={{ display: "flex", alignItems: "center", gap: "8px" }}
              >
                <span
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: "50%",
                    background: color,
                    flexShrink: 0,
                    display: "inline-block",
                  }}
                />
                <span
                  style={{
                    fontSize: "13px",
                    color: "#0f172a",
                    fontWeight: 500,
                  }}
                >
                  {entry.debtName}
                </span>
              </div>
              <div
                style={{ display: "flex", alignItems: "center", gap: "6px" }}
              >
                <span
                  style={{
                    fontSize: "12px",
                    fontWeight: 700,
                    color,
                    fontFamily: "var(--font-geist-mono, monospace)",
                  }}
                >
                  {timeLabel}
                </span>
                <span style={{ fontSize: "12px", color: "#059669" }}>✓</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
