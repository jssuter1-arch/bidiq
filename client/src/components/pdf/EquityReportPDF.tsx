import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';

const S = StyleSheet.create({
  page: { padding: 48, fontFamily: 'Helvetica', fontSize: 10, color: '#1a1a2e', backgroundColor: '#ffffff' },
  header: { marginBottom: 28 },
  title: { fontSize: 22, fontFamily: 'Helvetica-Bold', color: '#4f46e5', marginBottom: 4 },
  subtitle: { fontSize: 11, color: '#64748b' },
  section: { marginBottom: 20 },
  sectionTitle: { fontSize: 11, fontFamily: 'Helvetica-Bold', color: '#374151', marginBottom: 10, paddingBottom: 4, borderBottomWidth: 1, borderBottomColor: '#e5e7eb' },
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 5, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  label: { color: '#6b7280' },
  value: { fontFamily: 'Helvetica-Bold', color: '#111827' },
  heroBox: { backgroundColor: '#eef2ff', borderRadius: 8, padding: 20, alignItems: 'center', marginBottom: 24 },
  heroLabel: { fontSize: 9, color: '#6366f1', letterSpacing: 1, marginBottom: 4 },
  heroValue: { fontSize: 28, fontFamily: 'Helvetica-Bold', color: '#4f46e5' },
  heroSub: { fontSize: 9, color: '#818cf8', marginTop: 4 },
  footer: { position: 'absolute', bottom: 32, left: 48, right: 48, flexDirection: 'row', justifyContent: 'space-between', color: '#9ca3af', fontSize: 8 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  gridItem: { width: '48%', backgroundColor: '#f9fafb', borderRadius: 6, padding: 10, marginBottom: 6 },
  gridLabel: { color: '#6b7280', fontSize: 8, marginBottom: 3 },
  gridValue: { fontFamily: 'Helvetica-Bold', color: '#111827', fontSize: 12 },
});

function fmt(n: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n);
}

interface Props {
  analysisName: string;
  propertyName?: string;
  inputs: {
    renovationCost: number;
    preRenovationRentPerUnit: number;
    postRenovationRentPerUnit: number;
    unitsAffected: number;
    capRate: number;
  };
  results: {
    monthlyRentIncreasePerUnit: number;
    totalMonthlyRentIncrease: number;
    annualRentIncrease: number;
    valueCreated: number;
    roiMultiple: number;
    roiPercentage: number;
    paybackMonths: number | null;
  };
}

export default function EquityReportPDF({ analysisName, propertyName, inputs, results }: Props) {
  const date = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  return (
    <Document title={analysisName}>
      <Page size="LETTER" style={S.page}>
        <View style={S.header}>
          <Text style={S.title}>Equity Analysis Report</Text>
          <Text style={S.subtitle}>{analysisName}{propertyName ? ` · ${propertyName}` : ''}</Text>
        </View>

        <View style={S.heroBox}>
          <Text style={S.heroLabel}>VALUE CREATED</Text>
          <Text style={S.heroValue}>{fmt(results.valueCreated)}</Text>
          <Text style={S.heroSub}>
            {fmt(results.annualRentIncrease)} annual income ÷ {(inputs.capRate * 100).toFixed(1)}% cap rate
          </Text>
        </View>

        <View style={S.section}>
          <Text style={S.sectionTitle}>Key Metrics</Text>
          <View style={S.grid}>
            {[
              { label: 'Monthly Rent Increase / Unit', value: fmt(results.monthlyRentIncreasePerUnit) },
              { label: 'Total Monthly Increase', value: fmt(results.totalMonthlyRentIncrease) },
              { label: 'Annual Rent Increase', value: fmt(results.annualRentIncrease) },
              { label: 'Renovation Cost', value: fmt(inputs.renovationCost) },
              { label: 'ROI Multiple', value: `${results.roiMultiple.toFixed(2)}×` },
              { label: 'ROI %', value: `${results.roiPercentage.toFixed(1)}%` },
              { label: 'Payback Period', value: results.paybackMonths ? `${results.paybackMonths} months` : '—' },
              { label: 'Units Affected', value: String(inputs.unitsAffected) },
            ].map((item) => (
              <View key={item.label} style={S.gridItem}>
                <Text style={S.gridLabel}>{item.label}</Text>
                <Text style={S.gridValue}>{item.value}</Text>
              </View>
            ))}
          </View>
        </View>

        <View style={S.section}>
          <Text style={S.sectionTitle}>Assumptions</Text>
          {[
            { label: 'Pre-Renovation Rent / Unit', value: fmt(inputs.preRenovationRentPerUnit) + '/mo' },
            { label: 'Post-Renovation Rent / Unit', value: fmt(inputs.postRenovationRentPerUnit) + '/mo' },
            { label: 'Units Affected', value: String(inputs.unitsAffected) },
            { label: 'Cap Rate', value: (inputs.capRate * 100).toFixed(1) + '%' },
            { label: 'Valuation Method', value: 'Income Capitalization' },
          ].map((item) => (
            <View key={item.label} style={S.row}>
              <Text style={S.label}>{item.label}</Text>
              <Text style={S.value}>{item.value}</Text>
            </View>
          ))}
        </View>

        <View style={S.footer}>
          <Text>BidIQ · Confidential</Text>
          <Text>{date}</Text>
        </View>
      </Page>
    </Document>
  );
}
