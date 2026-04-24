import { createClient } from '@/lib/supabase/server'
import { db } from '@/lib/db'
import { users, trades } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { updateCompany, createTrade, deleteTrade } from './actions'
import { Trash2 } from 'lucide-react'

function formatFcfa(amount: string | number) {
  return new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(Number(amount)) + ' FCFA'
}

export default async function SettingsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const dbUser = await db.query.users.findFirst({
    where: eq(users.authId, user!.id),
    with: { company: true },
  })

  const company = dbUser!.company!

  const companyTrades = await db.query.trades.findMany({
    where: eq(trades.companyId, company.id),
    orderBy: (t, { asc }) => [asc(t.name)],
  })

  return (
    <main className="p-4 md:p-6 max-w-2xl mx-auto space-y-6">
      <h1 className="text-xl font-bold text-gray-900">Paramètres</h1>

      {/* Infos entreprise */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
        <h2 className="text-sm font-semibold text-gray-800 mb-4">Entreprise</h2>
        <form action={updateCompany} className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Nom de l&apos;entreprise
            </label>
            <input
              name="name"
              type="text"
              required
              defaultValue={company.name}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Taux ouvrier qualifié (FCFA/j)
              </label>
              <input
                name="skilledRate"
                type="number"
                min="0"
                step="1"
                required
                defaultValue={company.skilledRate}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Taux ouvrier non-qualifié (FCFA/j)
              </label>
              <input
                name="unskilledRate"
                type="number"
                min="0"
                step="1"
                required
                defaultValue={company.unskilledRate}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Seuil d&apos;alerte rouge (ex: 1.00 = 100%)
            </label>
            <input
              name="budgetThreshold"
              type="number"
              min="0.01"
              max="2"
              step="0.01"
              required
              defaultValue={company.budgetThreshold}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <p className="text-xs text-gray-400 mt-1">
              Dépassement budgétaire signalé en rouge au-delà de ce seuil
            </p>
          </div>

          <button
            type="submit"
            className="w-full py-2 px-4 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
          >
            Enregistrer
          </button>
        </form>
      </div>

      {/* Métiers */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-50">
          <h2 className="text-sm font-semibold text-gray-800">Métiers</h2>
          <p className="text-xs text-gray-400 mt-0.5">Utilisés pour le calcul des coûts MO</p>
        </div>

        {companyTrades.length > 0 && (
          <div className="divide-y divide-gray-50">
            {companyTrades.map((t) => {
              const deleteAction = deleteTrade.bind(null, t.id)
              return (
                <div key={t.id} className="flex items-center px-4 py-3">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900">{t.name}</p>
                    <p className="text-xs text-gray-400">{formatFcfa(t.dailyRate)} / jour</p>
                  </div>
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

        <div className="px-4 py-3 border-t border-gray-50">
          <form action={createTrade} className="flex gap-2">
            <input
              name="name"
              type="text"
              required
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Maçon, Ferrailleur..."
            />
            <input
              name="dailyRate"
              type="number"
              min="0"
              step="1"
              required
              className="w-32 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="FCFA/j"
            />
            <button
              type="submit"
              className="px-3 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors shrink-0"
            >
              Ajouter
            </button>
          </form>
        </div>
      </div>
    </main>
  )
}
