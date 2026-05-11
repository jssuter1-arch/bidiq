import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';
import type { Scenario, Constraint } from '@/types/scenarios';

const S = StyleSheet.create({
  page: { padding: 48, fontFamily: 'Helvetica', fontSize: 10, color: '#1a1a2e', backgroundColor: '#ffffff' },
  header: { marginBottom: 24, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  title: { fontSize: 20, fontFamily: 'Helvetica-Bold', color: '#4f46e5', marginBottom: 3 },
  subtitle: { fontSize: 10, color: '#64748b' },
  badge: { backgroundColor: '#eef2ff', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 4 },
  badgeText: { fontSize: 9, color: '#4f46e5', fontFamily: 'Helvetica-Bold' },
  statsRow: { flexDirection: 'row', gap: 8, marginBottom: 20 },
  statBox: { flex: 1, backgroundColor: '#f9fafb', borderRadius: 6, padding: 10 },
  statLabel: { fontSize: 8, color: '#6b7280', marginBottom: 3 },
  statValue: { fontSize: 13, fontFamily: 'Helvetica-Bold', color: '#111827' },
  statOk: { color: '#16a34a' },
  statBad: { color: '#dc2626' },
  section: { marginBottom: 18 },
  sectionTitle: { fontSize: 11, fontFamily: 'Helvetica-Bold', color: '#374151', marginBottom: 8, paddingBottom: 4, borderBottomWidth: 1, borderBottomColor: '#e5e7eb' },
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  label: { color: '#6b7280' },
  value: { fontFamily: 'Helvetica-Bold', color: '#111827' },
  tableHeader: { flexDirection: 'row', backgroundColor: '#f3f4f6', padding: 6, borderRadius: 4, marginBottom: 2 },
  tableRow: { flexDirection: 'row', paddingVertical: 5, borderBottomWidth: 1, borderBottomColor: '#f9fafb' },
  col1: { width: '30%' },
  col2: { width: '40%' },
  col3: { width: '30%', textAlign: 'right' },
  colHeader: { fontSize: 8, fontFamily: 'Helvetica-Bold', color: '#6b7280' },
  hurdlePass: { backgroundColor: '#dcfce7', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 3 },
  hurdleFail: { backgroundColor: '#fee2e2', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 3 },
  hurdleText: { fontSize: 9, fontFamily: 'Helvetica-Bold' },
  notesBox: { backgroundColor: '#f9fafb', borderRadius: 6, padding: 10 },
  notesText: { color: '#374151', lineHeight: 1.5 },
  footer: { position: 'absolute', bottom: 32, left: 48, right: 48, flexDirection: 'row', justifyContent: 'space-between', color: '#9ca3af', fontSize: 8 },
});

function fmt(n: number | null | undefined) {
  if (n == null) return '—';
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n);
}
function fmtPct(n: number | null | undefined, decimals = 1) {
  if (n == null) return '—';
  return `${(n * 100).toFixed(decimals)}%`;
}

interface Props {
  scenario: Scenario;
  constraints: Constraint[];
}

export default function ScenarioPDFReport({ scenario, constraints }: Props) {
  const date = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  const triggeredConstraints = constraints.filter(
    (c) => scenario.triggered_constraints?.includes(c.id)
  );
  const meetsHurdle = scenario.meets_hurdle;
  const irrDisplay = fmtPct(scenario.irr);
  const npv = scenario.npv ?? 0;

  return (
    <Document title={`${scenario.scenario_name} — Scenario Report`}>
      <Page size="LETTER" style={S.page}>
        <View style={S.header}>
          <View>
            <Text style={S.title}>{scenario.scenario_name}</Text>
            <Text style={S.subtitle}>
              Scenario Report · {date}
            </Text>
          </View>
          {meetsHurdle != null && (
            <View style={meetsHurdle ? S.hurdlePass : S.hurdleFail}>
              <Text style={[S.hurdleText, { color: meetsHurdle ? '#16a34a' : '#dc2626' }]}>
                {meetsHurdle ? 'MEETS HURDLE' : 'BELOW HURDLE'}
              </Text>
            </View>
          )}
        </View>

        {/* Key metrics */}
        <View style={S.statsRow}>
          {[
            { label: 'NPV', value: fmt(scenario.npv), ok: npv > 0 ? 'ok' : npv < 0 ? 'bad' : null },
            { label: 'IRR', value: irrDisplay, ok: meetsHurdle === true ? 'ok' : meetsHurdle === false ? 'bad' : null },
            { label: 'Payback', value: scenario.payback_months ? `${scenario.payback_months} mo` : '—', ok: null },
            { label: 'Capital Required', value: fmt(scenario.total_capital_required), ok: null },
          ].map((s) => (
            <View key={s.label} style={S.statBox}>
              <Text style={S.statLabel}>{s.label}</Text>
              <Text style={[S.statValue, s.ok === 'ok' ? S.statOk : s.ok === 'bad' ? S.statBad : {}]}>
                {s.value}
              </Text>
            </View>
          ))}
        </View>

        {/* Parameters */}
        <View style={S.section}>
          <Text style={S.sectionTitle}>Scenario Parameters</Text>
          {[
            { label: 'Renovation Cost', value: fmt(scenario.estimated_renovation_cost) },
            { label: 'Monthly Income Delta', value: scenario.monthly_income_delta != null ? `${fmt(scenario.monthly_income_delta)}/mo` : '—' },
            { label: 'Hold Period', value: scenario.hold_period_months ? `${scenario.hold_period_months} months` : '—' },
            { label: 'Cap Rate', value: fmtPct(scenario.cap_rate) },
            { label: 'Discount Rate', value: fmtPct(scenario.discount_rate) },
          ].map((d) => (
            <View key={d.label} style={S.row}>
              <Text style={S.label}>{d.label}</Text>
              <Text style={S.value}>{d.value}</Text>
            </View>
          ))}
        </View>

        {/* Triggered constraints */}
        {triggeredConstraints.length > 0 && (
          <View style={S.section}>
            <Text style={S.sectionTitle}>Triggered Constraints ({triggeredConstraints.length})</Text>
            <View style={S.tableHeader}>
              <Text style={[S.col1, S.colHeader]}>Type</Text>
              <Text style={[S.col2, S.colHeader]}>Description</Text>
              <Text style={[S.col3, S.colHeader]}>Est. Cost</Text>
            </View>
            {triggeredConstraints.map((c, i) => (
              <View key={i} style={S.tableRow}>
                <Text style={S.col1}>{c.constraint_type.replace(/_/g, ' ')}</Text>
                <Text style={S.col2}>{c.description.length > 50 ? c.description.slice(0, 48) + '…' : c.description}</Text>
                <Text style={S.col3}>{fmt(c.triggered_cost_estimate)}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Notes */}
        {scenario.notes && (
          <View style={S.section}>
            <Text style={S.sectionTitle}>Notes</Text>
            <View style={S.notesBox}>
              <Text style={S.notesText}>{scenario.notes}</Text>
            </View>
          </View>
        )}

        <View style={S.footer}>
          <Text>BidIQ · Confidential · {scenario.scenario_name}</Text>
          <Text>{date}</Text>
        </View>
      </Page>
    </Document>
  );
}
