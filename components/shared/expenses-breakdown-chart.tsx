"use client"

import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from "recharts"

type Props = { laborTotal: number; budgetItemsTotal: number; materialsTotal?: number }

const COLORS = ["#3b82f6", "#a855f7", "#f59e0b"]

export function ExpensesBreakdownChart({ laborTotal, budgetItemsTotal, materialsTotal = 0 }: Props) {
  const total = laborTotal + budgetItemsTotal + materialsTotal

  if (total === 0) {
    return (
      <p className="text-sm text-gray-400 text-center py-10">
        Aucune dépense enregistrée
      </p>
    )
  }

  const data = [
    { name: "Main-d'œuvre", value: laborTotal },
    { name: "Dépenses chantier", value: budgetItemsTotal },
    { name: "Matériaux", value: materialsTotal },
  ].filter((d) => d.value > 0)

  return (
    <ResponsiveContainer width="100%" height={220}>
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="42%"
          innerRadius={55}
          outerRadius={80}
          paddingAngle={3}
          dataKey="value"
        >
          {data.map((_, i) => (
            <Cell key={i} fill={COLORS[i % COLORS.length]} />
          ))}
        </Pie>
        <Tooltip
          formatter={(v) => [
            new Intl.NumberFormat("fr-FR").format(Number(v)) + " FCFA",
          ]}
          contentStyle={{ fontSize: 12, borderRadius: 8 }}
        />
        <Legend wrapperStyle={{ fontSize: 12 }} />
      </PieChart>
    </ResponsiveContainer>
  )
}
