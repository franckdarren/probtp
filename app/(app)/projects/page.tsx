import { createClient } from '@/lib/supabase/server'
import { db } from '@/lib/db'
import { users, projects } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import Link from 'next/link'
import { createProject } from './actions'
import { Plus } from 'lucide-react'

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

function formatFcfa(amount: string | number) {
  return new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(Number(amount)) + ' FCFA'
}

export default async function ProjectsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const dbUser = await db.query.users.findFirst({
    where: eq(users.authId, user!.id),
  })

  const allProjects = await db.query.projects.findMany({
    where: eq(projects.companyId, dbUser!.companyId!),
    with: { budgetItems: true, laborEntries: true },
    orderBy: (p, { desc }) => [desc(p.createdAt)],
  })

  const enriched = allProjects.map((p) => {
    const budgetAdjusted = parseFloat(p.initialBudget) + parseFloat(p.adjustment)
    const actualExpenses =
      p.budgetItems.reduce((s, b) => s + parseFloat(b.amount), 0) +
      p.laborEntries.reduce((s, l) => s + parseFloat(l.cost), 0)
    return { ...p, budgetAdjusted, actualExpenses }
  })

  return (
    <main className="p-4 md:p-6 max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-gray-900">Chantiers</h1>
        <Link
          href="/projects/new"
          className="flex items-center gap-1.5 px-3 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus size={16} />
          Nouveau
        </Link>
      </div>

      {enriched.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-100 p-10 text-center">
          <p className="text-sm text-gray-400 mb-3">Aucun chantier pour le moment</p>
          <Link
            href="/projects/new"
            className="text-sm text-blue-600 hover:underline font-medium"
          >
            Créer votre premier chantier
          </Link>
        </div>
      ) : (
        <div className="space-y-2">
          {enriched.map((p) => (
            <Link
              key={p.id}
              href={`/projects/${p.id}`}
              className="flex items-center bg-white rounded-xl border border-gray-100 shadow-sm px-4 py-3 hover:bg-gray-50 transition-colors"
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-900 truncate">{p.name}</p>
                <div className="flex items-center gap-3 mt-0.5">
                  <p className="text-xs text-gray-500">
                    {formatFcfa(p.actualExpenses)} / {formatFcfa(p.budgetAdjusted)}
                  </p>
                  {p.startDate && (
                    <p className="text-xs text-gray-400">
                      {new Date(p.startDate).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </p>
                  )}
                </div>
              </div>
              <span className={`ml-3 shrink-0 text-[10px] font-semibold px-2 py-0.5 rounded-full ${STATUS_COLORS[p.status]}`}>
                {STATUS_LABELS[p.status]}
              </span>
            </Link>
          ))}
        </div>
      )}
    </main>
  )
}
