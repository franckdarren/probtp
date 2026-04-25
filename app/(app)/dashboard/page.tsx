import { createClient } from '@/lib/supabase/server'
import { db } from '@/lib/db'
import { users, projects } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import Link from 'next/link'
import { BudgetChart } from '@/components/shared/budget-chart'
import { ExpensesBreakdownChart } from '@/components/shared/expenses-breakdown-chart'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Button } from '@/components/ui/button'
import { TrendingUp, Building2, Banknote, Scale, ArrowRight } from 'lucide-react'

function getBudgetStatus(consumptionRate: number, budgetThreshold: number) {
  if (consumptionRate >= budgetThreshold) return { label: 'Dépassé', variant: 'destructive' as const, bar: 'bg-destructive' }
  if (consumptionRate >= 0.80) return { label: 'Alerte', variant: 'warning' as const, bar: 'bg-orange-400' }
  return { label: 'OK', variant: 'success' as const, bar: 'bg-emerald-500' }
}

function formatFcfa(amount: number) {
  return new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(amount) + ' FCFA'
}

const STATUS_LABELS: Record<string, string> = {
  'planifié': 'Planifié',
  'en cours': 'En cours',
  'en pause': 'En pause',
  'terminé': 'Terminé',
  'annulé': 'Annulé',
}

const STATUS_VARIANTS: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  'planifié': 'outline',
  'en cours': 'default',
  'en pause': 'secondary',
  'terminé': 'secondary',
  'annulé': 'destructive',
}

