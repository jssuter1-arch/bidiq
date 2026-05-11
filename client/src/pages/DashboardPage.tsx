import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Building2, FolderOpen, AlertTriangle, TrendingUp } from 'lucide-react';
import ExecutiveDealsCard from '@/components/deals/ExecutiveDealsCard';
import ExecutiveBudgetPerformanceCard from '@/components/budget-lifecycle/ExecutiveBudgetPerformanceCard';
import ExecutivePendingDecisionsCard from '@/components/scenarios/ExecutivePendingDecisionsCard';
import ExecutiveChangeOrderInsightsCard from '@/components/scenarios/ExecutiveChangeOrderInsightsCard';
import { useModuleAccess } from '@/hooks/useModuleAccess';
import CountUp from 'react-countup';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from 'recharts';
import { useNavigate } from 'react-router-dom';
import api from '@/services/api';
import PageWrapper from '@/components/layout/PageWrapper';
import PageHeader from '@/components/layout/PageHeader';
import { StatCard } from '@/components/ui/Card';
import Card from '@/components/ui/Card';
import Badge, { BudgetHealthBadge } from '@/components/ui/Badge';
import ProgressBar from '@/components/ui/ProgressBar';
import Skeleton, { SkeletonCard } from '@/components/ui/Skeleton';
import { formatCurrency, formatDate } from '@/utils/format';

const CHART_COLORS = ['#6366f1', '#22c55e', '#f59e0b', '#3b82f6', '#ec4899', '#14b8a6'];

const stagger = { parent: { animate: { transition: { staggerChildren: 0.08 } } }, child: { initial: { opacity: 0, y: 12 }, animate: { opacity: 1, y: 0 } } };

