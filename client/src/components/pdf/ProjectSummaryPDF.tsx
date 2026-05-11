import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';

const S = StyleSheet.create({
  page: { padding: 48, fontFamily: 'Helvetica', fontSize: 10, color: '#1a1a2e', backgroundColor: '#ffffff' },
  header: { marginBottom: 24, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  headerLeft: {},
  title: { fontSize: 20, fontFamily: 'Helvetica-Bold', color: '#4f46e5', marginBottom: 3 },
  subtitle: { fontSize: 10, color: '#64748b' },
  badge: { backgroundColor: '#eef2ff', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 4 },
  badgeText: { fontSize: 9, color: '#4f46e5', fontFamily: 'Helvetica-Bold' },
  statsRow: { flexDirection: 'row', gap: 8, marginBottom: 20 },
  statBox: { flex: 1, backgroundColor: '#f9fafb', borderRadius: 6, padding: 10 },
  statLabel: { fontSize: 8, color: '#6b7280', marginBottom: 3 },
  statValue: { fontSize: 13, fontFamily: 'Helvetica-Bold', color: '#111827' },
  section: { marginBottom: 18 },
  sectionTitle: { fontSize: 11, fontFamily: 'Helvetica-Bold', color: '#374151', marginBottom: 8, paddingBottom: 4, borderBottomWidth: 1, borderBottomColor: '#e5e7eb' },
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  label: { color: '#6b7280' },
  value: { fontFamily: 'Helvetica-Bold', color: '#111827' },
  tableHeader: { flexDirection: 'row', backgroundColor: '#f3f4f6', padding: 6, borderRadius: 4, marginBottom: 2 },
  tableRow: { flexDirection: 'row', paddingVertical: 5, borderBottomWidth: 1, borderBottomColor: '#f9fafb' },
  col1: { width: '30%' },
  col2: { width: '25%' },
  col3: { width: '25%' },
  col4: { width: '20%', textAlign: 'right' },
  colHeader: { fontSize: 8, fontFamily: 'Helvetica-Bold', color: '#6b7280' },
  footer: { position: 'absolute', bottom: 32, left: 48, right: 48, flexDirection: 'row', justifyContent: 'space-between', color: '#9ca3af', fontSize: 8 },
});

function fmt(n: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n || 0);
}
function fmtDate(s: string) {
  if (!s) return '—';
  return new Date(s).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

interface Props {
  project: any;
}

export default function ProjectSummaryPDF({ project }: Props) {
  const date = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  const budgetPct = project.current_budget > 0 ? ((project.actual_spend / project.current_budget) * 100).toFixed(1) : '0';
  const remaining = (project.current_budget || 0) - (project.actual_spend || 0);
  const lineItems: any[] = project.budget_line_items || [];
  const invoices: any[] = project.contractor_invoices || [];

  return (
    <Document title={`${project.name} — Project Summary`}>
      <Page size="LETTER" style={S.page}>
        <View style={S.header}>
          <View style={S.headerLeft}>
            <Text style={S.title}>{project.name}</Text>
            <Text style={S.subtitle}>
              {project.properties?.name ? `${project.properties.name} · ` : ''}
              {project.project_type?.replace(/_/g, ' ')} · Priority: {project.priority}
            </Text>
          </View>
          <View style={S.badge}>
            <Text style={S.badgeText}>{project.status?.replace(/_/g, ' ').toUpperCase()}</Text>
          </View>
        </View>

        <View style={S.statsRow}>
          {[
            { label: 'Initial Budget', value: fmt(project.initial_budget) },
            { label: 'Current Budget', value: fmt(project.current_budget) },
            { label: 'Actual Spend', value: fmt(project.actual_spend) },
            { label: 'Remaining', value: fmt(remaining) },
          ].map((s) => (
            <View key={s.label} style={S.statBox}>
              <Text style={S.statLabel}>{s.label}</Text>
              <Text style={S.statValue}>{s.value}</Text>
            </View>
          ))}
        </View>

        <View style={S.section}>
          <Text style={S.sectionTitle}>Project Details</Text>
          {[
            { label: 'Budget Utilization', value: `${budgetPct}%` },
            { label: 'Start Date', value: fmtDate(project.start_date) },
            { label: 'Target Completion', value: fmtDate(project.target_completion) },
            { label: 'Construction Loan', value: project.has_construction_loan ? 'Yes' : 'No' },
          ].map((d) => (
            <View key={d.label} style={S.row}>
              <Text style={S.label}>{d.label}</Text>
              <Text style={S.value}>{d.value}</Text>
            </View>
          ))}
        </View>

        {lineItems.length > 0 && (
          <View style={S.section}>
            <Text style={S.sectionTitle}>Budget Line Items ({lineItems.length})</Text>
            <View style={S.tableHeader}>
              <Text style={[S.col1, S.colHeader]}>Category</Text>
              <Text style={[S.col2, S.colHeader]}>Status</Text>
              <Text style={[S.col3, S.colHeader]}>Budget</Text>
              <Text style={[S.col4, S.colHeader]}>Actual</Text>
            </View>
            {lineItems.slice(0, 12).map((li, i) => (
              <View key={i} style={S.tableRow}>
                <Text style={S.col1}>{li.category?.replace(/_/g, ' ')}</Text>
                <Text style={S.col2}>{li.status}</Text>
                <Text style={S.col3}>{fmt(li.budgeted_amount)}</Text>
                <Text style={S.col4}>{fmt(li.actual_amount)}</Text>
              </View>
            ))}
          </View>
        )}

        {invoices.length > 0 && (
          <View style={S.section}>
            <Text style={S.sectionTitle}>Invoices ({invoices.length})</Text>
            <View style={S.tableHeader}>
              <Text style={[S.col1, S.colHeader]}>Contractor</Text>
              <Text style={[S.col2, S.colHeader]}>Date</Text>
              <Text style={[S.col3, S.colHeader]}>Status</Text>
              <Text style={[S.col4, S.colHeader]}>Amount</Text>
            </View>
            {invoices.slice(0, 10).map((inv, i) => (
              <View key={i} style={S.tableRow}>
                <Text style={S.col1}>{inv.contractors?.company_name || '—'}</Text>
                <Text style={S.col2}>{fmtDate(inv.invoice_date)}</Text>
                <Text style={S.col3}>{inv.status}</Text>
                <Text style={S.col4}>{fmt(inv.total_amount)}</Text>
              </View>
            ))}
          </View>
        )}

        <View style={S.footer}>
          <Text>BidIQ · Confidential · {project.name}</Text>
          <Text>{date}</Text>
        </View>
      </Page>
    </Document>
  );
}
