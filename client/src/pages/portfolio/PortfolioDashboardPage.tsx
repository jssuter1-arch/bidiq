import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  AreaChart, Area, CartesianGrid,
} from 'recharts';
import {
  Building2, TrendingUp, DollarSign, Briefcase,
  GitBranch, Building2 as DealIcon, GitCommit, AlertTriangle,
  FileWarning, Clock, RefreshCw, FileDown,
} from 'lucide-react';
import api from '@/services/api';
import PageWrapper from '@/components/layout/PageWrapper';
import PageHeader from '@/components/layout/PageHeader';
import Card from '@/components/ui/Card';
import Badge, { BudgetHealthBadge } from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import ProgressBar from '@/components/ui/ProgressBar';
import Skeleton, { SkeletonCard } from '@/components/ui/Skeleton';
import { formatCurrency, formatDate } from '@/utils/format';
import CountUp from 'react-countup';

const stagger = {
  parent: { animate: { transition: { staggerChildren: 0.07 } } },
  child: { initial: { opacity: 0, y: 12 }, animate: { opacity: 1, y: 0 } },
};

const STATUS_COLOR: Record<string, string> = {
  prospecting: '#6366f1',
  underwriting: '#3b82f6',
  loi_submitted: '#f59e0b',
  under_negotiation: '#ec4899',
  due_diligence: '#14b8a6',
  closed_won: '#22c55e',
  closed_lost: '#ef4444',
  passed: '#94a3b8',
};

type HubItem = {
  id: string;
  type: string;
  title: string;
  context: string;
  open_url: string;
  urgency: string;
  amount?: number;
};

