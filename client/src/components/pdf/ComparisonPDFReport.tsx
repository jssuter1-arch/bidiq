import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';
import type { Scenario, ScenarioComparison, Constraint } from '@/types/scenarios';

const S = StyleSheet.create({
  page: { padding: 48, fontFamily: 'Helvetica', fontSize: 10, color: '#1a1a2e', backgroundColor: '#ffffff' },
  header: { marginBottom: 24, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  title: { fontSize: 20, fontFamily: 'Helvetica-Bold', color: '#4f46e5', marginBottom: 3 },
  subtitle: { fontSize: 10, color: '#64748b' },
  badge: { backgroundColor: '#eef2ff', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 4 },
  badgeText: { fontSize: 9, color: '#4f46e5', fontFamily: 'Helvetica-Bold' },
  decidedBadge: { backgroundColor: '#dcfce7', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 4 },
  decidedText: { fontSize: 9, color: '#16a34a', fontFamily: 'Helvetica-Bold' },
  section: { marginBottom: 18 },
  sectionTitle: { fontSize: 11, fontFamily: 'Helvetica-Bold', color: '#374151', marginBottom: 8, paddingBottom: 4, borderBottomWidth: 1, borderBottomColor: '#e5e7eb' },
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  label: { color: '#6b7280' },
  value: { fontFamily: 'Helvetica-Bold', color: '#111827' },
  scenarioCard: { backgroundColor: '#f9fafb', borderRadius: 6, padding: 12, marginBottom: 10 },
  scenarioName: { fontSize: 12, fontFamily: 'Helvetica-Bold', color: '#1e1b4b', marginBottom: 4 },
  scenarioType: { fontSize: 9, color: '#6b7280', marginBottom: 8 },
  statsRow: { flexDirection: 'row', gap: 6, marginBottom: 8 },
  statBox: { flex: 1, backgroundColor: '#ffffff', borderRadius: 4, padding: 7 },
  statLabel: { fontSize: 7, color: '#9ca3af', marginBottom: 2 },
  statValue: { fontSize: 11, fontFamily: 'Helvetica-Bold', color: '#111827' },
  statOk: { color: '#16a34a' },
  statBad: { color: '#dc2626' },
  selectedBanner: { backgroundColor: '#d1fae5', borderRadius: 4, padding: 6, marginTop: 6 },
  selectedText: { fontSize: 9, color: '#065f46', fontFamily: 'Helvetica-Bold' },
  baselineBanner: { backgroundColor: '#ede9fe', borderRadius: 4, padding: 4, marginBottom: 6 },
  baselineText: { fontSize: 8, color: '#5b21b6', fontFamily: 'Helvetica-Bold' },
  decisionBox: { backgroundColor: '#d1fae5', borderRadius: 6, padding: 12, marginBottom: 18 },
  decisionTitle: { fontSize: 11, fontFamily: 'Helvetica-Bold', color: '#065f46', marginBottom: 4 },
  decisionNotes: { fontSize: 10, color: '#064e3b', lineHeight: 1.4 },
  tableHeader: { flexDirection: 'row', backgroundColor: '#e5e7eb', padding: 6, borderRadius: 4, marginBottom: 2 },
  tableRow: { flexDirection: 'row', paddingVertical: 5, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  col1: { width: '35%' },
  col2: { width: '45%' },
  col3: { width: '20%', textAlign: 'right' },
  colHeader: { fontSize: 8, fontFamily: 'Helvetica-Bold', color: '#6b7280' },
  footer: { position: 'absolute', bottom: 32, left: 48, right: 48, flexDirection: 'row', justifyContent: 'space-between', color: '#9ca3af', fontSize: 8 },
});

function fmt(n: number | null | undefined) {
  if (n == null) return '—';
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n);
}
function fmtPct(n: number | null | undefined) {
  if (n == null) return '—';
  return `${(n * 100).toFixed(1)}%`;
}

interface Props {
  comparison: ScenarioComparison;
  scenarios: Scenario[];
  constraints: Constraint[];
}

export default function ComparisonPDFReport({ comparison, scenarios, constraints }: Props) {
  const date = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  const isDecided = !!comparison.selected_scenario_id;
  const selectedScenario = scenarios.find((s) => s.id === comparison.selected_scenario_id);
  const baselineId = scenarios.find((s) => s.is_baseline)?.id;

  return (
    <Document title={`${comparison.comparison_name} — Scenario Comparison`}>
      <Page size="LETTER" style={S.page}>
        <View style={S.header}>
          <View>
            <Text style={S.title}>{comparison.comparison_name}</Text>
            <Text style={S.subtitle}>
              Scenario Comparison · {scenarios.length} scenario{scenarios.length !== 1 ? 's' : ''} · {date}
            </Text>
          </View>
          {isDecided ? (
            <View style={S.decidedBadge}>
              <Text style={S.decidedText}>DECISION CAPTURED</Text>
            </View>
          ) : (
            <View style={S.badge}>
              <Text style={S.badgeText}>OPEN</Text>
            </View>
          )}
        </View>

        {/* Decision banner */}
        {isDecided && selectedScenario && (
          <View style={S.decisionBox}>
            <Text style={S.decisionTitle}>Selected: {selectedScenario.scenario_name}</Text>
            {comparison.decision_notes && (
              <Text style={S.decisionNotes}>{comparison.decision_notes}</Text>
            )}
          </View>
        )}

        {/* Scenario cards */}
        <View style={S.section}>
          <Text style={S.sectionTitle}>Scenarios</Text>
          {scenarios.map((s) => {
            const isSelected = s.id === comparison.selected_scenario_id;
            const isBaseline = s.id === baselineId;
            const npv = s.npv ?? 0;
            const triggeredCount = constraints.filter((c) => s.triggered_constraints?.includes(c.id)).length;

            return (
              <View key={s.id} style={S.scenarioCard}>
                {isBaseline && (
                  <View style={S.baselineBanner}>
                    <Text style={S.baselineText}>BASELINE</Text>
                  </View>
                )}
                <Text style={S.scenarioName}>{s.scenario_name}</Text>
                <Text style={S.scenarioType}>
                  {triggeredCount} constraint{triggeredCount !== 1 ? 's' : ''} triggered
                </Text>
                <View style={S.statsRow}>
                  {[
                    { label: 'NPV', value: fmt(s.npv), ok: npv > 0 ? 'ok' : npv < 0 ? 'bad' : null },
                    { label: 'IRR', value: fmtPct(s.irr), ok: s.meets_hurdle === true ? 'ok' : s.meets_hurdle === false ? 'bad' : null },
                    { label: 'Payback', value: s.payback_months ? `${s.payback_months} mo` : '—', ok: null },
                    { label: 'Capital', value: fmt(s.total_capital_required), ok: null },
                  ].map((stat) => (
                    <View key={stat.label} style={S.statBox}>
                      <Text style={S.statLabel}>{stat.label}</Text>
                      <Text style={[S.statValue, stat.ok === 'ok' ? S.statOk : stat.ok === 'bad' ? S.statBad : {}]}>
                        {stat.value}
                      </Text>
                    </View>
                  ))}
                </View>
                {isSelected && (
                  <View style={S.selectedBanner}>
                    <Text style={S.selectedText}>✓ Selected Path</Text>
                  </View>
                )}
              </View>
            );
          })}
        </View>

        {/* Constraints reference */}
        {constraints.length > 0 && (
          <View style={S.section}>
            <Text style={S.sectionTitle}>Active Constraints ({constraints.length})</Text>
            <View style={S.tableHeader}>
              <Text style={[S.col1, S.colHeader]}>Type</Text>
              <Text style={[S.col2, S.colHeader]}>Description</Text>
              <Text style={[S.col3, S.colHeader]}>Est. Cost</Text>
            </View>
            {constraints.map((c, i) => (
              <View key={i} style={S.tableRow}>
                <Text style={S.col1}>{c.constraint_type.replace(/_/g, ' ')}</Text>
                <Text style={S.col2}>{c.description.length > 55 ? c.description.slice(0, 53) + '…' : c.description}</Text>
                <Text style={S.col3}>{fmt(c.triggered_cost_estimate)}</Text>
              </View>
            ))}
          </View>
        )}

        <View style={S.footer}>
          <Text>BidIQ · Confidential · {comparison.comparison_name}</Text>
          <Text>{date}</Text>
        </View>
      </Page>
    </Document>
  );
}
