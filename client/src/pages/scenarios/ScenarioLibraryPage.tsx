import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { GitBranch, LayoutGrid, List } from 'lucide-react';
import PageWrapper from '@/components/layout/PageWrapper';
import PageHeader from '@/components/layout/PageHeader';
import Button from '@/components/ui/Button';
import EmptyState from '@/components/ui/EmptyState';
import Skeleton from '@/components/ui/Skeleton';
import Badge from '@/components/ui/Badge';
import ScenarioCard from '@/components/scenarios/ScenarioCard';
import { formatCurrency, formatPercent } from '@/utils/format';
import api from '@/services/api';
import type { Scenario } from '@/types/scenarios';

export default function ScenarioLibraryPage() {
  const navigate = useNavigate();
  const [scenarios, setScenarios] = useState<Scenario[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'table' | 'cards'>('table');
  const [decisionStatus, setDecisionStatus] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = {};
      if (decisionStatus) params.decisionStatus = decisionStatus;
      const { data } = await api.get('/v1/scenarios', { params });
      setScenarios(data.data ?? []);
    } catch {
      setScenarios([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [decisionStatus]);

  if (loading) return (
    <PageWrapper>
      <Skeleton className="h-8 w-48" />
      <div className="space-y-2">
        {[1, 2, 3].map((i) => <Skeleton key={i} className="h-16 rounded-xl" />)}
      </div>
    </PageWrapper>
  );

  return (
    <PageWrapper>
      <PageHeader
        title="Scenarios"
        subtitle="What-if analyses across your portfolio."
        actions={
          <div className="flex items-center gap-2">
            <select
              value={decisionStatus}
              onChange={(e) => setDecisionStatus(e.target.value)}
              className="h-8 rounded-lg border border-[var(--border-default)] bg-[var(--bg-elevated)] text-sm px-2 text-[var(--text-primary)]"
            >
              <option value="">All decisions</option>
              <option value="open">Open</option>
              <option value="decided">Decided</option>
              <option value="recommended">Recommended</option>
            </select>
            <button
              onClick={() => setView('table')}
              className={`p-1.5 rounded-lg transition-colors ${view === 'table' ? 'bg-brand-500/10 text-brand-400' : 'text-[var(--text-tertiary)] hover:bg-[var(--bg-elevated)]'}`}
            >
              <List className="w-4 h-4" />
            </button>
            <button
              onClick={() => setView('cards')}
              className={`p-1.5 rounded-lg transition-colors ${view === 'cards' ? 'bg-brand-500/10 text-brand-400' : 'text-[var(--text-tertiary)] hover:bg-[var(--bg-elevated)]'}`}
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <Button iconLeft={<GitBranch className="w-3.5 h-3.5" />} onClick={() => navigate('/scenarios/new')}>
              + New Scenario
            </Button>
          </div>
        }
      />

      {scenarios.length === 0 ? (
        <EmptyState
          icon={<GitBranch className="w-6 h-6" />}
          title="No scenarios yet"
          description="Build your first what-if analysis to compare paths before committing capital."
          action={{ label: '+ New Scenario', onClick: () => navigate('/scenarios/new') }}
        />
      ) : view === 'cards' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {scenarios.map((s) => <ScenarioCard key={s.id} scenario={s} />)}
        </div>
      ) : (
        <div className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-surface)] overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-[var(--bg-elevated)] border-b border-[var(--border-subtle)]">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wide">Scenario</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wide">NPV</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wide">IRR</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wide">Payback</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wide">Capital</th>
                <th className="px-4 py-3 text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wide">Hurdle</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-subtle)]">
              {scenarios.map((s) => (
                <tr
                  key={s.id}
                  onClick={() => navigate(`/scenarios/${s.id}`)}
                  className="hover:bg-[var(--bg-elevated)] cursor-pointer transition-colors"
                >
                  <td className="px-4 py-3">
                    <p className="font-medium text-[var(--text-primary)] truncate max-w-xs">{s.scenario_name}</p>
                    <div className="flex gap-1 mt-0.5">
                      {s.is_baseline && <Badge variant="default" size="sm">Baseline</Badge>}
                      {s.is_recommended && <Badge variant="brand" size="sm">Recommended</Badge>}
                    </div>
                  </td>
                  <td className={`px-4 py-3 text-right font-financial font-semibold ${(s.npv ?? 0) >= 0 ? 'text-success' : 'text-danger'}`}>
                    {s.npv !== null ? formatCurrency(s.npv, true) : '—'}
                  </td>
                  <td className={`px-4 py-3 text-right font-financial font-semibold ${s.meets_hurdle ? 'text-success' : s.irr !== null ? 'text-warning' : 'text-[var(--text-secondary)]'}`}>
                    {s.irr !== null ? formatPercent(s.irr * 100) : '—'}
                  </td>
                  <td className="px-4 py-3 text-right font-financial text-[var(--text-primary)]">
                    {s.payback_months !== null ? `${Math.round(s.payback_months)}mo` : '—'}
                  </td>
                  <td className="px-4 py-3 text-right font-financial text-[var(--text-primary)]">
                    {formatCurrency(s.total_capital_required, true)}
                  </td>
                  <td className="px-4 py-3">
                    {s.meets_hurdle
                      ? <Badge variant="success" size="sm">Meets Hurdle</Badge>
                      : (s.npv ?? 0) < 0
                      ? <Badge variant="danger" size="sm">Negative NPV</Badge>
                      : <Badge variant="warning" size="sm">Below Hurdle</Badge>
                    }
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </PageWrapper>
  );
}
