"use client";

import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

export interface Series {
  key: string;
  label: string;
  color: string;
}

const axis = { stroke: "var(--ink-3)", fontSize: 11, tickLine: false, axisLine: { stroke: "var(--line)" } } as const;

/** Stacked or single-series vertical bars. Thin marks, recessive grid, hover tooltip, legend for ≥2 series. */
export function Bars({ data, x, series, height = 260, stacked, ariaLabel }: { data: Record<string, string | number>[]; x: string; series: Series[]; height?: number; stacked?: boolean; ariaLabel: string }) {
  return (
    <div role="img" aria-label={ariaLabel} style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -12 }} barCategoryGap="28%">
          <CartesianGrid vertical={false} stroke="var(--line)" strokeDasharray="0" />
          <XAxis dataKey={x} {...axis} />
          <YAxis {...axis} allowDecimals={false} width={44} />
          <Tooltip
            cursor={{ fill: "var(--surface-2)" }}
            contentStyle={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 8, fontSize: 12, color: "var(--ink)" }}
            labelStyle={{ color: "var(--ink)", fontWeight: 600 }}
            itemStyle={{ color: "var(--ink-2)" }}
          />
          {series.length > 1 && <Legend iconType="square" iconSize={10} itemSorter={null} wrapperStyle={{ fontSize: 12, color: "var(--ink-2)" }} />}
          {series.map((s, i) => (
            <Bar
              key={s.key}
              dataKey={s.key}
              name={s.label}
              stackId={stacked ? "a" : undefined}
              fill={s.color}
              stroke="var(--surface)"
              strokeWidth={stacked ? 2 : 0}
              radius={!stacked || i === series.length - 1 ? [4, 4, 0, 0] : 0}
              maxBarSize={56}
              isAnimationActive={false}
            />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

/** Horizontal single-series bars for a ranked categorical breakdown. */
export function HBars({ data, color = "var(--cat-g6)", ariaLabel, height }: { data: { name: string; value: number }[]; color?: string; ariaLabel: string; height?: number }) {
  return (
    <div role="img" aria-label={ariaLabel} style={{ height: height ?? Math.max(120, data.length * 34 + 30) }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical" margin={{ top: 0, right: 24, bottom: 0, left: 8 }} barCategoryGap="30%">
          <CartesianGrid horizontal={false} stroke="var(--line)" />
          <XAxis type="number" {...axis} allowDecimals={false} />
          <YAxis type="category" dataKey="name" {...axis} width={120} />
          <Tooltip
            cursor={{ fill: "var(--surface-2)" }}
            contentStyle={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 8, fontSize: 12, color: "var(--ink)" }}
          />
          <Bar dataKey="value" name="Games" fill={color} radius={[0, 4, 4, 0]} isAnimationActive={false} label={{ position: "right", fill: "var(--ink-2)", fontSize: 11 }} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
