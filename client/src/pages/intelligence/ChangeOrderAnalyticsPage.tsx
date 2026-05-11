import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  LineChart, Line, CartesianGrid,
} from 'recharts';
import { ListTodo } from 'lucide-react';
import api from '@/services/api';
import PageWrapper from '@/components/layout/PageWrapper';
import PageHeader from '@/components/layout/PageHeader';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Spinner from '@/components/ui/Spinner';
import { formatCurrency } from '@/utils/format';

const CATEGORY_LABELS: Record<string, string> = {
  scope_creep: 'Scope Creep',
  design_change: 'Design Change',
  unforeseen_conditions: 'Unforeseen',
  material_escalation: 'Material Escalation',
  labor_shortage: 'Labor Shortage',
  permit_requirement: 'Permit Req.',
  owner_request: 'Owner Request',
  error_omission: 'Error/Omission',
  other: 'Other',
  __uncategorized__: 'Uncategorized',
};

export default function ChangeOrderAnalyticsPage() {
  const navigate = useNavigate();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/v1/change-orders/analytics')
      .then((r) => setData(r.data))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex h-40 items-center justify-center"><Spinner size="lg" /></div>;
  if (!data) return null;

  const categoryData = (data.by_category ?? []).map((c: any) => ({
    name: CATEGORY_LABELS[c.category] ?? c.category,
    amount: c.total_amount,
    count: c.invoice_count,
  }));

  const trendData = (data.monthly_trend ?? []).map((m: any) => ({
    month: m.month,
    amount: m.total_amount,
  }));

  return (
    <PageWrapper>
      <PageHeader
        title="Change Order Analytics"
        subtitle={`Trailing 12 months · ${data.period_start} — ${data.period_end}`}
        actions={
          <Button
            variant="secondary"
            size="sm"
            iconLeft={<ListTodo className="w-3.5 h-3.5" />}
            onClick={() => navigate('/intelligence/change-orders/queue')}
          >
            Categorize Queue {data.uncategorized_count > 0 && `(${data.uncategorized_count})`}
          </Button>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Total CO Spend', value: formatCurrency(data.total_co_amount) },
          { label: 'CO Invoices', value: data.total_co_count },
          { label: 'Uncategorized', value: data.uncategorized_count, warn: data.uncategorized_count > 0 },
          { label: 'Top Category', value: CATEGORY_LABELS[data.by_category?.[0]?.category] ?? '—' },
        ].map((stat) => (
          <Card key={stat.label} className="text-center">
            <p className="text-xs text-[var(--text-tertiary)] mb-1">{stat.label}</p>
            <p className={`text-2xl font-bold font-heading ${stat.warn ? 'text-amber-400' : 'text-[var(--text-primary)]'}`}>
              {stat.value}
            </p>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        <Card className="space-y-3">
          <h3 className="text-sm font-semibold text-[var(--text-primary)]">By Category (Total $)</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={categoryData} layout="vertical" margin={{ left: 8 }}>
              <XAxis type="number" tick={{ fontSize: 10, fill: 'var(--text-tertiary)' }} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}K`} axisLine={false} tickLine={false} />
              <YAxis type="category" dataKey="name" width={110} tick={{ fontSize: 10, fill: 'var(--text-secondary)' }} axisLine={false} tickLine={false} />
              <Tooltip
                contentStyle={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-default)', borderRadius: 8, fontSize: 12 }}
                formatter={(v: number) => [formatCurrency(v), 'Amount']}
              />
              <Bar dataKey="amount" fill="var(--brand-500)" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        <Card className="space-y-3">
          <h3 className="text-sm font-semibold text-[var(--text-primary)]">Monthly Trend</h3>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={trendData}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" />
              <XAxis dataKey="month" tick={{ fontSize: 10, fill: 'var(--text-tertiary)' }} axisLine={false} tickLine={false} />
              <YAxis tickFormatter={(v) => `$${(v / 1000).toFixed(0)}K`} tick={{ fontSize: 10, fill: 'var(--text-tertiary)' }} axisLine={false} tickLine={false} />
              <Tooltip
                contentStyle={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-default)', borderRadius: 8, fontSize: 12 }}
                formatter={(v: number) => [formatCurrency(v), 'CO Spend']}
              />
              <Line type="monotone" dataKey="amount" stroke="var(--brand-500)" strokeWidth={2} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="space-y-3">
          <h3 className="text-sm font-semibold text-[var(--text-primary)]">Top Projects by CO Spend</h3>
          <div className="space-y-2">
            {(data.top_offending_projects ?? []).slice(0, 5).map((p: any) => (
              <div key={p.project_id} className="flex justify-between text-sm">
                <span className="text-[var(--text-secondary)] truncate max-w-[60%]">{p.project_name}</span>
                <div className="flex items-center gap-3">
                  <span className="text-[var(--text-tertiary)] text-xs">{p.co_count} CO{p.co_count !== 1 ? 's' : ''}</span>
                  <span className="font-mono font-medium text-[var(--text-primary)]">{formatCurrency(p.total_co_amount)}</span>
                </div>
              </div>
            ))}
            {(data.top_offending_projects ?? []).length === 0 && (
              <p className="text-sm text-[var(--text-tertiary)]">No change orders in this period.</p>
            )}
          </div>
        </Card>

        <Card className="space-y-3">
          <h3 className="text-sm font-semibold text-[var(--text-primary)]">By Contractor</h3>
          <div className="space-y-2">
            {(data.by_contractor ?? []).slice(0, 5).map((c: any) => (
              <div key={c.contractor_id} className="flex justify-between text-sm">
                <span className="text-[var(--text-secondary)] truncate max-w-[60%]">{c.company_name}</span>
                <span className="font-mono font-medium text-[var(--text-primary)]">{formatCurrency(c.total_amount)}</span>
              </div>
            ))}
            {(data.by_contractor ?? []).length === 0 && (
              <p className="text-sm text-[var(--text-tertiary)]">No contractor data.</p>
            )}
          </div>
        </Card>
      </div>
    </PageWrapper>
  );
}
