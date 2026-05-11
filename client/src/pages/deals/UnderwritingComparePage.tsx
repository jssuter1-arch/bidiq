import { useEffect, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import PageWrapper from '@/components/layout/PageWrapper';
import PageHeader from '@/components/layout/PageHeader';
import Card from '@/components/ui/Card';
import Select from '@/components/ui/Select';
import Skeleton from '@/components/ui/Skeleton';
import Badge from '@/components/ui/Badge';
import { UnderwritingModel } from '@/types/deals';
import { formatCurrency, formatPercent, formatMultiple } from '@/utils/format';
import api from '@/services/api';
import { cn } from '@/utils/cn';

const ROWS: { label: string; key: keyof UnderwritingModel; format: (v: any) => string; highlight?: boolean }[] = [
  { label: 'Purchase Price', key: 'proposed_purchase_price', format: (v) => formatCurrency(v) },
  { label: 'Down Payment', key: 'down_payment_pct', format: (v) => formatPercent(v * 100) },
  { label: 'Senior Debt Rate', key: 'senior_debt_rate', format: (v) => formatPercent(v * 100) },
  { label: 'Renovation Cost', key: 'estimated_renovation_cost', format: (v) => formatCurrency(v) },
  { label: 'Closing Costs', key: 'estimated_closing_costs', format: (v) => formatCurrency(v) },
  { label: 'Hold Period (months)', key: 'hold_period_months', format: (v) => `${v}mo` },
  { label: 'Exit Cap Rate', key: 'exit_cap_rate', format: (v) => formatPercent(v * 100) },
  { label: 'Hurdle Rate', key: 'hurdle_rate', format: (v) => formatPercent(v * 100) },
  { label: '─── Results ───', key: 'id', format: () => '' },
  { label: 'Total Capital', key: 'total_capital_required', format: (v) => formatCurrency(v) },
  { label: 'NOI Year 1', key: 'projected_noi_year_1', format: (v) => formatCurrency(v) },
  { label: 'NOI Stabilized', key: 'projected_noi_stabilized', format: (v) => formatCurrency(v) },
  { label: 'Exit Value', key: 'projected_exit_value', format: (v) => formatCurrency(v) },
  { label: 'Equity at Exit', key: 'projected_equity_at_exit', format: (v) => formatCurrency(v) },
  { label: 'IRR', key: 'irr', format: (v) => v != null ? formatPercent(v * 100) : '—', highlight: true },
  { label: 'NPV', key: 'npv', format: (v) => formatCurrency(v), highlight: true },
  { label: 'Equity Multiple', key: 'equity_multiple', format: (v) => formatMultiple(v), highlight: true },
  { label: 'CoC Year 1', key: 'cash_on_cash_year_1', format: (v) => formatPercent(v * 100) },
  { label: 'Recommended Max Bid', key: 'recommended_max_bid', format: (v) => formatCurrency(v) },
];

export default function UnderwritingComparePage() {
  const { dealId } = useParams<{ dealId: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const [models, setModels] = useState<UnderwritingModel[]>([]);
  const [loading, setLoading] = useState(true);
  const [aId, setAId] = useState(searchParams.get('a') || '');
  const [bId, setBId] = useState(searchParams.get('b') || '');

  useEffect(() => {
    api.get(`/v1/deals/${dealId}/underwriting`)
      .then((r) => {
        const data: UnderwritingModel[] = r.data.data || [];
        setModels(data);
        if (!aId && data.length > 0) setAId(data[data.length - 1]?.id);
        if (!bId && data.length > 1) setBId(data[data.length - 2]?.id);
      })
      .catch(() => navigate(`/deals/${dealId}`))
      .finally(() => setLoading(false));
  }, [dealId]);

  const modelA = models.find((m) => m.id === aId);
  const modelB = models.find((m) => m.id === bId);

  const options = models.map((m) => ({
    value: m.id,
    label: `${m.model_name || `v${m.version}`}${m.is_active_version ? ' (active)' : ''}`,
  }));

  if (loading) return (
    <PageWrapper>
      <PageHeader title="Compare Models" />
      <Skeleton className="h-96" />
    </PageWrapper>
  );

  if (models.length < 2) return (
    <PageWrapper>
      <PageHeader title="Compare Models" />
      <Card className="text-center py-10">
        <p className="text-[var(--text-secondary)]">You need at least 2 underwriting versions to compare.</p>
      </Card>
    </PageWrapper>
  );

  function cellColor(key: keyof UnderwritingModel, a: any, b: any) {
    if (a === b || a == null || b == null) return '';
    const higherIsBetter: (keyof UnderwritingModel)[] = ['irr', 'npv', 'equity_multiple', 'cash_on_cash_year_1', 'projected_exit_value', 'projected_equity_at_exit'];
    const lowerIsBetter: (keyof UnderwritingModel)[] = ['total_capital_required', 'estimated_renovation_cost'];
    if (higherIsBetter.includes(key)) return a > b ? 'text-success' : a < b ? 'text-danger' : '';
    if (lowerIsBetter.includes(key)) return a < b ? 'text-success' : a > b ? 'text-danger' : '';
    return '';
  }

  return (
    <PageWrapper>
      <PageHeader title="Compare Underwriting Models" />

      {/* Version selectors */}
      <Card padding="sm">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="text-xs font-medium text-[var(--text-secondary)]">Version A</label>
            <Select options={options} value={aId} onChange={(e) => setAId(e.target.value)} fullWidth />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-[var(--text-secondary)]">Version B</label>
            <Select options={options} value={bId} onChange={(e) => setBId(e.target.value)} fullWidth />
          </div>
        </div>
      </Card>

      {/* Comparison table */}
      {modelA && modelB && (
        <Card padding="none" className="overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--border-default)] bg-[var(--bg-elevated)]">
                <th className="text-left px-4 py-3 text-xs font-semibold text-[var(--text-secondary)] w-48">Metric</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-[var(--text-secondary)]">
                  <div className="flex items-center justify-end gap-2">
                    {modelA.model_name || `v${modelA.version}`}
                    {modelA.is_active_version && <Badge variant="brand" size="sm">Active</Badge>}
                  </div>
                </th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-[var(--text-secondary)]">
                  <div className="flex items-center justify-end gap-2">
                    {modelB.model_name || `v${modelB.version}`}
                    {modelB.is_active_version && <Badge variant="brand" size="sm">Active</Badge>}
                  </div>
                </th>
              </tr>
            </thead>
            <tbody>
              {ROWS.map((row, i) => {
                if (row.label.startsWith('─')) {
                  return (
                    <tr key={i} className="bg-[var(--bg-elevated)]">
                      <td colSpan={3} className="px-4 py-2 text-xs text-[var(--text-tertiary)] font-medium tracking-wide">
                        Returns
                      </td>
                    </tr>
                  );
                }
                const vA = (modelA as any)[row.key];
                const vB = (modelB as any)[row.key];
                return (
                  <tr key={i} className="border-b border-[var(--border-subtle)] hover:bg-[var(--bg-elevated)]">
                    <td className="px-4 py-2.5 text-xs text-[var(--text-tertiary)]">{row.label}</td>
                    <td className={cn(
                      'px-4 py-2.5 text-right font-mono text-xs',
                      row.highlight ? 'font-bold' : '',
                      cellColor(row.key, vA, vB)
                    )}>
                      {vA != null ? row.format(vA) : '—'}
                    </td>
                    <td className={cn(
                      'px-4 py-2.5 text-right font-mono text-xs',
                      row.highlight ? 'font-bold' : '',
                      cellColor(row.key, vB, vA)
                    )}>
                      {vB != null ? row.format(vB) : '—'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Card>
      )}
    </PageWrapper>
  );
}