function truncate(s: string, n: number) {
  return s.length > n ? s.slice(0, n) + '…' : s
}

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const dbUser = await db.query.users.findFirst({
    where: eq(users.authId, user!.id),
    with: { company: true },
  })

  const allProjects = await db.query.projects.findMany({
    where: eq(projects.companyId, dbUser!.companyId!),
    with: {
      budgetItems: true,
      laborEntries: true,
      materialEntries: true,
    },
    orderBy: (p, { desc }) => [desc(p.createdAt)],
  })

  const budgetThreshold = parseFloat(dbUser!.company!.budgetThreshold)

  const enriched = allProjects.map((p) => {
    const budgetAdjusted = parseFloat(p.initialBudget) + parseFloat(p.adjustment)
    const expensesBudget = p.budgetItems.reduce((s, b) => s + parseFloat(b.amount), 0)
    const expensesLabor = p.laborEntries.reduce((s, l) => s + parseFloat(l.cost), 0)
    const expensesMaterials = p.materialEntries.reduce((s, m) => s + parseFloat(m.cost), 0)
    const actualExpenses = expensesBudget + expensesLabor + expensesMaterials
    const difference = budgetAdjusted - actualExpenses
    const consumptionRate = budgetAdjusted > 0 ? actualExpenses / budgetAdjusted : 0
    return { ...p, budgetAdjusted, actualExpenses, difference, consumptionRate, expensesBudget, expensesLabor, expensesMaterials }
  })

  const activeProjects = enriched.filter((p) => p.status === 'en cours')
  const totalBudget = enriched.reduce((s, p) => s + p.budgetAdjusted, 0)
  const totalExpenses = enriched.reduce((s, p) => s + p.actualExpenses, 0)
  const totalDifference = totalBudget - totalExpenses

  const totalLaborCost = enriched.reduce((s, p) => s + p.expensesLabor, 0)
  const totalBudgetItemsCost = enriched.reduce((s, p) => s + p.expensesBudget, 0)
  const totalMaterialsCost = enriched.reduce((s, p) => s + p.expensesMaterials, 0)

  const chartData = activeProjects.map((p) => ({
    name: truncate(p.name, 14),
    budget: Math.round(p.budgetAdjusted),
    depenses: Math.round(p.actualExpenses),
  }))

  const consumptionPct = totalBudget > 0 ? Math.round((totalExpenses / totalBudget) * 100) : 0

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          Tableau de bord
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Informations globales de votre entreprise.
        </p>
      </div>
      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Chantiers actifs</p>
                <p className="text-2xl font-bold mt-1">{activeProjects.length}</p>
                <p className="text-xs text-muted-foreground mt-0.5">sur {enriched.length} total</p>
              </div>
              <div className="p-2 bg-primary/10 rounded-lg">
                <Building2 size={16} className="text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Budget total</p>
                <p className="text-base font-bold mt-1 leading-tight">{formatFcfa(totalBudget)}</p>
                <p className="text-xs text-muted-foreground mt-0.5">ajusté</p>
              </div>
              <div className="p-2 bg-primary/10 rounded-lg">
                <Banknote size={16} className="text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Dépenses totales</p>
                <p className="text-base font-bold mt-1 leading-tight">{formatFcfa(totalExpenses)}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{consumptionPct}% consommé</p>
              </div>
              <div className="p-2 bg-orange-100 rounded-lg">
                <TrendingUp size={16} className="text-orange-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Solde</p>
                <p className={`text-base font-bold mt-1 leading-tight ${totalDifference >= 0 ? 'text-emerald-600' : 'text-destructive'}`}>
                  {totalDifference >= 0 ? '+' : ''}{formatFcfa(totalDifference)}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">budget − dépenses</p>
              </div>
              <div className={`p-2 rounded-lg ${totalDifference >= 0 ? 'bg-emerald-100' : 'bg-destructive/10'}`}>
                <Scale size={16} className={totalDifference >= 0 ? 'text-emerald-600' : 'text-destructive'} />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Graphiques */}
      {enriched.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <Card>
            <CardHeader className="pb-2 pt-4 px-4">
              <CardTitle className="text-sm font-semibold">Budget vs Dépenses</CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <BudgetChart data={chartData} />
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2 pt-4 px-4">
              <CardTitle className="text-sm font-semibold">Répartition des dépenses</CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <ExpensesBreakdownChart
                laborTotal={totalLaborCost}
                budgetItemsTotal={totalBudgetItemsCost}
                materialsTotal={totalMaterialsCost}
              />
            </CardContent>
          </Card>
        </div>
      )}

      {/* Chantiers actifs */}
      <Card className="mb-4">
        <CardHeader className="py-3 px-4 border-b">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-semibold">Chantiers actifs</CardTitle>
            <Button variant="ghost" size="sm" asChild className="h-7 text-xs gap-1">
              <Link href="/projects">
                Voir tout <ArrowRight size={12} />
              </Link>
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {activeProjects.length === 0 ? (
            <div className="px-4 py-10 text-center">
              <p className="text-sm text-muted-foreground">Aucun chantier en cours</p>
              <Button variant="link" size="sm" asChild className="mt-2">
                <Link href="/projects">Créer un chantier</Link>
              </Button>
            </div>
          ) : (
            <div className="divide-y">
              {activeProjects.map((p) => {
                const status = getBudgetStatus(p.consumptionRate, budgetThreshold)
                const pct = Math.min(Math.round(p.consumptionRate * 100), 100)
                return (
                  <Link
                    key={p.id}
                    href={`/projects/${p.id}`}
                    className="block px-4 py-3 hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex-1 min-w-0 mr-3">
                        <p className="text-sm font-medium truncate">{p.name}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {formatFcfa(p.actualExpenses)} / {formatFcfa(p.budgetAdjusted)}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <Badge
                          variant={status.variant === 'warning' ? 'outline' : status.variant === 'success' ? 'outline' : 'destructive'}
                          className={
                            status.variant === 'success'
                              ? 'border-emerald-500 text-emerald-700 bg-emerald-50 text-[10px]'
                              : status.variant === 'warning'
                              ? 'border-orange-400 text-orange-700 bg-orange-50 text-[10px]'
                              : 'text-[10px]'
                          }
                        >
                          {status.label}
                        </Badge>
                        <span className="text-xs text-muted-foreground w-8 text-right">{pct}%</span>
                      </div>
                    </div>
                    <Progress value={pct} className={`h-1.5 ${status.bar}`} />
                  </Link>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Autres chantiers */}
      {enriched.filter((p) => p.status !== 'en cours').length > 0 && (
        <Card>
          <CardHeader className="py-3 px-4 border-b">
            <CardTitle className="text-sm font-semibold">Autres chantiers</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y">
              {enriched
                .filter((p) => p.status !== 'en cours')
                .map((p) => {
                  const pct = Math.min(Math.round(p.consumptionRate * 100), 100)
                  const status = getBudgetStatus(p.consumptionRate, budgetThreshold)
                  return (
                    <Link
                      key={p.id}
                      href={`/projects/${p.id}`}
                      className="block px-4 py-3 hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex-1 min-w-0 mr-3">
                          <p className="text-sm font-medium truncate">{p.name}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {formatFcfa(p.actualExpenses)} / {formatFcfa(p.budgetAdjusted)}
                          </p>
                        </div>
                        <Badge variant={STATUS_VARIANTS[p.status]} className="text-[10px] shrink-0">
                          {STATUS_LABELS[p.status]}
                        </Badge>
                      </div>
                      <Progress value={pct} className={`h-1.5 ${status.bar}`} />
                    </Link>
                  )
                })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
