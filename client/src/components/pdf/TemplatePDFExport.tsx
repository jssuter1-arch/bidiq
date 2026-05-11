import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';

const S = StyleSheet.create({
  page: { padding: 48, fontFamily: 'Helvetica', fontSize: 10, color: '#1a1a2e', backgroundColor: '#ffffff' },
  header: { marginBottom: 24 },
  title: { fontSize: 20, fontFamily: 'Helvetica-Bold', color: '#4f46e5', marginBottom: 3 },
  subtitle: { fontSize: 10, color: '#64748b' },
  meta: { flexDirection: 'row', gap: 16, marginTop: 8 },
  metaItem: { flexDirection: 'row', gap: 4 },
  metaLabel: { color: '#9ca3af', fontSize: 9 },
  metaValue: { color: '#374151', fontSize: 9, fontFamily: 'Helvetica-Bold' },
  section: { marginBottom: 20 },
  sectionTitle: { fontSize: 11, fontFamily: 'Helvetica-Bold', color: '#374151', marginBottom: 8, paddingBottom: 4, borderBottomWidth: 1, borderBottomColor: '#e5e7eb' },
  tableHeader: { flexDirection: 'row', backgroundColor: '#f3f4f6', padding: 6, borderRadius: 4, marginBottom: 2 },
  tableRow: { flexDirection: 'row', paddingVertical: 5, borderBottomWidth: 1, borderBottomColor: '#f9fafb' },
  col1: { width: '28%' },
  col2: { width: '30%' },
  col3: { width: '20%' },
  col4: { width: '22%', textAlign: 'right' },
  colHeader: { fontSize: 8, fontFamily: 'Helvetica-Bold', color: '#6b7280' },
  cellText: { fontSize: 9, color: '#374151' },
  cellBold: { fontSize: 9, fontFamily: 'Helvetica-Bold', color: '#111827' },
  basisBadge: { backgroundColor: '#eef2ff', paddingHorizontal: 5, paddingVertical: 1, borderRadius: 3 },
  basisText: { fontSize: 8, color: '#4f46e5' },
  footer: { position: 'absolute', bottom: 32, left: 48, right: 48, flexDirection: 'row', justifyContent: 'space-between' },
  footerText: { fontSize: 8, color: '#9ca3af' },
});

interface TemplateItem {
  id: string;
  category: string;
  description?: string;
  unit_basis: string;
  unit_cost: number;
  benchmark?: { avg_cost?: number } | null;
}

interface Template {
  name: string;
  description?: string;
  property_type?: string;
  renovation_scope?: string;
  created_at?: string;
  pricing_template_items?: TemplateItem[];
}

function formatAmt(v: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(v);
}

export default function TemplatePDFExport({ template }: { template: Template }) {
  const items = template.pricing_template_items ?? [];
  const createdDate = template.created_at ? new Date(template.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '';

  return (
    <Document>
      <Page size="LETTER" style={S.page}>
        <View style={S.header}>
          <Text style={S.title}>{template.name}</Text>
          {template.description && <Text style={S.subtitle}>{template.description}</Text>}
          <View style={S.meta}>
            {template.property_type && (
              <View style={S.metaItem}>
                <Text style={S.metaLabel}>Type:</Text>
                <Text style={S.metaValue}>{template.property_type}</Text>
              </View>
            )}
            {template.renovation_scope && (
              <View style={S.metaItem}>
                <Text style={S.metaLabel}>Scope:</Text>
                <Text style={S.metaValue}>{template.renovation_scope.replace('_', ' ')}</Text>
              </View>
            )}
            {createdDate && (
              <View style={S.metaItem}>
                <Text style={S.metaLabel}>Created:</Text>
                <Text style={S.metaValue}>{createdDate}</Text>
              </View>
            )}
            <View style={S.metaItem}>
              <Text style={S.metaLabel}>Items:</Text>
              <Text style={S.metaValue}>{items.length}</Text>
            </View>
          </View>
        </View>

        <View style={S.section}>
          <Text style={S.sectionTitle}>Line Items ({items.length})</Text>
          <View style={S.tableHeader}>
            <Text style={[S.col1, S.colHeader]}>Category</Text>
            <Text style={[S.col2, S.colHeader]}>Description</Text>
            <Text style={[S.col3, S.colHeader]}>Basis</Text>
            <Text style={[S.col4, S.colHeader]}>Unit Cost</Text>
          </View>
          {items.map((item) => (
            <View key={item.id} style={S.tableRow}>
              <Text style={[S.col1, S.cellBold]}>{item.category.replace(/_/g, ' ')}</Text>
              <Text style={[S.col2, S.cellText]}>{item.description || '—'}</Text>
              <View style={[S.col3]}>
                <View style={S.basisBadge}>
                  <Text style={S.basisText}>{item.unit_basis.replace('_', ' ')}</Text>
                </View>
              </View>
              <Text style={[S.col4, S.cellBold]}>{formatAmt(item.unit_cost)}</Text>
            </View>
          ))}
        </View>

        {items.some((i) => i.benchmark?.avg_cost) && (
          <View style={S.section}>
            <Text style={S.sectionTitle}>Benchmark Comparison</Text>
            <View style={S.tableHeader}>
              <View style={{ width: '40%' }}><Text style={S.colHeader}>Category</Text></View>
              <View style={{ width: '30%', textAlign: 'right' }}><Text style={S.colHeader}>Template Cost</Text></View>
              <View style={{ width: '30%', textAlign: 'right' }}><Text style={S.colHeader}>Market Avg</Text></View>
            </View>
            {items.filter((i) => i.benchmark?.avg_cost).map((item) => {
              const ratio = item.benchmark!.avg_cost! > 0 ? item.unit_cost / item.benchmark!.avg_cost! : 1;
              return (
                <View key={item.id} style={S.tableRow}>
                  <Text style={[{ width: '40%' }, S.cellText]}>{item.category.replace(/_/g, ' ')}</Text>
                  <Text style={[{ width: '30%', textAlign: 'right' }, S.cellBold]}>{formatAmt(item.unit_cost)}</Text>
                  <Text style={[{ width: '30%', textAlign: 'right' }, S.cellText, { color: ratio > 1.1 ? '#dc2626' : '#16a34a' }]}>
                    {formatAmt(item.benchmark!.avg_cost!)}
                  </Text>
                </View>
              );
            })}
          </View>
        )}

        <View style={S.footer}>
          <Text style={S.footerText}>BidIQ · Pricing Template Export</Text>
          <Text style={S.footerText}>{new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</Text>
        </View>
      </Page>
    </Document>
  );
}
