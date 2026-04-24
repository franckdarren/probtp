import { createClient } from '@/lib/supabase/server'
import { db } from '@/lib/db'
import { users, projects, trades, laborEntries } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { createLaborEntry, deleteLaborEntry } from './actions'
import { Trash2 } from 'lucide-react'

function formatFcfa(amount: string | number) {
  return new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(Number(amount)) + ' FCFA'
}

export default async function LaborPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const dbUser = await db.query.users.findFirst({
    where: eq(users.authId, user!.id),
  })

  const companyId = dbUser!.companyId!

  const [companyProjects, companyTrades, allEntries] = await Promise.all([
    db.query.projects.findMany({
      where: eq(projects.companyId, companyId),
      orderBy: (p, { asc }) => [asc(p.name)],
    }),
    db.query.trades.findMany({
      where: eq(trades.companyId, companyId),
      orderBy: (t, { asc }) => [asc(t.name)],
    }),
    db.query.laborEntries.findMany({
      with: { project: true, trade: true },
      orderBy: (l, { desc }) => [desc(l.date)],
    }),
  ])

  const activeProjects = companyProjects.filter(
    (p) => p.status === 'en cours' || p.status === 'planifié'
  )

  // Filter entries to this company's projects
  const companyProjectIds = new Set(companyProjects.map((p) => p.id))
  const entries = allEntries.filter((e) => companyProjectIds.has(e.projectId))

  const totalCost = entries.reduce((s, e) => s + parseFloat(e.cost), 0)

  return (
    <main className="p-4 md:p-6 max-w-3xl mx-auto">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-gray-900">Main-d&apos;œuvre</h1>
        <p className="text-sm text-gray-500 mt-0.5">Coût total : {formatFcfa(totalCost)}</p>
      </div>

      {companyTrades.length === 0 ? (
        <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 mb-6 text-sm text-orange-700">
          Aucun métier configuré.{' '}
          <a href="/settings" className="font-semibold underline">
            Créer des métiers dans les paramètres
          </a>{' '}
          pour saisir la main-d&apos;œuvre.
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 mb-6">
          <h2 className="text-sm font-semibold text-gray-800 mb-3">Saisir des jours travaillés</h2>
          <form action={createLaborEntry} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Chantier</label>
                <select
                  name="projectId"
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                >
                  <option value="">Chantier...</option>
                  {activeProjects.map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Métier</label>
                <select
                  name="tradeId"
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                >
                  <option value="">Métier...</option>
                  {companyTrades.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name} ({formatFcfa(t.dailyRate)}/j)
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Ouvrier</label>
                <input
                  name="workerId"
                  type="text"
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Nom ou ID"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Jours travaillés</label>
                <input
                  name="daysWorked"
                  type="number"
                  min="0.5"
                  step="0.5"
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="1"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Date</label>
              <input
                name="date"
                type="date"
                defaultValue={new Date().toISOString().split('T')[0]}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <button
              type="submit"
              className="w-full py-2 px-4 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
            >
              Enregistrer
            </button>
          </form>
        </div>
      )}

      {/* Historique */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-50">
          <h2 className="text-sm font-semibold text-gray-800">Historique</h2>
        </div>
        {entries.length === 0 ? (
          <p className="px-4 py-6 text-xs text-gray-400 text-center">Aucune saisie</p>
        ) : (
          <div className="divide-y divide-gray-50">
            {entries.map((e) => {
              const deleteAction = deleteLaborEntry.bind(null, e.id, e.projectId)
              return (
                <div key={e.id} className="flex items-center px-4 py-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{e.workerId}</p>
                    <p className="text-xs text-gray-500">
                      {e.trade.name} · {e.daysWorked}j · {e.project.name}
                    </p>
                    <p className="text-xs text-gray-400">
                      {new Date(e.date).toLocaleDateString('fr-FR')}
                    </p>
                  </div>
                  <p className="text-sm font-semibold text-gray-900 mr-3">
                    {formatFcfa(e.cost)}
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
    </main>
  )
}
