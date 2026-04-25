import { db } from '@/lib/db'
import { projects } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { Camera, FileDown, FileSpreadsheet, Pencil } from 'lucide-react'
import { DeleteConfirmModal } from '@/components/shared/delete-confirm-modal'
import { updateProject, deleteProject } from '../actions'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Progress } from '@/components/ui/progress'
import { Separator } from '@/components/ui/separator'

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
  const consumptionPct = Math.min(Math.round(consumptionRate * 100), 100)

  const progressColor =
    consumptionRate >= 1 ? 'bg-destructive' : consumptionRate >= 0.8 ? 'bg-orange-400' : 'bg-emerald-500'
  const progressTextColor =
    consumptionRate >= 1 ? 'text-destructive' : consumptionRate >= 0.8 ? 'text-orange-500' : 'text-emerald-600'

  const updateWithId = updateProject.bind(null, id)
  const deleteWithId = deleteProject.bind(null, id)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          Détails du chantier
        </h1>
        {/* <p className="mt-1 text-sm text-muted-foreground">
          Informations globales de votre entreprise.
        </p> */}
      </div>

      {/* KPIs budget */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        <Card>
          <CardContent className="p-3 text-center">
            <p className="text-xs text-muted-foreground">Budget</p>
            <p className="text-sm font-bold mt-0.5">{formatFcfa(budgetAdjusted)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 text-center">
            <p className="text-xs text-muted-foreground">Dépensé</p>
            <p className="text-sm font-bold mt-0.5">{formatFcfa(actualExpenses)}</p>
            <p className="text-xs text-muted-foreground">{Math.round(consumptionRate * 100)}%</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 text-center">
            <p className="text-xs text-muted-foreground">Solde</p>
            <p className={`text-sm font-bold mt-0.5 ${difference >= 0 ? 'text-emerald-600' : 'text-destructive'}`}>
              {difference >= 0 ? '+' : ''}{formatFcfa(difference)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Barre consommation */}
      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="flex justify-between items-center mb-2">
            <span className="text-xs font-medium text-muted-foreground">Consommation budgétaire</span>
            <span className={`text-xs font-bold ${progressTextColor}`}>{consumptionPct}%</span>
          </div>
          <Progress value={consumptionPct} className={`h-3 mb-4 ${progressColor}`} />

          {actualExpenses > 0 && (
            <>
              <Separator className="mb-3" />
              <p className="text-xs font-medium text-muted-foreground mb-3">Ventilation des dépenses</p>
              <div className="space-y-2.5">
                {expensesBudget > 0 && (
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-purple-500 shrink-0" />
                    <span className="text-xs text-muted-foreground w-32 shrink-0">Dépenses chantier</span>
                    <Progress
                      value={Math.round((expensesBudget / actualExpenses) * 100)}
                      className="flex-1 h-1.5 bg-purple-500"
                    />
                    <span className="text-xs text-muted-foreground w-20 text-right shrink-0">{formatFcfa(expensesBudget)}</span>
                  </div>
                )}
                {expensesLabor > 0 && (
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-primary shrink-0" />
                    <span className="text-xs text-muted-foreground w-32 shrink-0">Main-d&apos;œuvre</span>
                    <Progress
                      value={Math.round((expensesLabor / actualExpenses) * 100)}
                      className="flex-1 h-1.5"
                    />
                    <span className="text-xs text-muted-foreground w-20 text-right shrink-0">{formatFcfa(expensesLabor)}</span>
                  </div>
                )}
                {expensesMaterials > 0 && (
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-amber-500 shrink-0" />
                    <span className="text-xs text-muted-foreground w-32 shrink-0">Matériaux</span>
                    <Progress
                      value={Math.round((expensesMaterials / actualExpenses) * 100)}
                      className="flex-1 h-1.5 bg-amber-500"
                    />
                    <span className="text-xs text-muted-foreground w-20 text-right shrink-0">{formatFcfa(expensesMaterials)}</span>
                  </div>
                )}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Formulaire modification */}
      <Card className="mb-4">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Pencil size={14} /> Informations
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form action={updateWithId} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="name">Nom</Label>
              <Input id="name" name="name" type="text" required defaultValue={project.name} />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="status">Statut</Label>
                <Select name="status" defaultValue={project.status}>
                  <SelectTrigger id="status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUSES.map((s) => (
                      <SelectItem key={s} value={s}>{STATUS_LABELS[s]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="initialBudget">Budget initial (FCFA)</Label>
                <Input
                  id="initialBudget"
                  name="initialBudget"
                  type="number"
                  min="0"
                  defaultValue={project.initialBudget}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="adjustment">Ajustement (FCFA)</Label>
              <Input
                id="adjustment"
                name="adjustment"
                type="number"
                defaultValue={project.adjustment}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="startDate">Début</Label>
                <Input id="startDate" name="startDate" type="date" defaultValue={toDateInput(project.startDate)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="endDate">Fin prévue</Label>
                <Input id="endDate" name="endDate" type="date" defaultValue={toDateInput(project.endDate)} />
              </div>
            </div>

            <Button type="submit" className="w-full">Enregistrer</Button>
          </form>
        </CardContent>
      </Card>

      {/* Export */}
      <div className="grid grid-cols-2 gap-3 mb-3">
        <Button variant="outline" asChild className="gap-2">
          <a href={`/projects/${id}/export?format=pdf`}>
            <FileDown size={16} /> PDF
          </a>
        </Button>
        <Button variant="outline" asChild className="gap-2">
          <a href={`/projects/${id}/export?format=excel`}>
            <FileSpreadsheet size={16} /> Excel
          </a>
        </Button>
      </div>

      {/* Actions */}
      <div className="grid grid-cols-2 gap-3">
        <Button variant="outline" asChild className="gap-2">
          <Link href={`/projects/${id}/media`}>
            <Camera size={16} /> Photos ({project.images.length})
          </Link>
        </Button>
        <DeleteConfirmModal
          action={deleteWithId}
          triggerLabel="Supprimer"
          description="Ce chantier et toutes ses données (budget, main-d'œuvre, photos) seront définitivement supprimés."
        />
      </div>
    </div>
  )
}
