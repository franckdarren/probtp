import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer'

type BudgetItemData = { id: string; label: string; amount: string }
type LaborEntryData = {
  id: string
  workerId: string
  daysWorked: string
  cost: string
  date: Date
  trade: { name: string }
}
type MaterialEntryData = {
  id: string
  quantity: string
  unitPrice: string
  cost: string
  date: Date
  material: { name: string; unit: string }
}

export type ProjectReportProps = {
  companyName: string
  projectName: string
  projectStatus: string
  startDate: Date | null
  endDate: Date | null
  budgetAdjusted: number
  actualExpenses: number
  difference: number
  consumptionRate: number
  expensesBudget: number
  expensesLabor: number
  expensesMaterials: number
  budgetItems: BudgetItemData[]
  laborEntries: LaborEntryData[]
  materialEntries: MaterialEntryData[]
  generatedAt: Date
}

const STATUS_LABELS: Record<string, string> = {
  'planifié': 'Planifié',
  'en cours': 'En cours',
  'en pause': 'En pause',
  'terminé': 'Terminé',
  'annulé': 'Annulé',
}

function fmtFcfa(n: number) {
  return new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(n) + ' FCFA'
}

function fmtDate(d: Date | null) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('fr-FR')
}

const s = StyleSheet.create({
  page: { fontFamily: 'Helvetica', fontSize: 10, padding: 36, color: '#1f2937', backgroundColor: '#ffffff' },
  companyLabel: { fontSize: 8, color: '#6b7280' },
  title: { fontSize: 20, fontFamily: 'Helvetica-Bold', color: '#111827', marginTop: 6, marginBottom: 4 },
  metaRow: { flexDirection: 'row', gap: 16 },
  metaItem: { fontSize: 9, color: '#6b7280' },
  metaBold: { fontFamily: 'Helvetica-Bold', color: '#374151' },
  divider: { height: 1, backgroundColor: '#e5e7eb', marginVertical: 14 },
  kpiRow: { flexDirection: 'row', gap: 8, marginBottom: 14 },
  kpiCard: { flex: 1, backgroundColor: '#f9fafb', borderRadius: 6, padding: 10 },
  kpiLabel: { fontSize: 8, color: '#6b7280' },
  kpiValue: { fontSize: 13, fontFamily: 'Helvetica-Bold', color: '#111827', marginTop: 3 },
  progressLabel: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  progressLabelText: { fontSize: 9, color: '#4b5563' },
  progressBg: { height: 8, backgroundColor: '#e5e7eb', borderRadius: 4, marginBottom: 14 },
  sectionTitle: { fontSize: 12, fontFamily: 'Helvetica-Bold', color: '#111827', marginBottom: 8 },
  tableHeader: { flexDirection: 'row', backgroundColor: '#f3f4f6', paddingVertical: 6, paddingHorizontal: 8, borderRadius: 4, marginBottom: 2 },
  tableRow: { flexDirection: 'row', paddingVertical: 5, paddingHorizontal: 8, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  totalRow: { flexDirection: 'row', paddingVertical: 5, paddingHorizontal: 8, backgroundColor: '#f9fafb' },
  th: { fontFamily: 'Helvetica-Bold', fontSize: 9, color: '#374151' },
  td: { fontSize: 9, color: '#1f2937' },
  footer: { position: 'absolute', bottom: 20, left: 36, right: 36, flexDirection: 'row', justifyContent: 'space-between' },
  footerText: { fontSize: 8, color: '#9ca3af' },
})

export function ProjectReport(p: ProjectReportProps) {
  const pct = Math.min(p.consumptionRate * 100, 100)
  const barColor = p.consumptionRate >= 1 ? '#ef4444' : p.consumptionRate >= 0.8 ? '#f97316' : '#10b981'

  return (
    <Document>
      <Page size="A4" style={s.page}>
        {/* Header */}
        <Text style={s.companyLabel}>{p.companyName.toUpperCase()}</Text>
        <Text style={s.title}>{p.projectName}</Text>
        <View style={s.metaRow}>
          <Text style={s.metaItem}>
            Statut : <Text style={s.metaBold}>{STATUS_LABELS[p.projectStatus] ?? p.projectStatus}</Text>
          </Text>
          {p.startDate && (
            <Text style={s.metaItem}>
              Début : <Text style={s.metaBold}>{fmtDate(p.startDate)}</Text>
            </Text>
          )}
          {p.endDate && (
            <Text style={s.metaItem}>
              Fin prévue : <Text style={s.metaBold}>{fmtDate(p.endDate)}</Text>
            </Text>
          )}
        </View>

        <View style={s.divider} />

        {/* KPIs */}
        <View style={s.kpiRow}>
          <View style={s.kpiCard}>
            <Text style={s.kpiLabel}>Budget ajusté</Text>
            <Text style={s.kpiValue}>{fmtFcfa(p.budgetAdjusted)}</Text>
          </View>
          <View style={s.kpiCard}>
            <Text style={s.kpiLabel}>Dépenses</Text>
            <Text style={s.kpiValue}>{fmtFcfa(p.actualExpenses)}</Text>
          </View>
          <View style={s.kpiCard}>
            <Text style={s.kpiLabel}>Solde</Text>
            <Text style={{ ...s.kpiValue, color: p.difference >= 0 ? '#059669' : '#dc2626' }}>
              {p.difference >= 0 ? '+' : ''}{fmtFcfa(p.difference)}
            </Text>
          </View>
        </View>

        {/* Barre de consommation */}
        <View style={s.progressLabel}>
          <Text style={s.progressLabelText}>Consommation budgétaire</Text>
          <Text style={{ ...s.progressLabelText, fontFamily: 'Helvetica-Bold', color: barColor }}>
            {Math.round(pct)}%
          </Text>
        </View>
        <View style={s.progressBg}>
          <View style={{ height: 8, width: `${pct}%`, backgroundColor: barColor, borderRadius: 4 }} />
        </View>

        <View style={s.divider} />

        {/* Postes budgétaires */}
        <Text style={s.sectionTitle}>Postes budgétaires</Text>
        {p.budgetItems.length === 0 ? (
          <Text style={{ fontSize: 9, color: '#9ca3af', marginBottom: 14 }}>Aucun poste enregistré</Text>
        ) : (
          <>
            <View style={s.tableHeader}>
              <Text style={{ ...s.th, flex: 1 }}>Libellé</Text>
              <Text style={{ ...s.th, width: 110, textAlign: 'right' }}>Montant</Text>
            </View>
            {p.budgetItems.map((item) => (
              <View key={item.id} style={s.tableRow}>
                <Text style={{ ...s.td, flex: 1 }}>{item.label}</Text>
                <Text style={{ ...s.td, width: 110, textAlign: 'right' }}>{fmtFcfa(parseFloat(item.amount))}</Text>
              </View>
            ))}
            <View style={s.totalRow}>
              <Text style={{ ...s.td, flex: 1, fontFamily: 'Helvetica-Bold' }}>Total postes</Text>
              <Text style={{ ...s.td, width: 110, textAlign: 'right', fontFamily: 'Helvetica-Bold' }}>
                {fmtFcfa(p.expensesBudget)}
              </Text>
            </View>
          </>
        )}

        <View style={s.divider} />

        {/* Main-d'œuvre */}
        <Text style={s.sectionTitle}>{"Main-d'œuvre"}</Text>
        {p.laborEntries.length === 0 ? (
          <Text style={{ fontSize: 9, color: '#9ca3af', marginBottom: 14 }}>Aucune saisie enregistrée</Text>
        ) : (
          <>
            <View style={s.tableHeader}>
              <Text style={{ ...s.th, flex: 2 }}>Ouvrier</Text>
              <Text style={{ ...s.th, flex: 1 }}>Métier</Text>
              <Text style={{ ...s.th, width: 36 }}>Jours</Text>
              <Text style={{ ...s.th, width: 64 }}>Date</Text>
              <Text style={{ ...s.th, width: 90, textAlign: 'right' }}>Coût</Text>
            </View>
            {p.laborEntries.map((entry) => (
              <View key={entry.id} style={s.tableRow}>
                <Text style={{ ...s.td, flex: 2 }}>{entry.workerId}</Text>
                <Text style={{ ...s.td, flex: 1 }}>{entry.trade.name}</Text>
                <Text style={{ ...s.td, width: 36 }}>{entry.daysWorked}j</Text>
                <Text style={{ ...s.td, width: 64 }}>{fmtDate(entry.date)}</Text>
                <Text style={{ ...s.td, width: 90, textAlign: 'right' }}>{fmtFcfa(parseFloat(entry.cost))}</Text>
              </View>
            ))}
            <View style={s.totalRow}>
              <Text style={{ ...s.td, flex: 2, fontFamily: 'Helvetica-Bold' }}>{"Total main-d'œuvre"}</Text>
              <Text style={{ ...s.td, flex: 1 }} />
              <Text style={{ ...s.td, width: 36 }} />
              <Text style={{ ...s.td, width: 64 }} />
              <Text style={{ ...s.td, width: 90, textAlign: 'right', fontFamily: 'Helvetica-Bold' }}>
                {fmtFcfa(p.expensesLabor)}
              </Text>
            </View>
          </>
        )}

        <View style={s.divider} />

        {/* Matériaux */}
        <Text style={s.sectionTitle}>Matériaux</Text>
        {p.materialEntries.length === 0 ? (
          <Text style={{ fontSize: 9, color: '#9ca3af', marginBottom: 14 }}>Aucun achat enregistré</Text>
        ) : (
          <>
            <View style={s.tableHeader}>
              <Text style={{ ...s.th, flex: 2 }}>Matériau</Text>
              <Text style={{ ...s.th, flex: 1 }}>Qté / Unité</Text>
              <Text style={{ ...s.th, width: 64 }}>Date</Text>
              <Text style={{ ...s.th, width: 100, textAlign: 'right' }}>Coût</Text>
            </View>
            {p.materialEntries.map((entry) => (
              <View key={entry.id} style={s.tableRow}>
                <Text style={{ ...s.td, flex: 2 }}>{entry.material.name}</Text>
                <Text style={{ ...s.td, flex: 1 }}>{entry.quantity} {entry.material.unit}</Text>
                <Text style={{ ...s.td, width: 64 }}>{fmtDate(entry.date)}</Text>
                <Text style={{ ...s.td, width: 100, textAlign: 'right' }}>{fmtFcfa(parseFloat(entry.cost))}</Text>
              </View>
            ))}
            <View style={s.totalRow}>
              <Text style={{ ...s.td, flex: 2, fontFamily: 'Helvetica-Bold' }}>Total matériaux</Text>
              <Text style={{ ...s.td, flex: 1 }} />
              <Text style={{ ...s.td, width: 64 }} />
              <Text style={{ ...s.td, width: 100, textAlign: 'right', fontFamily: 'Helvetica-Bold' }}>
                {fmtFcfa(p.expensesMaterials)}
              </Text>
            </View>
          </>
        )}

        {/* Footer */}
        <View style={s.footer}>
          <Text style={s.footerText}>Rapport généré le {fmtDate(p.generatedAt)}</Text>
          <Text style={s.footerText}>{p.companyName}</Text>
        </View>
      </Page>
    </Document>
  )
}
