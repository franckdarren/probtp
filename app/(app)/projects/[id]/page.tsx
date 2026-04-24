import { db } from '@/lib/db'
import { projects } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Camera, Pencil } from 'lucide-react'
import { updateProject, deleteProject } from '../actions'

const STATUSES = ['planifié', 'en cours', 'en pause', 'terminé', 'annulé'] as const

const STATUS_LABELS: Record<string, string> = {
  'planifié': 'Planifié',
  'en cours': 'En cours',
  'en pause': 'En pause',
  'terminé': 'Terminé',
  'annulé': 'Annulé',
}

function formatFcfa(amount: number) {
  return new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(amount) + ' FCFA'
}

function toDateInput(d: Date | null) {
  if (!d) return ''
  return new Date(d).toISOString().split('T')[0]
}

export default async function ProjectDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  const project = await db.query.projects.findFirst({
    where: eq(projects.id, id),
    with: {
      budgetItems: true,
      laborEntries: { with: { trade: true } },
      images: true,
    },
  })

  if (!project) notFound()

  const budgetAdjusted = parseFloat(project.initialBudget) + parseFloat(project.adjustment)
  const expensesBudget = project.budgetItems.reduce((s, b) => s + parseFloat(b.amount), 0)
  const expensesLabor = project.laborEntries.reduce((s, l) => s + parseFloat(l.cost), 0)
  const actualExpenses = expensesBudget + expensesLabor
  const difference = budgetAdjusted - actualExpenses
  const consumptionRate = budgetAdjusted > 0 ? actualExpenses / budgetAdjusted : 0

  const updateWithId = updateProject.bind(null, id)
  const deleteWithId = deleteProject.bind(null, id)

  return (
    <main className="p-4 md:p-6 max-w-2xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/projects" className="text-gray-500 hover:text-gray-700">
          <ArrowLeft size={20} />
        </Link>
        <h1 className="text-xl font-bold text-gray-900 truncate">{project.name}</h1>
      </div>

      {/* Budget summary */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <div className="bg-white rounded-xl p-3 border border-gray-100 shadow-sm text-center">
          <p className="text-xs text-gray-500">Budget</p>
          <p className="text-sm font-bold text-gray-900 mt-0.5">{formatFcfa(budgetAdjusted)}</p>
        </div>
        <div className="bg-white rounded-xl p-3 border border-gray-100 shadow-sm text-center">
          <p className="text-xs text-gray-500">Dépensé</p>
          <p className="text-sm font-bold text-gray-900 mt-0.5">{formatFcfa(actualExpenses)}</p>
          <p className="text-xs text-gray-400">{Math.round(consumptionRate * 100)}%</p>
        </div>
        <div className="bg-white rounded-xl p-3 border border-gray-100 shadow-sm text-center">
          <p className="text-xs text-gray-500">Solde</p>
          <p className={`text-sm font-bold mt-0.5 ${difference >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
            {difference >= 0 ? '+' : ''}{formatFcfa(difference)}
          </p>
        </div>
      </div>

      {/* Edit form */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 mb-4">
        <h2 className="text-sm font-semibold text-gray-800 mb-4 flex items-center gap-2">
          <Pencil size={14} /> Informations
        </h2>
        <form action={updateWithId} className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Nom</label>
            <input
              name="name"
              type="text"
              required
              defaultValue={project.name}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Statut</label>
              <select
                name="status"
                defaultValue={project.status}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              >
                {STATUSES.map((s) => (
                  <option key={s} value={s}>{STATUS_LABELS[s]}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Budget initial (FCFA)</label>
              <input
                name="initialBudget"
                type="number"
                min="0"
                defaultValue={project.initialBudget}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Ajustement (FCFA)</label>
              <input
                name="adjustment"
                type="number"
                defaultValue={project.adjustment}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Début</label>
              <input
                name="startDate"
                type="date"
                defaultValue={toDateInput(project.startDate)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Fin prévue</label>
              <input
                name="endDate"
                type="date"
                defaultValue={toDateInput(project.endDate)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
          <button
            type="submit"
            className="w-full py-2 px-4 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
          >
            Enregistrer
          </button>
        </form>
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        <Link
          href={`/projects/${id}/media`}
          className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 bg-white border border-gray-200 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors"
        >
          <Camera size={16} /> Photos ({project.images.length})
        </Link>
        <form action={deleteWithId}>
          <button
            type="submit"
            className="py-2.5 px-4 bg-white border border-red-200 text-red-600 text-sm font-medium rounded-lg hover:bg-red-50 transition-colors"
            onClick={(e) => {
              if (!confirm('Supprimer ce chantier ?')) e.preventDefault()
            }}
          >
            Supprimer
          </button>
        </form>
      </div>
    </main>
  )
}
