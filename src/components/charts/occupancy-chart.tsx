"use client";

import {
  Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import { formatMonth, formatPercent } from "@/lib/format";
import { ChartTooltip } from "@/components/charts/chart-tooltip";

export function OccupancyChart({
  data,
}: {
  data: { month: string; occupancy: number }[];
}) {
  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
          <CartesianGrid vertical={false} stroke="var(--border)" />
          <XAxis
            dataKey="month"
            tickFormatter={(m: string) => formatMonth(`${m}-01`)}
            tickLine={false}
            axisLine={false}
            tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
            dy={8}
          />
          <YAxis
            tickFormatter={(v: number) => `${v}%`}
            tickLine={false}
            axisLine={false}
            width={42}
            domain={[0, 100]}
            tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
          />
          <Tooltip
            cursor={{ fill: "var(--muted)", opacity: 0.5 }}
            content={
              <ChartTooltip
                labelFormatter={(l) => formatMonth(`${l}-01`)}
                valueFormatter={(v) => formatPercent(v)}
              />
            }
          />
          <Bar dataKey="occupancy" name="Occupancy" radius={[4, 4, 0, 0]}>
            {data.map((point) => (
              <Cell
                key={point.month}
                // Under 50% occupancy is the number worth noticing, so it
                // carries the accent; the tooltip and axis still state the value.
                fill={point.occupancy < 50 ? "var(--chart-2)" : "var(--chart-1)"}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
