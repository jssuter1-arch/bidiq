import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { GitBranch } from 'lucide-react';
import Card from '@/components/ui/Card';
import Skeleton from '@/components/ui/Skeleton';
import api from '@/services/api';
import type { ScenarioComparison } from '@/types/scenarios';

export default function ExecutivePendingDecisionsCard() {
  const navigate = useNavigate();
  const [comparisons, setComparisons] = useState<ScenarioComparison[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/v1/scenario-comparisons', { params: { decisionStatus: 'open' } })
      .then((r) => setComparisons(r.data.data ?? []))
      .catch(() => setComparisons([]))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <Skeleton className="h-40 rounded-xl" />;
  if (comparisons.length === 0) return null;

  return (
    <Card
      className="cursor-pointer hover:border-[var(--border-strong)] transition-colors"
      onClick={() => navigate('/scenarios')}
    >
      <div className="flex items-center justify-between mb-3">
        <div>
          <p className="text-sm font-semibold text-[var(--text-primary)]">Pending Decisions</p>
          <p className="text-xs text-[var(--text-secondary)] mt-0.5">
            {comparisons.length} scenario comparison{comparisons.length !== 1 ? 's' : ''} awaiting decision
          </p>
        </div>
        <GitBranch className="w-5 h-5 text-brand-400" />
      </div>

      <div className="space-y-2">
        {comparisons.slice(0, 4).map((c) => (
          <button
            key={c.id}
            onClick={(e) => { e.stopPropagation(); navigate(`/scenarios/compare/${c.id}`); }}
            className="w-full text-left rounded-lg p-2.5 bg-[var(--bg-elevated)] hover:bg-[var(--bg-overlay)] transition-colors"
          >
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs font-medium text-[var(--text-primary)] truncate">{c.comparison_name}</p>
              <span className="text-xs text-[var(--text-tertiary)] flex-shrink-0">
                {c.scenario_ids?.length ?? 0} scenarios
              </span>
            </div>
          </button>
        ))}
      </div>

      <p className="text-xs text-brand-400 mt-3 font-medium">View All →</p>
    </Card>
  );
}
