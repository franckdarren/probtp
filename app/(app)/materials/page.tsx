import { createClient } from '@/lib/supabase/server'
import { db } from '@/lib/db'
import { users, projects, materials, materialEntries } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { createMaterial, deleteMaterial, createMaterialEntry, deleteMaterialEntry } from './actions'
import { DeleteConfirmModal } from '@/components/shared/delete-confirm-modal'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { AlertTriangle } from 'lucide-react'

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

  const entriesByProject = companyProjects
    .map((p) => {
      const projectEntries = entries.filter((e) => e.projectId === p.id)
      const projectTotal = projectEntries.reduce((s, e) => s + parseFloat(e.cost), 0)
      return { project: p, entries: projectEntries, total: projectTotal }
    })
    .filter((g) => g.entries.length > 0)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          Gestion des matériaux
        </h1>
        {/* <p className="mt-1 text-sm text-muted-foreground">
          Informations globales de votre entreprise.
        </p> */}
      </div>
      <div className="mb-6">
        <p className="text-sm text-muted-foreground">Coût total : {formatFcfa(totalCost)}</p>
      </div>

      {companyMaterials.length === 0 ? (
        <Alert className="mb-6 border-orange-200 bg-orange-50 text-orange-800">
          <AlertTriangle size={16} className="text-orange-600" />
          <AlertDescription>
            Aucun matériau dans le catalogue. Créez votre premier matériau ci-dessous pour commencer la saisie.
          </AlertDescription>
        </Alert>
      ) : (
        <Card className="mb-6">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold">Saisir un achat</CardTitle>
          </CardHeader>
          <CardContent>
            <form action={createMaterialEntry} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="projectId">Chantier</Label>
                  <Select name="projectId" required>
                    <SelectTrigger id="projectId">
                      <SelectValue placeholder="Chantier..." />
                    </SelectTrigger>
                    <SelectContent>
                      {activeProjects.map((p) => (
                        <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="materialId">Matériau</Label>
                  <Select name="materialId" required>
                    <SelectTrigger id="materialId">
                      <SelectValue placeholder="Matériau..." />
                    </SelectTrigger>
                    <SelectContent>
                      {companyMaterials.map((m) => (
                        <SelectItem key={m.id} value={m.id}>
                          {m.name} ({formatFcfa(m.unitPrice)}/{m.unit})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="quantity">Quantité</Label>
                  <Input id="quantity" name="quantity" type="number" min="0.01" step="0.01" required placeholder="10" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="date">Date</Label>
                  <Input
                    id="date"
                    name="date"
                    type="date"
                    defaultValue={new Date().toISOString().split('T')[0]}
                  />
                </div>
              </div>
              <Button type="submit" className="w-full">Enregistrer</Button>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Historique par chantier */}
      <Card className="mb-6">
        <CardHeader className="py-3 px-4 border-b">
          <CardTitle className="text-sm font-semibold">Historique par chantier</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {entriesByProject.length === 0 ? (
            <p className="px-4 py-8 text-xs text-muted-foreground text-center">Aucune saisie</p>
          ) : (
            <div className="divide-y">
              {entriesByProject.map(({ project, entries: projectEntries, total }) => (
                <div key={project.id}>
                  <div className="px-4 py-2.5 bg-muted/50 flex items-center justify-between">
                    <p className="text-xs font-semibold">{project.name}</p>
                    <p className="text-xs font-semibold">{formatFcfa(total)}</p>
                  </div>
                  <div className="divide-y">
                    {projectEntries.map((e) => {
                      const deleteAction = deleteMaterialEntry.bind(null, e.id, e.projectId)
                      return (
                        <div key={e.id} className="flex items-center px-4 py-3">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{e.material.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {e.quantity} {e.material.unit} × {formatFcfa(e.unitPrice)}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {new Date(e.date).toLocaleDateString('fr-FR')}
                            </p>
                          </div>
                          <p className="text-sm font-semibold mr-3">{formatFcfa(e.cost)}</p>
                          <DeleteConfirmModal action={deleteAction} description="Cet achat matériau sera définitivement supprimé." />
                        </div>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Catalogue */}
      <Card>
        <CardHeader className="py-3 px-4 border-b">
          <div>
            <CardTitle className="text-sm font-semibold">Catalogue matériaux</CardTitle>
            <p className="text-xs text-muted-foreground mt-0.5">Prix unitaires de référence</p>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {companyMaterials.length > 0 && (
            <div className="divide-y">
              {companyMaterials.map((m) => {
                const deleteAction = deleteMaterial.bind(null, m.id)
                return (
                  <div key={m.id} className="flex items-center px-4 py-3">
                    <div className="flex-1">
                      <p className="text-sm font-medium">{m.name}</p>
                      <p className="text-xs text-muted-foreground">{formatFcfa(m.unitPrice)} / {m.unit}</p>
                    </div>
                    <DeleteConfirmModal action={deleteAction} description="Ce matériau et toutes ses saisies seront définitivement supprimés." />
                  </div>
                )
              })}
            </div>
          )}
          <div className="px-4 py-4 border-t">
            <form action={createMaterial} className="space-y-3">
              <div className="flex gap-2">
                <Input name="name" type="text" required placeholder="Ciment, Sable, Fer..." className="flex-1" />
                <Input
                  name="unitPrice"
                  type="number"
                  min="0"
                  step="1"
                  required
                  placeholder="Prix FCFA"
                  className="w-28"
                />
              </div>
              <div className="flex gap-2">
                <Select name="unit" required>
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="Unité..." />
                  </SelectTrigger>
                  <SelectContent>
                    {UNITS.map((u) => (
                      <SelectItem key={u} value={u}>{u}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button type="submit" className="shrink-0">Ajouter</Button>
              </div>
            </form>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