export default function DashboardPage() {
  const [data, setData] = useState<any>(null);
  const [orgName, setOrgName] = useState('');
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { hasAccess } = useModuleAccess();

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        const [props, projs, notifs, cash, org] = await Promise.all([
          api.get('/v1/properties', { params: { limit: 100 } }),
          api.get('/v1/projects', { params: { limit: 100 } }),
          api.get('/v1/notifications', { params: { limit: 10 } }),
          api.get('/v1/cash/accounts'),
          api.get('/v1/organizations/me'),
        ]);
        setOrgName(org.data.data?.name || '');
        setData({
          properties: props.data.data || [],
          propertiesTotal: props.data.meta?.total || 0,
          projects: projs.data.data || [],
          projectsTotal: projs.data.meta?.total || 0,
          notifications: notifs.data.data || [],
          accounts: cash.data.data || [],
        });
      } catch {
        setData({ properties: [], propertiesTotal: 0, projects: [], projectsTotal: 0, notifications: [], accounts: [] });
      } finally {
        setLoading(false);
      }
    };
    fetchDashboard();
  }, []);

  if (loading) return (
    <PageWrapper>
      <PageHeader title="Dashboard" />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => <SkeletonCard key={i} />)}
      </div>
    </PageWrapper>
  );

  const { projects, propertiesTotal, projectsTotal, notifications, accounts } = data;

  const activeProjects = projects.filter((p: any) => p.status === 'active');
  const totalBudget = activeProjects.reduce((s: number, p: any) => s + (p.current_budget || 0), 0);
  const totalSpend = activeProjects.reduce((s: number, p: any) => s + (p.actual_spend || 0), 0);
  const totalCash = accounts.reduce((s: number, a: any) => s + (a.current_balance || 0), 0);
  const overBudget = activeProjects.filter((p: any) => p.actual_spend > p.current_budget).length;
  const budgetPct = totalBudget > 0 ? (totalSpend / totalBudget) * 100 : 0;

  const budgetChartData = activeProjects.slice(0, 6).map((p: any) => ({
    name: p.name.length > 16 ? p.name.slice(0, 14) + '…' : p.name,
    budget: p.current_budget,
    spend: p.actual_spend,
  }));

  const statusGroups = projects.reduce((acc: any, p: any) => {
    acc[p.status] = (acc[p.status] || 0) + 1;
    return acc;
  }, {});

  const pieData = Object.entries(statusGroups).map(([name, value]) => ({ name, value }));

  const unreadAlerts = notifications.filter((n: any) => !n.is_read);

  return (
    <PageWrapper>
      <PageHeader
        title="Dashboard"
        subtitle={orgName ? `Portfolio overview — ${orgName}` : 'Portfolio overview'}
      />

      <motion.div
        variants={stagger.parent}
        initial="initial"
        animate="animate"
        className="grid grid-cols-2 lg:grid-cols-4 gap-4"
      >
        {[
          { label: 'Properties', value: propertiesTotal, icon: <Building2 className="w-4 h-4" />, subtitle: 'Total portfolio' },
          { label: 'Active Projects', value: activeProjects.length, icon: <FolderOpen className="w-4 h-4" />, subtitle: `${projectsTotal} total` },
          { label: 'Portfolio Budget', value: formatCurrency(totalBudget, true), icon: <TrendingUp className="w-4 h-4" />, subtitle: `${formatCurrency(totalSpend, true)} spent` },
          { label: 'Cash On Hand', value: formatCurrency(totalCash, true), icon: <TrendingUp className="w-4 h-4" />, subtitle: `${accounts.length} accounts` },
        ].map((kpi, i) => (
          <motion.div key={i} variants={stagger.child}>
            <Card className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs text-[var(--text-secondary)] uppercase tracking-wider">{kpi.label}</span>
                <span className="text-[var(--text-tertiary)]">{kpi.icon}</span>
              </div>
              <div className="text-2xl font-heading font-semibold font-financial text-[var(--text-primary)]">
                {typeof kpi.value === 'number' ? <CountUp end={kpi.value} duration={1.2} /> : kpi.value}
              </div>
              <p className="text-xs text-[var(--text-tertiary)]">{kpi.subtitle}</p>
            </Card>
          </motion.div>
        ))}
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-[var(--text-primary)]">Budget vs. Spend by Project</h3>
            <span className="text-xs text-[var(--text-tertiary)]">Active projects</span>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={budgetChartData} barGap={4} barCategoryGap="30%">
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: 'var(--text-tertiary)' }} axisLine={false} tickLine={false} />
              <YAxis tickFormatter={(v) => formatCurrency(v, true)} tick={{ fontSize: 11, fill: 'var(--text-tertiary)' }} axisLine={false} tickLine={false} />
              <Tooltip
                contentStyle={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-default)', borderRadius: 8, fontSize: 12 }}
                formatter={(v: number) => [formatCurrency(v), '']}
              />
              <Bar dataKey="budget" fill="var(--brand-500)" opacity={0.4} radius={[4, 4, 0, 0]} name="Budget" />
              <Bar dataKey="spend" fill="var(--brand-500)" radius={[4, 4, 0, 0]} name="Spent" />
            </BarChart>
          </ResponsiveContainer>
          {totalBudget > 0 && (
            <div className="pt-1 space-y-1">
              <div className="flex justify-between text-xs text-[var(--text-tertiary)]">
                <span>Portfolio spend</span>
                <span className="font-mono">{budgetPct.toFixed(1)}% of budget</span>
              </div>
              <ProgressBar value={budgetPct} showLabel={false} size="md" />
            </div>
          )}
        </Card>

        <Card className="space-y-3">
          <h3 className="text-sm font-semibold text-[var(--text-primary)]">Project Status</h3>
          {pieData.length > 0 ? (
            <ResponsiveContainer width="100%" height={180}>
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" innerRadius={50} outerRadius={75} dataKey="value" paddingAngle={3}>
                  {pieData.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                </Pie>
                <Tooltip contentStyle={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-default)', borderRadius: 8, fontSize: 12 }} />
                <Legend iconSize={8} iconType="circle" formatter={(v) => <span style={{ color: 'var(--text-secondary)', fontSize: 11, textTransform: 'capitalize' }}>{v}</span>} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-40 flex items-center justify-center text-sm text-[var(--text-tertiary)]">No projects yet</div>
          )}
        </Card>
      </div>

      {(hasAccess('deal_intelligence') || hasAccess('budget_lifecycle') || hasAccess('scenario_modeling') || hasAccess('cost_intelligence_extended')) && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {hasAccess('deal_intelligence') && (
            <div className="lg:col-span-1">
              <ExecutiveDealsCard />
            </div>
          )}
          {hasAccess('budget_lifecycle') && (
            <div className="lg:col-span-1">
              <ExecutiveBudgetPerformanceCard />
            </div>
          )}
          {hasAccess('scenario_modeling') && (
            <div className="lg:col-span-1">
              <ExecutivePendingDecisionsCard />
            </div>
          )}
          {hasAccess('cost_intelligence_extended') && (
            <div className="lg:col-span-1">
              <ExecutiveChangeOrderInsightsCard />
            </div>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-[var(--text-primary)]">Active Projects</h3>
            {overBudget > 0 && <Badge variant="danger" dot>{overBudget} over budget</Badge>}
          </div>
          <div className="space-y-2">
            {activeProjects.length === 0 && <p className="text-sm text-[var(--text-tertiary)] py-4 text-center">No active projects</p>}
            {activeProjects.slice(0, 5).map((p: any) => {
              const pct = p.current_budget > 0 ? (p.actual_spend / p.current_budget) * 100 : 0;
              return (
                <div
                  key={p.id}
                  onClick={() => navigate(`/projects/${p.id}`)}
                  className="flex items-center gap-3 p-2 rounded-lg hover:bg-[var(--bg-elevated)] cursor-pointer transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-[var(--text-primary)] truncate">{p.name}</p>
                    <p className="text-xs text-[var(--text-tertiary)]">{p.properties?.name}</p>
                  </div>
                  <div className="w-28 space-y-1">
                    <ProgressBar value={pct} size="xs" />
                    <p className="text-right text-2xs font-mono text-[var(--text-tertiary)]">{formatCurrency(p.actual_spend, true)} / {formatCurrency(p.current_budget, true)}</p>
                  </div>
                  <BudgetHealthBadge pct={pct} />
                </div>
              );
            })}
          </div>
        </Card>

        <Card className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-[var(--text-primary)]">Alerts</h3>
            {unreadAlerts.length > 0 && <Badge variant="warning">{unreadAlerts.length} unread</Badge>}
          </div>
          <div className="space-y-2">
            {unreadAlerts.length === 0 && <p className="text-sm text-[var(--text-tertiary)] py-4 text-center">No alerts</p>}
            {unreadAlerts.slice(0, 5).map((n: any) => (
              <div
                key={n.id}
                onClick={() => navigate(n.link || '/notifications')}
                className="flex gap-3 p-2 rounded-lg hover:bg-[var(--bg-elevated)] cursor-pointer transition-colors"
              >
                <AlertTriangle className="w-4 h-4 text-warning flex-shrink-0 mt-0.5" />
                <div className="min-w-0">
                  <p className="text-xs font-medium text-[var(--text-primary)]">{n.title}</p>
                  <p className="text-xs text-[var(--text-secondary)] truncate">{n.message}</p>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </PageWrapper>
  );
}
