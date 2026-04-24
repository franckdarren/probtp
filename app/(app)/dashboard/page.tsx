import { createClient } from '@/lib/supabase/server'
import { db } from '@/lib/db'
import { users, projects } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import Link from 'next/link'
import { BudgetChart } from '@/components/shared/budget-chart'
import { ExpensesBreakdownChart } from '@/components/shared/expenses-breakdown-chart'

function getBudgetStatus(consumptionRate: number, budgetThreshold: number) {
  if (consumptionRate >= budgetThreshold) return { label: 'Dépassé', color: 'text-red-600 bg-red-50', bar: 'bg-red-500' }
  if (consumptionRate >= 0.80) return { label: 'Alerte', color: 'text-orange-600 bg-orange-50', bar: 'bg-orange-400' }
  return { label: 'OK', color: 'text-green-700 bg-green-50', bar: 'bg-emerald-500' }
}

function formatFcfa(amount: number) {
  return new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(amount) + ' FCFA'
}

const STATUS_LABELS: Record<string, string> = {
  'planifié': 'Planifié',
  'en cours': 'En cours',
  'en pause': 'En pause',
  'terminé': 'Terminé',
  'annulé': 'Annulé',
}

const STATUS_COLORS: Record<string, string> = {
  'planifié': 'text-blue-700 bg-blue-50',
  'en cours': 'text-emerald-700 bg-emerald-50',
  'en pause': 'text-orange-600 bg-orange-50',
  'terminé': 'text-gray-600 bg-gray-100',
  'annulé': 'text-red-600 bg-red-50',
}

