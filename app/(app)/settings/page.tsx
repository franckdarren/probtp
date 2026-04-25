import { createClient } from '@/lib/supabase/server'
import { db } from '@/lib/db'
import { users, trades } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { updateCompany, createTrade, deleteTrade } from './actions'
import { DeleteConfirmModal } from '@/components/shared/delete-confirm-modal'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { SubmitButton } from '@/components/ui/submit-button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'

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
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          Paramètres
        </h1>
        {/* <p className="mt-1 text-sm text-muted-foreground">
          Informations globales de votre entreprise.
        </p> */}
      </div>

      {/* Entreprise */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-sm font-semibold">Entreprise</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={updateCompany} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="name">Nom de l&apos;entreprise</Label>
              <Input id="name" name="name" type="text" required defaultValue={company.name} />
            </div>

            <Separator />

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="skilledRate">Taux qualifié (FCFA/j)</Label>
                <Input
                  id="skilledRate"
                  name="skilledRate"
                  type="number"
                  min="0"
                  step="1"
                  required
                  defaultValue={company.skilledRate}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="unskilledRate">Taux non-qualifié (FCFA/j)</Label>
                <Input
                  id="unskilledRate"
                  name="unskilledRate"
                  type="number"
                  min="0"
                  step="1"
                  required
                  defaultValue={company.unskilledRate}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="budgetThreshold">Seuil d&apos;alerte rouge</Label>
              <Input
                id="budgetThreshold"
                name="budgetThreshold"
                type="number"
                min="0.01"
                max="2"
                step="0.01"
                required
                defaultValue={company.budgetThreshold}
              />
              <p className="text-xs text-muted-foreground">
                Ex: 1.00 = 100% — Dépassement signalé en rouge au-delà de ce seuil
              </p>
            </div>

            <SubmitButton className="w-full">Enregistrer</SubmitButton>
          </form>
        </CardContent>
      </Card>

      {/* Métiers */}
      <Card>
        <CardHeader className="pb-0">
          <CardTitle className="text-sm font-semibold">Métiers</CardTitle>
          <p className="text-xs text-muted-foreground mt-0.5">Utilisés pour le calcul des coûts MO</p>
        </CardHeader>
        <CardContent className="p-0 mt-3">
          {companyTrades.length > 0 && (
            <>
              <Separator />
              <div className="divide-y">
                {companyTrades.map((t) => {
                  const deleteAction = deleteTrade.bind(null, t.id)
                  return (
                    <div key={t.id} className="flex items-center px-4 py-3">
                      <div className="flex-1">
                        <p className="text-sm font-medium">{t.name}</p>
                        <p className="text-xs text-muted-foreground">{formatFcfa(t.dailyRate)} / jour</p>
                      </div>
                      <DeleteConfirmModal action={deleteAction} description="Ce métier sera définitivement supprimé." />
                    </div>
                  )
                })}
              </div>
            </>
          )}
          <div className="px-4 py-4 border-t">
            <form action={createTrade} className="flex gap-2">
              <Input
                name="name"
                type="text"
                required
                placeholder="Maçon, Ferrailleur..."
                className="flex-1"
              />
              <Input
                name="dailyRate"
                type="number"
                min="0"
                step="1"
                required
                placeholder="FCFA/j"
                className="w-28"
              />
              <SubmitButton className="shrink-0">Ajouter</SubmitButton>
            </form>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
