"use client";

import {
  Area, AreaChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import { formatINRCompact, formatMonth } from "@/lib/format";
import { ChartTooltip } from "@/components/charts/chart-tooltip";

export type RevenuePoint = {
  month: string;
  revenue: number;
  expenses: number;
  net: number;
};

export function RevenueChart({ data }: { data: RevenuePoint[] }) {
  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
          <defs>
            <linearGradient id="revenueFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--chart-1)" stopOpacity={0.22} />
              <stop offset="100%" stopColor="var(--chart-1)" stopOpacity={0.02} />
            </linearGradient>
          </defs>

          <CartesianGrid
            strokeDasharray="0"
            vertical={false}
            stroke="var(--border)"
          />
          <XAxis
            dataKey="month"
            tickFormatter={(m: string) => formatMonth(`${m}-01`)}
            tickLine={false}
            axisLine={false}
            tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
            dy={8}
          />
          <YAxis
            tickFormatter={(v: number) => formatINRCompact(v)}
            tickLine={false}
            axisLine={false}
            width={58}
            tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
          />
          <Tooltip
            content={<ChartTooltip labelFormatter={(l) => formatMonth(`${l}-01`)} />}
            cursor={{ stroke: "var(--border)", strokeWidth: 1 }}
          />
          <Legend
            verticalAlign="top"
            align="right"
            height={28}
            iconType="plainline"
            wrapperStyle={{ fontSize: 12, color: "var(--muted-foreground)" }}
          />

          <Area
            type="monotone"
            dataKey="revenue"
            name="Revenue"
            stroke="var(--chart-1)"
            strokeWidth={2}
            fill="url(#revenueFill)"
            dot={false}
            activeDot={{ r: 4, strokeWidth: 2, stroke: "var(--card)" }}
          />
          <Area
            type="monotone"
            dataKey="expenses"
            name="Expenses"
            stroke="var(--chart-2)"
            strokeWidth={2}
            fill="none"
            strokeDasharray="4 3"
            dot={false}
            activeDot={{ r: 4, strokeWidth: 2, stroke: "var(--card)" }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
