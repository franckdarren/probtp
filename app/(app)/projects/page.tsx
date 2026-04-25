import { createClient } from '@/lib/supabase/server'
import { db } from '@/lib/db'
import { users, projects } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import Link from 'next/link'
import { ChevronRight } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { NewProjectModal } from '@/components/shared/new-project-modal'

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
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          Liste des chantiers
        </h1>
        {/* <p className="mt-1 text-sm text-muted-foreground">
          Informations globales de votre entreprise.
        </p> */}
      </div>
      <div className="flex items-center justify-between mb-6">
        <p className="text-sm text-muted-foreground">{enriched.length} chantier{enriched.length > 1 ? 's' : ''}</p>
        <NewProjectModal />
      </div>

      {enriched.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <p className="text-sm text-muted-foreground mb-3">Aucun chantier pour le moment</p>
            <NewProjectModal label="Créer votre premier chantier" variant="outline" />
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {enriched.map((p) => (
            <Card key={p.id} className="hover:bg-muted/30 transition-colors cursor-pointer">
              <Link href={`/projects/${p.id}`} className="block">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold truncate">{p.name}</p>
                      <div className="flex items-center gap-3 mt-1">
                        <p className="text-xs text-muted-foreground">
                          {formatFcfa(p.actualExpenses)} / {formatFcfa(p.budgetAdjusted)}
                        </p>
                        {p.startDate && (
                          <p className="text-xs text-muted-foreground">
                            {new Date(p.startDate).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Badge variant={STATUS_VARIANTS[p.status]} className="text-[10px]">
                        {STATUS_LABELS[p.status]}
                      </Badge>
                      <ChevronRight size={14} className="text-muted-foreground" />
                    </div>
                  </div>
                </CardContent>
              </Link>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