function truncate(s: string, n: number) {
  return s.length > n ? s.slice(0, n) + '…' : s
}

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const dbUser = await db.query.users.findFirst({
    where: eq(users.authId, user!.id),
    with: { company: true },
  })

  const allProjects = await db.query.projects.findMany({
    where: eq(projects.companyId, dbUser!.companyId!),
    with: {
      budgetItems: true,
      laborEntries: true,
      materialEntries: true,
    },
    orderBy: (p, { desc }) => [desc(p.createdAt)],
  })

  const budgetThreshold = parseFloat(dbUser!.company!.budgetThreshold)

  const enriched = allProjects.map((p) => {
    const budgetAdjusted = parseFloat(p.initialBudget) + parseFloat(p.adjustment)
    const expensesBudget = p.budgetItems.reduce((s, b) => s + parseFloat(b.amount), 0)
    const expensesLabor = p.laborEntries.reduce((s, l) => s + parseFloat(l.cost), 0)
    const expensesMaterials = p.materialEntries.reduce((s, m) => s + parseFloat(m.cost), 0)
    const actualExpenses = expensesBudget + expensesLabor + expensesMaterials
    const difference = budgetAdjusted - actualExpenses
    const consumptionRate = budgetAdjusted > 0 ? actualExpenses / budgetAdjusted : 0
    return { ...p, budgetAdjusted, actualExpenses, difference, consumptionRate, expensesBudget, expensesLabor, expensesMaterials }
  })

  const activeProjects = enriched.filter((p) => p.status === 'en cours')
  const totalBudget = enriched.reduce((s, p) => s + p.budgetAdjusted, 0)
  const totalExpenses = enriched.reduce((s, p) => s + p.actualExpenses, 0)
  const totalDifference = totalBudget - totalExpenses

  const totalLaborCost = enriched.reduce((s, p) => s + p.expensesLabor, 0)
  const totalBudgetItemsCost = enriched.reduce((s, p) => s + p.expensesBudget, 0)
  const totalMaterialsCost = enriched.reduce((s, p) => s + p.expensesMaterials, 0)

  const chartData = activeProjects.map((p) => ({
    name: truncate(p.name, 14),
    budget: Math.round(p.budgetAdjusted),
    depenses: Math.round(p.actualExpenses),
  }))

  return (
    <main className="p-4 md:p-6 max-w-5xl mx-auto">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-gray-900">Tableau de bord</h1>
        <p className="text-sm text-gray-500 mt-0.5">{dbUser?.company?.name}</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
          <p className="text-xs text-gray-500 mb-1">Chantiers actifs</p>
          <p className="text-2xl font-bold text-gray-900">{activeProjects.length}</p>
          <p className="text-xs text-gray-400 mt-0.5">sur {enriched.length} total</p>
        </div>

        <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
          <p className="text-xs text-gray-500 mb-1">Budget total</p>
          <p className="text-lg font-bold text-gray-900 leading-tight">{formatFcfa(totalBudget)}</p>
          <p className="text-xs text-gray-400 mt-0.5">ajusté</p>
        </div>

        <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
          <p className="text-xs text-gray-500 mb-1">Dépenses totales</p>
          <p className="text-lg font-bold text-gray-900 leading-tight">{formatFcfa(totalExpenses)}</p>
          <p className="text-xs text-gray-400 mt-0.5">
            {totalBudget > 0 ? Math.round((totalExpenses / totalBudget) * 100) : 0}% consommé
          </p>
        </div>

        <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
          <p className="text-xs text-gray-500 mb-1">Solde</p>
          <p className={`text-lg font-bold leading-tight ${totalDifference >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
            {totalDifference >= 0 ? '+' : ''}{formatFcfa(totalDifference)}
          </p>
          <p className="text-xs text-gray-400 mt-0.5">budget - dépenses</p>
        </div>
      </div>

      {/* Graphiques */}
      {enriched.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
            <h2 className="text-sm font-semibold text-gray-800 mb-3">Budget vs Dépenses</h2>
            <BudgetChart data={chartData} />
          </div>
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
            <h2 className="text-sm font-semibold text-gray-800 mb-3">Répartition des dépenses</h2>
            <ExpensesBreakdownChart
              laborTotal={totalLaborCost}
              budgetItemsTotal={totalBudgetItemsCost}
              materialsTotal={totalMaterialsCost}
            />
          </div>
        </div>
      )}

      {/* Table chantiers actifs */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
          <h2 className="text-sm font-semibold text-gray-800">Chantiers actifs</h2>
          <Link
            href="/projects"
            className="text-xs text-blue-600 hover:underline font-medium"
          >
            Voir tout
          </Link>
        </div>

        {activeProjects.length === 0 ? (
          <div className="px-4 py-10 text-center">
            <p className="text-sm text-gray-400">Aucun chantier en cours</p>
            <Link
              href="/projects"
              className="mt-3 inline-block text-sm text-blue-600 hover:underline font-medium"
            >
              Créer un chantier
            </Link>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {activeProjects.map((p) => {
              const status = getBudgetStatus(p.consumptionRate, budgetThreshold)
              const pct = Math.min(Math.round(p.consumptionRate * 100), 100)
              return (
                <Link
                  key={p.id}
                  href={`/projects/${p.id}`}
                  className="block px-4 py-3 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{p.name}</p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {formatFcfa(p.actualExpenses)} / {formatFcfa(p.budgetAdjusted)}
                      </p>
                    </div>
                    <div className="ml-3 flex flex-col items-end gap-1">
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${status.color}`}>
                        {status.label}
                      </span>
                      <span className="text-xs text-gray-400">{pct}%</span>
                    </div>
                  </div>
                  {/* Barre de progression */}
                  <div className="mt-2 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${status.bar}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </Link>
              )
            })}
          </div>
        )}
      </div>

      {/* Autres chantiers */}
      {enriched.filter((p) => p.status !== 'en cours').length > 0 && (
        <div className="mt-6 bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100">
            <h2 className="text-sm font-semibold text-gray-800">Autres chantiers</h2>
          </div>
          <div className="divide-y divide-gray-50">
            {enriched
              .filter((p) => p.status !== 'en cours')
              .map((p) => {
                const pct = Math.min(Math.round(p.consumptionRate * 100), 100)
                const status = getBudgetStatus(p.consumptionRate, budgetThreshold)
                return (
                  <Link
                    key={p.id}
                    href={`/projects/${p.id}`}
                    className="block px-4 py-3 hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">{p.name}</p>
                        <p className="text-xs text-gray-500 mt-0.5">
                          {formatFcfa(p.actualExpenses)} / {formatFcfa(p.budgetAdjusted)}
                        </p>
                      </div>
                      <span className={`ml-3 text-[10px] font-semibold px-2 py-0.5 rounded-full ${STATUS_COLORS[p.status]}`}>
                        {STATUS_LABELS[p.status]}
                      </span>
                    </div>
                    <div className="mt-2 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${status.bar}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </Link>
                )
              })}
          </div>
        </div>
      )}
    </main>
  )
}
