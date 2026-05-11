import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine,
} from 'recharts';
import api from '@/services/api';
import PageWrapper from '@/components/layout/PageWrapper';
import PageHeader from '@/components/layout/PageHeader';
import Card from '@/components/ui/Card';
import Table from '@/components/ui/Table';
import Badge from '@/components/ui/Badge';
import { SkeletonCard } from '@/components/ui/Skeleton';
import { formatCurrency } from '@/utils/format';

function percentileLabel(orgVal: number, p25: number, p50: number, p75: number): { label: string; variant: 'success' | 'warning' | 'danger' | 'default' } {
  if (orgVal <= p25) return { label: `≤25th pct — excellent`, variant: 'success' };
  if (orgVal <= p50) return { label: `25–50th pct — good`, variant: 'success' };
  if (orgVal <= p75) return { label: `50–75th pct — average`, variant: 'warning' };
  return { label: `>75th pct — above market`, variant: 'danger' };
}

export default function PortfolioBenchmarksPage() {
  const navigate = useNavigate();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/v1/portfolio/benchmarks')
      .then((r) => setData(r.data.data))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <PageWrapper><PageHeader title="Industry Benchmarks" /><SkeletonCard /></PageWrapper>
  );

  const participation = data?.participation;
  const aggregates: any[] = data?.aggregates || [];
  const orgAverages: Record<string, number> = data?.org_category_averages || {};

  // Group aggregates by category (strip property_type suffix for display)
  const categoryRows = aggregates
    .filter((a) => a.metric_key.startsWith('cost_per_unit_'))
    .map((a) => {
      const propertyTypeSuffix = a.property_type ? `_${a.property_type}` : '';
      const category = a.metric_key.replace('cost_per_unit_', '').replace(propertyTypeSuffix, '');
      const orgVal = orgAverages[category];
      const pct = orgVal ? percentileLabel(orgVal, a.value_p25, a.value_p50, a.value_p75) : null;
      return { ...a, category, org_value: orgVal, pct };
    })
;

  // CO rate comparison
  const coRateRows = aggregates
    .filter((a) => a.metric_key.startsWith('change_order_rate_'))
    .map((a) => ({
      ...a,
      category: a.metric_key.replace('change_order_rate_', ''),
    }));

  const coChartData = coRateRows.map((r) => ({
    category: r.category.replace('_', ' '),
    industry: Math.round(r.value_p50 * 100),
  }));

  return (
    <PageWrapper>
      <PageHeader
        title="Industry Benchmarks"
        subtitle="Anonymized aggregates from real estate developers using BidIQ"
      />

      {/* Participation Banner */}
      <div className={`flex items-center justify-between p-3 rounded-lg text-sm border ${participation?.is_participating
        ? 'bg-[var(--color-success-bg,#14532d10)] border-success/30 text-[var(--text-secondary)]'
        : 'bg-[var(--bg-elevated)] border-[var(--border-subtle)] text-[var(--text-tertiary)]'}`}>
        <span>
          {participation?.is_participating
            ? 'You\'re participating in cross-tenant benchmarks. Your anonymized data contributes to the aggregate.'
            : 'You\'re not currently participating. You can see benchmarks but your data is excluded.'}
        </span>
        <button
          onClick={() => navigate('/settings/cross-tenant-participation')}
          className="text-brand-400 hover:text-brand-300 transition-colors ml-4 whitespace-nowrap"
        >
          Manage participation →
        </button>
      </div>

      {/* Cost Position by Category */}
      {categoryRows.length > 0 ? (
        <Card className="space-y-3">
          <h3 className="text-sm font-semibold text-[var(--text-primary)]">Cost Position by Category (Cost per Unit)</h3>
          <p className="text-xs text-[var(--text-tertiary)]">Benchmarks require ≥5 contributing organizations. Percentiles computed from completed-project invoice data.</p>
          <Table
            data={categoryRows}
            columns={[
              { key: 'category', header: 'Category', render: (r: any) => <span className="capitalize">{r.category.replace(/_/g, ' ')}</span> },
              { key: 'org_value', header: 'Your Avg', align: 'right', render: (r: any) => <span className="font-mono">{r.org_value ? formatCurrency(r.org_value) : '—'}</span> },
              { key: 'value_p25', header: 'P25', align: 'right', render: (r: any) => <span className="font-mono">{formatCurrency(r.value_p25)}</span> },
              { key: 'value_p50', header: 'Median', align: 'right', render: (r: any) => <span className="font-mono font-medium">{formatCurrency(r.value_p50)}</span> },
              { key: 'value_p75', header: 'P75', align: 'right', render: (r: any) => <span className="font-mono">{formatCurrency(r.value_p75)}</span> },
              { key: 'pct', header: 'Your Percentile', render: (r: any) => r.pct ? <Badge variant={r.pct.variant}>{r.pct.label}</Badge> : <span className="text-[var(--text-tertiary)]">—</span> },
              { key: 'sample_org_count', header: 'Orgs', align: 'right', render: (r: any) => <span className="text-[var(--text-tertiary)]">{r.sample_org_count}</span> },
            ]}
            emptyText="No benchmark data."
          />
        </Card>
      ) : (
        <Card className="text-center py-12">
          <p className="text-sm text-[var(--text-tertiary)]">
            Cross-tenant benchmarks become available once at least 5 organizations contribute data for a given category.
          </p>
          {!participation?.is_participating && (
            <button onClick={() => navigate('/settings/cross-tenant-participation')}
              className="mt-3 text-sm text-brand-400 hover:text-brand-300 transition-colors">
              Opt in to participation →
            </button>
          )}
        </Card>
      )}

      {/* CO Rate Comparison */}
      {coChartData.length > 0 && (
        <Card className="space-y-3">
          <h3 className="text-sm font-semibold text-[var(--text-primary)]">Change Order Rate vs. Industry Median</h3>
          <p className="text-xs text-[var(--text-tertiary)]">Lower is better — indicates better scope control.</p>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={coChartData} layout="vertical">
              <XAxis type="number" tickFormatter={(v) => `${v}%`} tick={{ fontSize: 10, fill: 'var(--text-tertiary)' }} axisLine={false} tickLine={false} />
              <YAxis type="category" dataKey="category" width={140} tick={{ fontSize: 10, fill: 'var(--text-secondary)' }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-default)', borderRadius: 8, fontSize: 12 }}
                formatter={(v: number) => [`${v}%`, 'Industry median CO rate']} />
              <Bar dataKey="industry" fill="var(--brand-500)" opacity={0.6} radius={[0, 4, 4, 0]} name="Industry Median" />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      )}

      {/* Caveats */}
      <Card className="bg-[var(--bg-elevated)] border-[var(--border-subtle)]">
        <p className="text-xs text-[var(--text-tertiary)] leading-relaxed">
          <strong className="text-[var(--text-secondary)]">Caveats:</strong> Benchmarks are estimates based on contributing organizations.
          Property types, geographic areas, and project scopes vary — comparisons are directional, not prescriptive.
          Minimum 5 contributing organizations required for any benchmark to display.
          Data reflects the most recent nightly aggregation run.
        </p>
      </Card>
    </PageWrapper>
  );
}
