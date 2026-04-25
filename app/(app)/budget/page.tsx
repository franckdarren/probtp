import { createClient } from '@/lib/supabase/server'
import { db } from '@/lib/db'
import { users, projects } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { createBudgetItem, deleteBudgetItem } from './actions'
import { DeleteConfirmModal } from '@/components/shared/delete-confirm-modal'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { SubmitButton } from '@/components/ui/submit-button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

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
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          Gestion des budgets
        </h1>
        {/* <p className="mt-1 text-sm text-muted-foreground">
          Informations globales de votre entreprise.
        </p> */}
      </div>
      {/* Formulaire ajout */}
      <Card className="mb-6">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold">Ajouter une dépense</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={createBudgetItem} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="projectId">Chantier</Label>
              <Select name="projectId" required>
                <SelectTrigger id="projectId">
                  <SelectValue placeholder="Sélectionner un chantier" />
                </SelectTrigger>
                <SelectContent>
                  {activeProjects.map((p) => (
                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="label">Libellé</Label>
                <Input id="label" name="label" type="text" required placeholder="Béton, Ferraillage..." />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="amount">Montant (FCFA)</Label>
                <Input id="amount" name="amount" type="number" min="0" step="1" required placeholder="0" />
              </div>
            </div>
            <SubmitButton className="w-full">Ajouter</SubmitButton>
          </form>
        </CardContent>
      </Card>

      {/* Liste par chantier */}
      <div className="space-y-4">
        {companyProjects.map((p) => {
          const total = p.budgetItems.reduce((s, b) => s + parseFloat(b.amount), 0)
          const budgetAdjusted = parseFloat(p.initialBudget) + parseFloat(p.adjustment)
          return (
            <Card key={p.id}>
              <CardHeader className="py-3 px-4 border-b">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-sm font-semibold">{p.name}</CardTitle>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {formatFcfa(total)} dépensé / budget {formatFcfa(budgetAdjusted)}
                    </p>
                  </div>
                  {budgetAdjusted > 0 && (
                    <span className="text-xs font-semibold text-muted-foreground">
                      {Math.round((total / budgetAdjusted) * 100)}%
                    </span>
                  )}
                </div>
              </CardHeader>
              <CardContent className="p-0">
                {p.budgetItems.length === 0 ? (
                  <p className="px-4 py-4 text-xs text-muted-foreground">Aucune dépense saisie</p>
                ) : (
                  <div className="divide-y">
                    {p.budgetItems.map((item) => {
                      const deleteAction = deleteBudgetItem.bind(null, item.id, p.id)
                      return (
                        <div key={item.id} className="flex items-center px-4 py-3">
                          <div className="flex-1">
                            <p className="text-sm font-medium">{item.label}</p>
                            <p className="text-xs text-muted-foreground">
                              {new Date(item.createdAt).toLocaleDateString('fr-FR')}
                            </p>
                          </div>
                          <p className="text-sm font-semibold mr-3">
                            {formatFcfa(item.amount)}
                          </p>
                          <DeleteConfirmModal action={deleteAction} description="Ce poste budgétaire sera définitivement supprimé." />
                        </div>
                      )
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