export default function PortfolioDashboardPage() {
  const navigate = useNavigate();
  const [summary, setSummary] = useState<any>(null);
  const [hubItems, setHubItems] = useState<HubItem[]>([]);
  const [savingsTrend, setSavingsTrend] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = async () => {
    try {
      const [sum, hub, savings] = await Promise.all([
        api.get('/v1/portfolio/summary'),
        api.get('/v1/decision-hub'),
        api.get('/v1/portfolio/savings'),
      ]);
      setSummary(sum.data.data);
      setHubItems((hub.data.data?.items || []).slice(0, 8));
      setSavingsTrend(savings.data.data?.trend || []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleRefresh = async () => {
    setRefreshing(true);
    await api.post('/v1/decision-hub/invalidate');
    await load();
    setRefreshing(false);
  };

  if (loading) return (
    <PageWrapper>
      <PageHeader title="Portfolio Performance" />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => <SkeletonCard key={i} />)}
      </div>
    </PageWrapper>
  );

  const { executive_sentence, kpis, active_projects, pipeline_by_status, savings } = summary || {};
  const activeProjects: any[] = active_projects || [];

  const budgetChartData = activeProjects.slice(0, 8).map((p: any) => {
    const pct = p.current_budget > 0 ? (p.actual_spend / p.current_budget) * 100 : 0;
    return {
      name: p.name.length > 18 ? p.name.slice(0, 16) + '…' : p.name,
      pct: Math.min(pct, 120),
      status: pct >= 100 ? 'red' : pct >= 85 ? 'amber' : 'green',
      raw_pct: pct,
    };
  });

  const pipelineData = Object.entries(pipeline_by_status || {}).map(([status, count]) => ({
    status: status.replace('_', ' '),
    count,
    color: STATUS_COLOR[status] || '#94a3b8',
  }));

  const hubIconMap: Record<string, React.ReactNode> = {
    scenario_decision: <GitBranch className="w-4 h-4 text-brand-400" />,
    deal_promotion: <DealIcon className="w-4 h-4 text-blue-400" />,
    change_order_categorization: <GitCommit className="w-4 h-4 text-amber-400" />,
    budget_alert: <AlertTriangle className="w-4 h-4 text-danger" />,
    permit_expiring: <FileWarning className="w-4 h-4 text-warning" />,
    underwriting_stale: <Clock className="w-4 h-4 text-[var(--text-tertiary)]" />,
  };

  return (
    <PageWrapper>
      <PageHeader
        title="Portfolio Performance"
        subtitle={`Overview as of ${formatDate(new Date().toISOString())}`}
        actions={
          <div className="flex items-center gap-2">
            <Button variant="secondary" size="sm" iconLeft={<RefreshCw className="w-3.5 h-3.5" />}
              loading={refreshing} onClick={handleRefresh}>Refresh</Button>
            <Button size="sm" iconLeft={<FileDown className="w-3.5 h-3.5" />}
              onClick={() => window.print()}>Export Summary</Button>
          </div>
        }
      />

      {/* Executive Sentence */}
      {executive_sentence && (
        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}>
          <Card className="bg-brand-500/5 border-brand-500/20">
            <p className="text-[22px] font-heading font-semibold text-[var(--text-primary)] leading-snug">
              {executive_sentence}
            </p>
          </Card>
        </motion.div>
      )}

      {/* Headline KPIs */}
      <motion.div variants={stagger.parent} initial="initial" animate="animate"
        className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Portfolio Value', value: kpis?.total_portfolio_value, icon: <Building2 className="w-4 h-4" />, isCurrency: true, onClick: () => navigate('/properties') },
          { label: 'Active Capital Deployed', value: kpis?.active_capital_deployed, icon: <TrendingUp className="w-4 h-4" />, isCurrency: true, onClick: () => navigate('/projects') },
          { label: 'BidIQ Savings YTD', value: kpis?.bidiq_savings_ytd, icon: <DollarSign className="w-4 h-4" />, isCurrency: true, onClick: () => navigate('/portfolio/cost-savings') },
          { label: 'Deals in Flight', value: kpis?.deals_in_flight, icon: <Briefcase className="w-4 h-4" />, isCurrency: false, onClick: () => navigate('/deals') },
        ].map((kpi, i) => (
          <motion.div key={i} variants={stagger.child}>
            <Card hover onClick={kpi.onClick} className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs text-[var(--text-secondary)] uppercase tracking-wider">{kpi.label}</span>
                <span className="text-[var(--text-tertiary)]">{kpi.icon}</span>
              </div>
              <div className="text-2xl font-heading font-semibold font-financial text-[var(--text-primary)]">
                {kpi.isCurrency
                  ? formatCurrency(kpi.value, true)
                  : <CountUp end={kpi.value || 0} duration={1.2} />}
              </div>
            </Card>
          </motion.div>
        ))}
      </motion.div>

      {/* Portfolio Health + Pending Decisions */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        <Card className="lg:col-span-3 space-y-3">
          <h3 className="text-sm font-semibold text-[var(--text-primary)]">Portfolio Health</h3>
          {budgetChartData.length === 0
            ? <p className="text-sm text-[var(--text-tertiary)] py-8 text-center">No active projects</p>
            : (
              <ResponsiveContainer width="100%" height={Math.max(160, budgetChartData.length * 36)}>
                <BarChart data={budgetChartData} layout="vertical" margin={{ left: 0, right: 32 }}>
                  <XAxis type="number" domain={[0, 110]} tickFormatter={(v) => `${v}%`}
                    tick={{ fontSize: 10, fill: 'var(--text-tertiary)' }} axisLine={false} tickLine={false} />
                  <YAxis type="category" dataKey="name" width={130}
                    tick={{ fontSize: 11, fill: 'var(--text-secondary)' }} axisLine={false} tickLine={false} />
                  <Tooltip
                    contentStyle={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-default)', borderRadius: 8, fontSize: 12 }}
                    formatter={(v: number) => [`${v.toFixed(1)}% of budget`, '']}
                  />
                  <Bar dataKey="pct" radius={[0, 4, 4, 0]} fill="var(--brand-500)"
                    onClick={(d: any) => { const p = activeProjects.find((pr) => pr.name.startsWith(d.name.replace('…', ''))); if (p) navigate(`/projects/${p.id}`); }}
                  />
                </BarChart>
              </ResponsiveContainer>
            )
          }
        </Card>

        <Card className="lg:col-span-2 space-y-2">
          <div className="flex items-center justify-between mb-1">
            <h3 className="text-sm font-semibold text-[var(--text-primary)]">Awaiting Your Decision</h3>
            {hubItems.length > 0 && <Badge variant="warning">{hubItems.length}</Badge>}
          </div>
          {hubItems.length === 0
            ? <p className="text-sm text-[var(--text-tertiary)] py-4 text-center">All clear — no pending actions.</p>
            : (
              <div className="space-y-2">
                {hubItems.map((item) => (
                  <div key={item.id}
                    onClick={() => navigate(item.open_url)}
                    className="flex gap-3 p-2 rounded-lg hover:bg-[var(--bg-elevated)] cursor-pointer transition-colors">
                    <span className="flex-shrink-0 mt-0.5">{hubIconMap[item.type] || <AlertTriangle className="w-4 h-4" />}</span>
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-[var(--text-primary)] truncate">{item.title}</p>
                      <p className="text-xs text-[var(--text-tertiary)] truncate">{item.context}</p>
                    </div>
                    {item.urgency === 'today' && <Badge variant="danger" className="flex-shrink-0 self-start">Today</Badge>}
                  </div>
                ))}
                <button onClick={() => navigate('/decision-hub')}
                  className="w-full text-xs text-brand-400 hover:text-brand-300 text-right pt-1 transition-colors">
                  View Decision Hub →
                </button>
              </div>
            )
          }
        </Card>
      </div>

      {/* Cost Savings Story + Track Record */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-[var(--text-primary)]">BidIQ Savings YTD</h3>
          </div>
          <div className="text-4xl font-heading font-bold font-financial text-brand-400"
            style={{ textShadow: '0 0 24px var(--brand-500, #6366f1)40' }}>
            {formatCurrency(kpis?.bidiq_savings_ytd || 0)}
          </div>
          {savingsTrend.length > 0 && (
            <ResponsiveContainer width="100%" height={120}>
              <AreaChart data={savingsTrend}>
                <defs>
                  <linearGradient id="savingsGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--brand-500)" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="var(--brand-500)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" vertical={false} />
                <XAxis dataKey="month" tick={{ fontSize: 9, fill: 'var(--text-tertiary)' }} axisLine={false} tickLine={false} interval={3} />
                <YAxis hide />
                <Tooltip contentStyle={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-default)', borderRadius: 8, fontSize: 12 }}
                  formatter={(v: number) => [formatCurrency(v), 'Cumulative Savings']} />
                <Area type="monotone" dataKey="cumulative" stroke="var(--brand-500)" fill="url(#savingsGrad)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          )}
          <div className="grid grid-cols-3 gap-2 pt-1">
            {[
              { label: 'Under-Budget', value: savings?.components?.renovation_under_budget || 0 },
              { label: 'Overpay Caught', value: savings?.components?.overpay_caught || 0 },
              { label: 'CO Discipline', value: savings?.components?.change_order_discipline || 0 },
            ].map((c) => (
              <div key={c.label} className="text-center p-2 rounded-lg bg-[var(--bg-elevated)]">
                <p className="text-xs font-mono font-semibold text-[var(--text-primary)]">{formatCurrency(c.value, true)}</p>
                <p className="text-2xs text-[var(--text-tertiary)] mt-0.5">{c.label}</p>
              </div>
            ))}
          </div>
          <button onClick={() => navigate('/portfolio/cost-savings')}
            className="text-xs text-brand-400 hover:text-brand-300 transition-colors">
            View detailed breakdown →
          </button>
        </Card>

        <Card className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-[var(--text-primary)]">Active Projects</h3>
          </div>
          <div className="space-y-2">
            {activeProjects.length === 0
              ? <p className="text-sm text-[var(--text-tertiary)] py-4 text-center">No active projects</p>
              : activeProjects.slice(0, 5).map((p: any) => {
                const pct = p.current_budget > 0 ? (p.actual_spend / p.current_budget) * 100 : 0;
                return (
                  <div key={p.id} onClick={() => navigate(`/projects/${p.id}`)}
                    className="flex items-center gap-3 p-2 rounded-lg hover:bg-[var(--bg-elevated)] cursor-pointer transition-colors">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-[var(--text-primary)] truncate">{p.name}</p>
                      <p className="text-xs text-[var(--text-tertiary)]">{(p.properties as any)?.name}</p>
                    </div>
                    <div className="w-28 space-y-1">
                      <ProgressBar value={pct} size="xs" />
                      <p className="text-right text-2xs font-mono text-[var(--text-tertiary)]">
                        {formatCurrency(p.actual_spend, true)} / {formatCurrency(p.current_budget, true)}
                      </p>
                    </div>
                    <BudgetHealthBadge pct={pct} />
                  </div>
                );
              })}
          </div>
          <button onClick={() => navigate('/lender-dossier')}
            className="text-xs text-brand-400 hover:text-brand-300 transition-colors">
            Generate Lender Dossier →
          </button>
        </Card>
      </div>

      {/* Pipeline Snapshot */}
      {pipelineData.length > 0 && (
        <Card className="space-y-3">
          <h3 className="text-sm font-semibold text-[var(--text-primary)]">Pipeline Snapshot</h3>
          <div className="flex gap-3 overflow-x-auto pb-1">
            {pipelineData.map((s) => (
              <button key={s.status}
                onClick={() => navigate('/deals')}
                className="flex-shrink-0 flex flex-col items-center gap-1.5 px-5 py-3 rounded-xl border border-[var(--border-subtle)] hover:border-[var(--border-strong)] transition-colors">
                <span className="text-2xl font-heading font-bold" style={{ color: s.color }}>
                  {s.count as number}
                </span>
                <span className="text-xs text-[var(--text-tertiary)] capitalize whitespace-nowrap">{s.status}</span>
              </button>
            ))}
          </div>
        </Card>
      )}
    </PageWrapper>
  );
}
