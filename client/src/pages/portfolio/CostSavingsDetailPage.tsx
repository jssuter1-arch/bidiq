import { useEffect, useState } from 'react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { ChevronDown, ChevronRight } from 'lucide-react';
import api from '@/services/api';
import PageWrapper from '@/components/layout/PageWrapper';
import PageHeader from '@/components/layout/PageHeader';
import Card from '@/components/ui/Card';
import { SkeletonCard } from '@/components/ui/Skeleton';
import { formatCurrency } from '@/utils/format';

function MethodologyAccordion() {
  const [open, setOpen] = useState(false);
  return (
    <Card>
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between text-sm font-semibold text-[var(--text-primary)]"
      >
        <span>Methodology & Transparency</span>
        {open ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
      </button>
      {open && (
        <div className="mt-4 space-y-3 text-xs text-[var(--text-secondary)] leading-relaxed">
          <p><strong className="text-[var(--text-primary)]">Renovation Under-Budget Savings:</strong> Sum of (bank-declared budget minus actual spend) for all projects that completed this year with both a bank-declared budget snapshot and a completion snapshot. Only projects where actual spend was strictly below the bank-declared budget are counted. Source: Phase 3 budget lifecycle data.</p>
          <p><strong className="text-[var(--text-primary)]">Overpay Caught:</strong> Invoices flagged by the cost intelligence system as priced above benchmark, where the invoice was either rejected (no payment made) or renegotiated to a lower amount. Only realized savings are counted — dismissed flags with full payment are excluded. Source: Phase 5 cost intelligence flag system.</p>
          <p><strong className="text-[var(--text-primary)]">Change Order Discipline:</strong> Estimated based on the gap between your organization's change-order rate and the cross-tenant industry average. A conservative 0.5 attribution multiplier is applied — 50% of outperformance is attributed to BidIQ, 50% to your organization's own discipline. This component is only displayed when sufficient cross-tenant benchmark data is available. If you have opted out of cross-tenant participation, this component will read $0.</p>
          <p className="text-[var(--text-tertiary)]">All figures are BidIQ-attributable estimates based on observable platform data. They are not audited financial statements. Use as directional indicators and consult your accountant for financial reporting purposes. Methodology version: v1.</p>
        </div>
      )}
    </Card>
  );
}

export default function CostSavingsDetailPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/v1/portfolio/savings')
      .then((r) => setData(r.data.data))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <PageWrapper>
      <PageHeader title="Cost Savings Detail" />
      <div className="space-y-4">{[...Array(3)].map((_, i) => <SkeletonCard key={i} />)}</div>
    </PageWrapper>
  );

  const ytd = data?.ytd;
  const trend: Array<{ month: string; cumulative: number }> = data?.trend || [];
  const components = ytd?.components || {};

  return (
    <PageWrapper>
      <PageHeader
        title="Cost Savings Detail"
        subtitle="Year-to-date breakdown of BidIQ-attributable value"
      />

      {/* Hero */}
      <Card className="text-center py-8">
        <p className="text-xs text-[var(--text-tertiary)] uppercase tracking-widest mb-2">Total BidIQ-Attributable Savings YTD</p>
        <p className="text-[56px] font-heading font-bold font-financial text-brand-400 leading-none"
          style={{ textShadow: '0 0 32px var(--brand-500)40' }}>
          {formatCurrency(ytd?.total_ytd || 0)}
        </p>
        <p className="text-sm text-[var(--text-tertiary)] mt-3 max-w-xl mx-auto">
          Computed from completed-project performance data, invoice renegotiations, and cross-tenant change-order benchmarks.
          Methodology is conservative by design.
        </p>
      </Card>

      {/* Component Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          {
            label: 'Renovation Under-Budget',
            value: components.renovation_under_budget || 0,
            note: 'Projects completing under bank-declared budget. Only includes projects with verified bank-declared snapshots.',
          },
          {
            label: 'Overpay Caught',
            value: components.overpay_caught || 0,
            note: 'Invoices flagged above benchmark that were rejected or renegotiated. Only realized savings counted.',
          },
          {
            label: 'Change Order Discipline',
            value: components.change_order_discipline || 0,
            note: components.change_order_discipline > 0
              ? 'Estimated from below-industry CO rate. 0.5× attribution multiplier applied.'
              : 'Enable cross-tenant benchmarks or opt in to participation to see this estimate.',
          },
        ].map((comp) => (
          <Card key={comp.label} className="space-y-3">
            <h4 className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider">{comp.label}</h4>
            <p className="text-3xl font-heading font-bold font-financial text-[var(--text-primary)]">
              {formatCurrency(comp.value, true)}
            </p>
            <p className="text-xs text-[var(--text-tertiary)] leading-relaxed">{comp.note}</p>
          </Card>
        ))}
      </div>

      {/* Trend Chart */}
      {trend.length > 0 && (
        <Card className="space-y-3">
          <h3 className="text-sm font-semibold text-[var(--text-primary)]">Cumulative Savings — Trailing 24 Months</h3>
          <ResponsiveContainer width="100%" height={240}>
            <AreaChart data={trend}>
              <defs>
                <linearGradient id="trendGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--brand-500)" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="var(--brand-500)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" vertical={false} />
              <XAxis dataKey="month" tick={{ fontSize: 10, fill: 'var(--text-tertiary)' }} axisLine={false} tickLine={false} interval={2} />
              <YAxis tickFormatter={(v) => formatCurrency(v, true)} tick={{ fontSize: 10, fill: 'var(--text-tertiary)' }} axisLine={false} tickLine={false} />
              <Tooltip
                contentStyle={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-default)', borderRadius: 8, fontSize: 12 }}
                formatter={(v: number) => [formatCurrency(v), 'Cumulative Savings']}
              />
              <Area type="monotone" dataKey="cumulative" stroke="var(--brand-500)" fill="url(#trendGrad)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </Card>
      )}

      <MethodologyAccordion />
    </PageWrapper>
  );
}
