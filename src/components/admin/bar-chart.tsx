"use client";
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

export interface BarDatum { label: string; value: number; highlight?: boolean; full: string }

/** Single-series bar chart in the brand colour. Highlighted bar (e.g. "now") is solid; the rest at 35%. */
export function BrandBarChart({ data, caption, unit, height = 200 }: { data: BarDatum[]; caption: string; unit: string; height?: number }) {
  return (
    <figure className="flex flex-col gap-2">
      <div style={{ height }} aria-hidden>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 18, right: 4, bottom: 0, left: -18 }} barCategoryGap={2}>
            <CartesianGrid vertical={false} stroke="hsl(var(--border))" strokeDasharray="0" />
            <XAxis dataKey="label" tickLine={false} axisLine={false} interval="preserveStartEnd" minTickGap={8}
              tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10, fontFamily: "var(--font-mono)" }} />
            <YAxis allowDecimals={false} tickLine={false} axisLine={false} width={40}
              tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10, fontFamily: "var(--font-mono)" }} />
            <Tooltip cursor={{ fill: "hsl(var(--muted) / .5)" }}
              content={({ active, payload }) => active && payload?.[0] ? (
                <div className="rounded-lg border border-border bg-elevated px-3 py-2 text-[13px] shadow-lg">
                  <div className="font-mono text-xs text-muted-foreground">{(payload[0].payload as BarDatum).full}</div>
                  <div className="font-semibold text-foreground">{payload[0].value} {unit}</div>
                </div>
              ) : null} />
            <Bar dataKey="value" radius={[4, 4, 0, 0]} isAnimationActive={false}>
              {data.map((d) => <Cell key={d.full} fill={d.highlight ? "hsl(var(--primary))" : "hsl(var(--primary) / .35)"} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      <table className="sr-only">
        <caption>{caption}</caption>
        <tbody>{data.map((d) => <tr key={d.full}><th scope="row">{d.full}</th><td>{d.value} {unit}</td></tr>)}</tbody>
      </table>
    </figure>
  );
}
