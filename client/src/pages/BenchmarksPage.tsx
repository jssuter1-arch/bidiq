import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { RefreshCw, LayoutTemplate, AlertTriangle, Settings2 } from 'lucide-react';
import api from '@/services/api';
import PageWrapper from '@/components/layout/PageWrapper';
import PageHeader from '@/components/layout/PageHeader';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Table from '@/components/ui/Table';
import toast from 'react-hot-toast';
import { formatCurrency } from '@/utils/format';
import { useModuleAccess } from '@/hooks/useModuleAccess';

export default function BenchmarksPage() {
  const navigate = useNavigate();
  const { hasAccess } = useModuleAccess();
  const [benchmarks, setBenchmarks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [recomputing, setRecomputing] = useState(false);

  const load = () => {
    api.get('/v1/benchmarks')
      .then((r) => setBenchmarks(r.data.data || []))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const handleRecompute = async () => {
    setRecomputing(true);
    try {
      const { data } = await api.post('/v1/benchmarks/recompute');
      setBenchmarks(data.data || []);
      toast.success('Benchmarks recomputed');
    } catch { toast.error('Failed to recompute'); }
    finally { setRecomputing(false); }
  };

  const chartData = benchmarks.filter((b) => b.avg_cost).map((b) => ({
    category: b.category.replace('_', ' '),
    p25: b.p25_cost,
    avg: b.avg_cost,
    p75: b.p75_cost,
  }));

  return (
    <PageWrapper>
      <PageHeader title="Cost Intelligence" subtitle="Benchmark your project costs against historical actuals"
        actions={<Button variant="secondary" size="sm" iconLeft={<RefreshCw className="w-3.5 h-3.5" />} loading={recomputing} onClick={handleRecompute}>Recompute</Button>} />

      {hasAccess('cost_intelligence_extended') && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-2">
          <Card className="cursor-pointer hover:border-brand-500/40 transition-colors" onClick={() => navigate('/intelligence/templates')}>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-brand-500/10">
                <LayoutTemplate className="w-4 h-4 text-brand-400" />
              </div>
              <div>
                <p className="text-sm font-semibold text-[var(--text-primary)]">Pricing Templates</p>
                <p className="text-xs text-[var(--text-tertiary)]">Reusable scope-based budgets</p>
              </div>
            </div>
          </Card>
          <Card className="cursor-pointer hover:border-brand-500/40 transition-colors" onClick={() => navigate('/intelligence/change-orders')}>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-amber-500/10">
                <AlertTriangle className="w-4 h-4 text-amber-400" />
              </div>
              <div>
                <p className="text-sm font-semibold text-[var(--text-primary)]">Change Order Analytics</p>
                <p className="text-xs text-[var(--text-tertiary)]">Root-cause breakdown & trends</p>
              </div>
            </div>
          </Card>
          <Card className="cursor-pointer hover:border-brand-500/40 transition-colors" onClick={() => navigate('/intelligence/scope-factors')}>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-purple-500/10">
                <Settings2 className="w-4 h-4 text-purple-400" />
              </div>
              <div>
                <p className="text-sm font-semibold text-[var(--text-primary)]">Scope Factors</p>
                <p className="text-xs text-[var(--text-tertiary)]">Normalize contractor rates</p>
              </div>
            </div>
          </Card>
        </div>
      )}

      {chartData.length > 0 && (
        <Card className="space-y-3">
          <h3 className="text-sm font-semibold text-[var(--text-primary)]">Cost Range by Category ($/unit)</h3>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={chartData} barGap={2} barCategoryGap="25%">
              <XAxis dataKey="category" tick={{ fontSize: 10, fill: 'var(--text-tertiary)' }} axisLine={false} tickLine={false} />
              <YAxis tickFormatter={(v) => `$${v}`} tick={{ fontSize: 10, fill: 'var(--text-tertiary)' }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-default)', borderRadius: 8, fontSize: 12 }} formatter={(v: number, n: string) => [`$${v}`, n]} />
              <Bar dataKey="p25" fill="var(--brand-500)" opacity={0.3} radius={[4, 4, 0, 0]} name="P25" />
              <Bar dataKey="avg" fill="var(--brand-500)" radius={[4, 4, 0, 0]} name="Avg" />
              <Bar dataKey="p75" fill="var(--brand-700)" opacity={0.5} radius={[4, 4, 0, 0]} name="P75" />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      )}

      <Table
        columns={[
          { key: 'category', header: 'Category', render: (r: any) => <span className="capitalize">{r.category?.replace('_', ' ')}</span> },
          { key: 'unit_of_measure', header: 'Unit' },
          { key: 'p25_cost', header: 'P25 (Low)', align: 'right', render: (r: any) => <span className="font-mono">{r.p25_cost ? `$${r.p25_cost}` : '—'}</span> },
          { key: 'avg_cost', header: 'Avg', align: 'right', render: (r: any) => <span className="font-mono font-medium">{r.avg_cost ? `$${r.avg_cost}` : '—'}</span> },
          { key: 'p75_cost', header: 'P75 (High)', align: 'right', render: (r: any) => <span className="font-mono">{r.p75_cost ? `$${r.p75_cost}` : '—'}</span> },
          { key: 'sample_count', header: 'Samples', align: 'right' },
          { key: 'region', header: 'Region', render: (r: any) => r.region || '—' },
        ]}
        data={benchmarks}
        loading={loading}
        emptyText="No benchmark data. Complete projects to build benchmarks."
      />
    </PageWrapper>
  );
}
