import { createClient } from '@/lib/supabase/server'
import { db } from '@/lib/db'
import { users, projects, materials, materialEntries } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { Trash2 } from 'lucide-react'
import { createMaterial, deleteMaterial, createMaterialEntry, deleteMaterialEntry } from './actions'

function formatFcfa(amount: string | number) {
  return new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(Number(amount)) + ' FCFA'
}

const UNITS = ['kg', 't', 'm³', 'm²', 'm', 'sac', 'barre', 'unité', 'litre', 'lot']

export default async function MaterialsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const dbUser = await db.query.users.findFirst({
    where: eq(users.authId, user!.id),
  })

  const companyId = dbUser!.companyId!

  const [companyProjects, companyMaterials, allEntries] = await Promise.all([
    db.query.projects.findMany({
      where: eq(projects.companyId, companyId),
      orderBy: (p, { asc }) => [asc(p.name)],
    }),
    db.query.materials.findMany({
      where: eq(materials.companyId, companyId),
      orderBy: (m, { asc }) => [asc(m.name)],
    }),
    db.query.materialEntries.findMany({
      with: { project: true, material: true },
      orderBy: (e, { desc }) => [desc(e.date)],
    }),
  ])

  const activeProjects = companyProjects.filter(
    (p) => p.status === 'en cours' || p.status === 'planifié'
  )

  const companyProjectIds = new Set(companyProjects.map((p) => p.id))
  const entries = allEntries.filter((e) => companyProjectIds.has(e.projectId))

  const totalCost = entries.reduce((s, e) => s + parseFloat(e.cost), 0)

  // Grouper les saisies par chantier
  const entriesByProject = companyProjects
    .map((p) => {
      const projectEntries = entries.filter((e) => e.projectId === p.id)
      const projectTotal = projectEntries.reduce((s, e) => s + parseFloat(e.cost), 0)
      return { project: p, entries: projectEntries, total: projectTotal }
    })
    .filter((g) => g.entries.length > 0)

  return (
    <main className="p-4 md:p-6 max-w-3xl mx-auto">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-gray-900">Matériaux</h1>
        <p className="text-sm text-gray-500 mt-0.5">Coût total : {formatFcfa(totalCost)}</p>
      </div>

      {companyMaterials.length === 0 ? (
        <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 mb-6 text-sm text-orange-700">
          Aucun matériau dans le catalogue. Créez votre premier matériau ci-dessous pour commencer la saisie.
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 mb-6">
          <h2 className="text-sm font-semibold text-gray-800 mb-3">Saisir un achat</h2>
          <form action={createMaterialEntry} className="space-y-3">
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
                <label className="block text-xs font-medium text-gray-600 mb-1">Matériau</label>
                <select
                  name="materialId"
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                >
                  <option value="">Matériau...</option>
                  {companyMaterials.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name} ({formatFcfa(m.unitPrice)}/{m.unit})
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Quantité</label>
                <input
                  name="quantity"
                  type="number"
                  min="0.01"
                  step="0.01"
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="10"
                />
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

      {/* Historique par chantier */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden mb-6">
        <div className="px-4 py-3 border-b border-gray-50">
          <h2 className="text-sm font-semibold text-gray-800">Historique par chantier</h2>
        </div>
        {entriesByProject.length === 0 ? (
          <p className="px-4 py-6 text-xs text-gray-400 text-center">Aucune saisie</p>
        ) : (
          <div className="divide-y divide-gray-100">
            {entriesByProject.map(({ project, entries: projectEntries, total }) => (
              <div key={project.id}>
                <div className="px-4 py-2.5 bg-gray-50 flex items-center justify-between">
                  <p className="text-xs font-semibold text-gray-700">{project.name}</p>
                  <p className="text-xs font-semibold text-gray-900">{formatFcfa(total)}</p>
                </div>
                <div className="divide-y divide-gray-50">
                  {projectEntries.map((e) => {
                    const deleteAction = deleteMaterialEntry.bind(null, e.id, e.projectId)
                    return (
                      <div key={e.id} className="flex items-center px-4 py-3">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">{e.material.name}</p>
                          <p className="text-xs text-gray-500">
                            {e.quantity} {e.material.unit} × {formatFcfa(e.unitPrice)}
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
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Catalogue */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-50">
          <h2 className="text-sm font-semibold text-gray-800">Catalogue matériaux</h2>
          <p className="text-xs text-gray-400 mt-0.5">Prix unitaires de référence</p>
        </div>

        {companyMaterials.length > 0 && (
          <div className="divide-y divide-gray-50">
            {companyMaterials.map((m) => {
              const deleteAction = deleteMaterial.bind(null, m.id)
              return (
                <div key={m.id} className="flex items-center px-4 py-3">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900">{m.name}</p>
                    <p className="text-xs text-gray-400">{formatFcfa(m.unitPrice)} / {m.unit}</p>
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
          <form action={createMaterial} className="space-y-2">
            <div className="flex gap-2">
              <input
                name="name"
                type="text"
                required
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Ciment, Sable, Fer..."
              />
              <input
                name="unitPrice"
                type="number"
                min="0"
                step="1"
                required
                className="w-28 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Prix (FCFA)"
              />
            </div>
            <div className="flex gap-2">
              <select
                name="unit"
                required
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              >
                <option value="">Unité...</option>
                {UNITS.map((u) => (
                  <option key={u} value={u}>{u}</option>
                ))}
              </select>
              <button
                type="submit"
                className="px-3 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors shrink-0"
              >
                Ajouter
              </button>
            </div>
          </form>
        </div>
      </div>
    </main>
  )
}
