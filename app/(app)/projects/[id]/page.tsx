import { db } from '@/lib/db'
import { projects } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Camera, FileDown, FileSpreadsheet, Pencil } from 'lucide-react'
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
      materialEntries: { with: { material: true } },
      images: true,
    },
  })

  if (!project) notFound()

  const budgetAdjusted = parseFloat(project.initialBudget) + parseFloat(project.adjustment)
  const expensesBudget = project.budgetItems.reduce((s, b) => s + parseFloat(b.amount), 0)
  const expensesLabor = project.laborEntries.reduce((s, l) => s + parseFloat(l.cost), 0)
  const expensesMaterials = project.materialEntries.reduce((s, m) => s + parseFloat(m.cost), 0)
  const actualExpenses = expensesBudget + expensesLabor + expensesMaterials
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
      <div className="grid grid-cols-3 gap-3 mb-3">
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

      {/* Barre de consommation */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 mb-6">
        <div className="flex justify-between items-center mb-2">
          <span className="text-xs font-medium text-gray-600">Consommation budgétaire</span>
          <span className={`text-xs font-bold ${consumptionRate >= 1 ? 'text-red-600' : consumptionRate >= 0.8 ? 'text-orange-500' : 'text-emerald-600'}`}>
            {Math.round(consumptionRate * 100)}%
          </span>
        </div>
        <div className="h-3 bg-gray-100 rounded-full overflow-hidden mb-4">
          <div
            className={`h-full rounded-full transition-all ${consumptionRate >= 1 ? 'bg-red-500' : consumptionRate >= 0.8 ? 'bg-orange-400' : 'bg-emerald-500'}`}
            style={{ width: `${Math.min(consumptionRate * 100, 100)}%` }}
          />
        </div>

        {/* Ventilation dépenses */}
        {actualExpenses > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-medium text-gray-500 mb-1">Ventilation des dépenses</p>
            {expensesBudget > 0 && (
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-purple-500 shrink-0" />
                <span className="text-xs text-gray-600 w-32 shrink-0">Dépenses chantier</span>
                <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-purple-500 rounded-full"
                    style={{ width: `${Math.round((expensesBudget / actualExpenses) * 100)}%` }}
                  />
                </div>
                <span className="text-xs text-gray-500 w-20 text-right shrink-0">{formatFcfa(expensesBudget)}</span>
              </div>
            )}
            {expensesLabor > 0 && (
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-blue-500 shrink-0" />
                <span className="text-xs text-gray-600 w-32 shrink-0">Main-d&apos;œuvre</span>
                <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-blue-500 rounded-full"
                    style={{ width: `${Math.round((expensesLabor / actualExpenses) * 100)}%` }}
                  />
                </div>
                <span className="text-xs text-gray-500 w-20 text-right shrink-0">{formatFcfa(expensesLabor)}</span>
              </div>
            )}
            {expensesMaterials > 0 && (
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-amber-500 shrink-0" />
                <span className="text-xs text-gray-600 w-32 shrink-0">Matériaux</span>
                <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-amber-500 rounded-full"
                    style={{ width: `${Math.round((expensesMaterials / actualExpenses) * 100)}%` }}
                  />
                </div>
                <span className="text-xs text-gray-500 w-20 text-right shrink-0">{formatFcfa(expensesMaterials)}</span>
              </div>
            )}
          </div>
        )}
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

      {/* Export */}
      <div className="flex gap-3 mb-3">
        <a
          href={`/projects/${id}/export?format=pdf`}
          className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 bg-white border border-gray-200 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors"
        >
          <FileDown size={16} /> PDF
        </a>
        <a
          href={`/projects/${id}/export?format=excel`}
          className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 bg-white border border-gray-200 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors"
        >
          <FileSpreadsheet size={16} /> Excel
        </a>
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
