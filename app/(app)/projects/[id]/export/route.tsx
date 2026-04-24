import { createClient } from '@/lib/supabase/server'
import { db } from '@/lib/db'
import { users, projects } from '@/lib/db/schema'
import { eq, and } from 'drizzle-orm'
import { renderToBuffer } from '@react-pdf/renderer'
import * as XLSX from 'xlsx'
import { ProjectReport } from '@/lib/pdf/project-report'
import { createElement } from 'react'

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const format = new URL(req.url).searchParams.get('format') ?? 'pdf'

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return new Response('Non autorisé', { status: 401 })

  const dbUser = await db.query.users.findFirst({
    where: eq(users.authId, user.id),
    with: { company: true },
  })
  if (!dbUser?.companyId) return new Response('Non autorisé', { status: 401 })

  const project = await db.query.projects.findFirst({
    where: and(eq(projects.id, id), eq(projects.companyId, dbUser.companyId)),
    with: {
      budgetItems: { orderBy: (b, { asc }) => [asc(b.createdAt)] },
      laborEntries: {
        with: { trade: true },
        orderBy: (l, { desc }) => [desc(l.date)],
      },
      materialEntries: {
        with: { material: true },
        orderBy: (m, { desc }) => [desc(m.date)],
      },
    },
  })
  if (!project) return new Response('Chantier introuvable', { status: 404 })

  const budgetAdjusted = parseFloat(project.initialBudget) + parseFloat(project.adjustment)
  const expensesBudget = project.budgetItems.reduce((s, b) => s + parseFloat(b.amount), 0)
  const expensesLabor = project.laborEntries.reduce((s, l) => s + parseFloat(l.cost), 0)
  const expensesMaterials = project.materialEntries.reduce((s, m) => s + parseFloat(m.cost), 0)
  const actualExpenses = expensesBudget + expensesLabor + expensesMaterials
  const difference = budgetAdjusted - actualExpenses
  const consumptionRate = budgetAdjusted > 0 ? actualExpenses / budgetAdjusted : 0

  const safeName = project.name.replace(/[^a-zA-Z0-9\-_]/g, '_')
  const fmtDate = (d: Date | null) => d ? new Date(d).toLocaleDateString('fr-FR') : '—'

  if (format === 'excel') {
    const wb = XLSX.utils.book_new()

    const summaryRows = [
      ['Chantier', project.name],
      ['Statut', project.status],
      ['Date début', fmtDate(project.startDate)],
      ['Date fin prévue', fmtDate(project.endDate)],
      [],
      ['Budget ajusté (FCFA)', budgetAdjusted],
      ['Dépenses totales (FCFA)', actualExpenses],
      ['Solde (FCFA)', difference],
      ['Taux de consommation', `${Math.round(consumptionRate * 100)}%`],
      [],
      ['Dépenses chantier (FCFA)', expensesBudget],
      ["Main-d'œuvre (FCFA)", expensesLabor],
      ['Matériaux (FCFA)', expensesMaterials],
      [],
      ['Généré le', fmtDate(new Date())],
    ]
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(summaryRows), 'Résumé')

    const budgetRows = [
      ['Libellé', 'Montant (FCFA)'],
      ...project.budgetItems.map((b) => [b.label, parseFloat(b.amount)]),
      [],
      ['Total', expensesBudget],
    ]
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(budgetRows), 'Postes budgétaires')

    const laborRows = [
      ['Ouvrier', 'Métier', 'Jours travaillés', 'Date', 'Coût (FCFA)'],
      ...project.laborEntries.map((l) => [
        l.workerId,
        l.trade.name,
        parseFloat(l.daysWorked),
        fmtDate(l.date),
        parseFloat(l.cost),
      ]),
      [],
      ["Total main-d'œuvre", '', '', '', expensesLabor],
    ]
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(laborRows), "Main-d'oeuvre")

    const materialsRows = [
      ['Matériau', 'Unité', 'Quantité', 'Prix unitaire (FCFA)', 'Date', 'Coût (FCFA)'],
      ...project.materialEntries.map((m) => [
        m.material.name,
        m.material.unit,
        parseFloat(m.quantity),
        parseFloat(m.unitPrice),
        fmtDate(m.date),
        parseFloat(m.cost),
      ]),
      [],
      ['Total matériaux', '', '', '', '', expensesMaterials],
    ]
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(materialsRows), 'Matériaux')

    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }) as Uint8Array

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return new Response(buffer as any, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="rapport-${safeName}.xlsx"`,
      },
    })
  }

  // PDF
  const element = createElement(ProjectReport, {
    companyName: dbUser.company!.name,
    projectName: project.name,
    projectStatus: project.status,
    startDate: project.startDate,
    endDate: project.endDate,
    budgetAdjusted,
    actualExpenses,
    difference,
    consumptionRate,
    expensesBudget,
    expensesLabor,
    expensesMaterials,
    budgetItems: project.budgetItems,
    laborEntries: project.laborEntries,
    materialEntries: project.materialEntries,
    generatedAt: new Date(),
  })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const buffer = await renderToBuffer(element as any)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return new Response(buffer as any, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="rapport-${safeName}.pdf"`,
    },
  })
}
