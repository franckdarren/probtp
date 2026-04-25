import { createClient } from '@/lib/supabase/server'
import { db } from '@/lib/db'
import { users, projects, trades, laborEntries } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { createLaborEntry, deleteLaborEntry } from './actions'
import { DeleteConfirmModal } from '@/components/shared/delete-confirm-modal'
import Link from 'next/link'
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

  const companyProjectIds = new Set(companyProjects.map((p) => p.id))
  const entries = allEntries.filter((e) => companyProjectIds.has(e.projectId))

  const totalCost = entries.reduce((s, e) => s + parseFloat(e.cost), 0)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          Gestion du personnel
        </h1>
        {/* <p className="mt-1 text-sm text-muted-foreground">
          Informations globales de votre entreprise.
        </p> */}
      </div>
      <div className="mb-6">
        <p className="text-sm text-muted-foreground">Coût total : {formatFcfa(totalCost)}</p>
      </div>

      {companyTrades.length === 0 ? (
        <Alert className="mb-6 border-orange-200 bg-orange-50 text-orange-800">
          <AlertTriangle size={16} className="text-orange-600" />
          <AlertDescription>
            Aucun métier configuré.{' '}
            <Link href="/settings" className="font-semibold underline">
              Créer des métiers dans les paramètres
            </Link>{' '}
            pour saisir la main-d&apos;œuvre.
          </AlertDescription>
        </Alert>
      ) : (
        <Card className="mb-6">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold">Saisir des jours travaillés</CardTitle>
          </CardHeader>
          <CardContent>
            <form action={createLaborEntry} className="space-y-4">
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
                  <Label htmlFor="tradeId">Métier</Label>
                  <Select name="tradeId" required>
                    <SelectTrigger id="tradeId">
                      <SelectValue placeholder="Métier..." />
                    </SelectTrigger>
                    <SelectContent>
                      {companyTrades.map((t) => (
                        <SelectItem key={t.id} value={t.id}>
                          {t.name} ({formatFcfa(t.dailyRate)}/j)
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="workerId">Ouvrier</Label>
                  <Input id="workerId" name="workerId" type="text" required placeholder="Nom ou ID" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="daysWorked">Jours travaillés</Label>
                  <Input id="daysWorked" name="daysWorked" type="number" min="0.5" step="0.5" required placeholder="1" />
                </div>
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
              <Button type="submit" className="w-full">Enregistrer</Button>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Historique */}
      <Card>
        <CardHeader className="py-3 px-4 border-b">
          <CardTitle className="text-sm font-semibold">Historique</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {entries.length === 0 ? (
            <p className="px-4 py-8 text-xs text-muted-foreground text-center">Aucune saisie</p>
          ) : (
            <div className="divide-y">
              {entries.map((e) => {
                const deleteAction = deleteLaborEntry.bind(null, e.id, e.projectId)
                return (
                  <div key={e.id} className="flex items-center px-4 py-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{e.workerId}</p>
                      <p className="text-xs text-muted-foreground">
                        {e.trade.name} · {e.daysWorked}j · {e.project.name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(e.date).toLocaleDateString('fr-FR')}
                      </p>
                    </div>
                    <p className="text-sm font-semibold mr-3">
                      {formatFcfa(e.cost)}
                    </p>
                    <DeleteConfirmModal action={deleteAction} description="Cette saisie main-d'œuvre sera définitivement supprimée." />
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
