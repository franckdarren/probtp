import { createClient } from '@/lib/supabase/server'
import { db } from '@/lib/db'
import { users, projects, budgetItems } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { createBudgetItem, deleteBudgetItem } from './actions'
import { Trash2 } from 'lucide-react'

function formatFcfa(amount: string | number) {
  return new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(Number(amount)) + ' FCFA'
}

export default async function BudgetPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const dbUser = await db.query.users.findFirst({
    where: eq(users.authId, user!.id),
  })

  const companyProjects = await db.query.projects.findMany({
    where: eq(projects.companyId, dbUser!.companyId!),
    with: { budgetItems: { orderBy: (b, { desc }) => [desc(b.createdAt)] } },
    orderBy: (p, { asc }) => [asc(p.name)],
  })

  const activeProjects = companyProjects.filter(
    (p) => p.status === 'en cours' || p.status === 'planifié'
  )

  return (
    <main className="p-4 md:p-6 max-w-3xl mx-auto">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-gray-900">Budget</h1>
        <p className="text-sm text-gray-500 mt-0.5">Postes de dépenses par chantier</p>
      </div>

      {/* Form ajout */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 mb-6">
        <h2 className="text-sm font-semibold text-gray-800 mb-3">Ajouter une dépense</h2>
        <form action={createBudgetItem} className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Chantier</label>
            <select
              name="projectId"
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            >
              <option value="">Sélectionner un chantier</option>
              {activeProjects.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Libellé</label>
              <input
                name="label"
                type="text"
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Béton, Ferraillage..."
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Montant (FCFA)</label>
              <input
                name="amount"
                type="number"
                min="0"
                step="1"
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="0"
              />
            </div>
          </div>
          <button
            type="submit"
            className="w-full py-2 px-4 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
          >
            Ajouter
          </button>
        </form>
      </div>

      {/* Liste par chantier */}
      <div className="space-y-4">
        {companyProjects.map((p) => {
          const total = p.budgetItems.reduce((s, b) => s + parseFloat(b.amount), 0)
          const budgetAdjusted = parseFloat(p.initialBudget) + parseFloat(p.adjustment)
          return (
            <div key={p.id} className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 border-b border-gray-50">
                <div>
                  <p className="text-sm font-semibold text-gray-900">{p.name}</p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {formatFcfa(total)} dépensé / budget {formatFcfa(budgetAdjusted)}
                  </p>
                </div>
                {budgetAdjusted > 0 && (
                  <span className="text-xs font-semibold text-gray-500">
                    {Math.round((total / budgetAdjusted) * 100)}%
                  </span>
                )}
              </div>
              {p.budgetItems.length === 0 ? (
                <p className="px-4 py-4 text-xs text-gray-400">Aucune dépense saisie</p>
              ) : (
                <div className="divide-y divide-gray-50">
                  {p.budgetItems.map((item) => {
                    const deleteAction = deleteBudgetItem.bind(null, item.id, p.id)
                    return (
                      <div key={item.id} className="flex items-center px-4 py-2.5">
                        <div className="flex-1">
                          <p className="text-sm text-gray-800">{item.label}</p>
                          <p className="text-xs text-gray-400">
                            {new Date(item.createdAt).toLocaleDateString('fr-FR')}
                          </p>
                        </div>
                        <p className="text-sm font-semibold text-gray-900 mr-3">
                          {formatFcfa(item.amount)}
                        </p>
                        <form action={deleteAction}>
                          <button type="submit" className="text-gray-400 hover:text-red-500 transition-colors">
                            <Trash2 size={14} />
                          </button>
                        </form>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </main>
  )
}
