"use client"

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts"

type Item = { name: string; budget: number; depenses: number }

function fmtAxis(v: number) {
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`
  if (v >= 1_000) return `${(v / 1_000).toFixed(0)}k`
  return String(v)
}

function fmtFcfa(v: number) {
  return new Intl.NumberFormat("fr-FR").format(v) + " FCFA"
}

export function BudgetChart({ data }: { data: Item[] }) {
  if (data.length === 0) {
    return (
      <p className="text-sm text-gray-400 text-center py-10">
        Aucun chantier actif
      </p>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={data.length > 4 ? 280 : 220}>
      <BarChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: data.length > 3 ? 52 : 8 }}>
        <XAxis
          dataKey="name"
          tick={{ fontSize: 11, fill: "#6b7280" }}
          angle={data.length > 3 ? -35 : 0}
          textAnchor={data.length > 3 ? "end" : "middle"}
          interval={0}
        />
        <YAxis tickFormatter={fmtAxis} tick={{ fontSize: 11, fill: "#6b7280" }} width={44} />
        <Tooltip
          formatter={(v, key) => [
            fmtFcfa(Number(v)),
            key === "budget" ? "Budget" : "Dépenses",
          ]}
          contentStyle={{ fontSize: 12, borderRadius: 8 }}
        />
        <Legend
          formatter={(v) => (v === "budget" ? "Budget" : "Dépenses")}
          wrapperStyle={{ fontSize: 12 }}
        />
        <Bar dataKey="budget" fill="#3b82f6" radius={[4, 4, 0, 0]} />
        <Bar dataKey="depenses" fill="#f97316" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  )
}
