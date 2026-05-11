import { useEffect, useState } from 'react';
import {
  ComposedChart, Bar, Line, XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid, Legend,
} from 'recharts';
import api from '@/services/api';
import PageWrapper from '@/components/layout/PageWrapper';
import PageHeader from '@/components/layout/PageHeader';
import Card from '@/components/ui/Card';
import Select from '@/components/ui/Select';
import Table from '@/components/ui/Table';
import Badge from '@/components/ui/Badge';
import { SkeletonCard } from '@/components/ui/Skeleton';
import { formatCurrency } from '@/utils/format';

const HORIZON_OPTIONS = [
  { value: '12', label: '12 months' },
  { value: '24', label: '24 months' },
  { value: '36', label: '36 months' },
  { value: '48', label: '48 months' },
];

const GRANULARITY_OPTIONS = [
  { value: 'quarterly', label: 'Quarterly' },
  { value: 'monthly', label: 'Monthly' },
];

export default function CapitalTimelinePage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [horizonMonths, setHorizonMonths] = useState('24');
  const [granularity, setGranularity] = useState('quarterly');

  useEffect(() => {
    setLoading(true);
    api.get('/v1/portfolio/capital-timeline', { params: { horizonMonths, granularity } })
      .then((r) => setData(r.data.data))
      .finally(() => setLoading(false));
  }, [horizonMonths, granularity]);

  const periods = data?.periods || [];

  const chartData = periods.map((p: any) => ({
    label: p.label,
    'Capital Required': p.capital_required,
    'Cash Position': p.cash_position_end,
  }));

  const healthVariant: Record<string, 'success' | 'warning' | 'danger'> = {
    green: 'success',
    amber: 'warning',
    red: 'danger',
  };

  return (
    <PageWrapper>
      <PageHeader
        title="Capital Deployment Timeline"
        subtitle="Multi-year view of capital commitment and cash availability"
      />

      {/* Controls */}
      <div className="flex items-center gap-3 flex-wrap">
        <Select
          options={HORIZON_OPTIONS}
          value={horizonMonths}
          onChange={(e) => setHorizonMonths(e.target.value)}
        />
        <Select
          options={GRANULARITY_OPTIONS}
          value={granularity}
          onChange={(e) => setGranularity(e.target.value)}
        />
        {data && (
          <span className="text-xs text-[var(--text-tertiary)]">
            Starting cash: {formatCurrency(data.current_cash)}
          </span>
        )}
      </div>

      {loading ? (
        <SkeletonCard />
      ) : (
        <>
          {/* Main Chart */}
          <Card className="space-y-3">
            <h3 className="text-sm font-semibold text-[var(--text-primary)]">Capital Required vs. Cash Position</h3>
            <ResponsiveContainer width="100%" height={360}>
              <ComposedChart data={chartData} margin={{ right: 24 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: 'var(--text-tertiary)' }} axisLine={false} tickLine={false} />
                <YAxis
                  tickFormatter={(v) => formatCurrency(v, true)}
                  tick={{ fontSize: 10, fill: 'var(--text-tertiary)' }}
                  axisLine={false} tickLine={false}
                />
                <Tooltip
                  contentStyle={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-default)', borderRadius: 8, fontSize: 12 }}
                  formatter={(v: number, name: string) => [formatCurrency(v), name]}
                />
                <Legend iconSize={8} iconType="circle" />
                <Bar dataKey="Capital Required" fill="var(--brand-500)" opacity={0.7} radius={[4, 4, 0, 0]} />
                <Line type="monotone" dataKey="Cash Position" stroke="#22c55e" strokeWidth={2} dot={{ r: 3 }} />
              </ComposedChart>
            </ResponsiveContainer>
          </Card>

          {/* Period Table */}
          <Table
            data={periods}
            columns={[
              { key: 'label', header: 'Period' },
              { key: 'capital_required', header: 'Capital Required', align: 'right', render: (r: any) => <span className="font-mono">{formatCurrency(r.capital_required)}</span> },
              { key: 'cash_position_end', header: 'Cash Position (End)', align: 'right', render: (r: any) => <span className="font-mono">{formatCurrency(r.cash_position_end)}</span> },
              { key: 'margin', header: 'Margin', align: 'right', render: (r: any) => <span className="font-mono">{formatCurrency(r.margin)}</span> },
              { key: 'health', header: 'Health', render: (r: any) => <Badge variant={healthVariant[r.health] || 'default'}>{r.health}</Badge> },
              { key: 'notes', header: 'Notes', render: (r: any) => <span className="text-xs text-[var(--text-tertiary)] truncate max-w-48 block">{r.notes || '—'}</span> },
            ]}
            emptyText="No timeline data."
          />
        </>
      )}
    </PageWrapper>
  );
}
