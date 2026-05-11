import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ExternalLink, GitMerge } from 'lucide-react';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { formatCurrency } from '@/utils/format';
import api from '@/services/api';
import type { Scenario, ScenarioComparison } from '@/types/scenarios';

interface Props {
  scenario: Scenario;
  canWrite?: boolean;
}

export default function ScenarioRelatedSidebar({ scenario, canWrite }: Props) {
  const navigate = useNavigate();
  const [comparisons, setComparisons] = useState<ScenarioComparison[]>([]);
  const [siblings, setSiblings] = useState<Scenario[]>([]);

  useEffect(() => {
    const load = async () => {
      try {
        const attachKey = scenario.property_id ? 'propertyId' : 'dealId';
        const attachVal = scenario.property_id ?? scenario.deal_id;
        const [compRes, sibRes] = await Promise.all([
          api.get('/v1/scenario-comparisons', { params: { [attachKey]: attachVal } }),
          api.get('/v1/scenarios', { params: { [attachKey]: attachVal } }),
        ]);
        const allComps: ScenarioComparison[] = compRes.data.data ?? [];
        setComparisons(allComps.filter((c) => (c.scenario_ids ?? []).includes(scenario.id)));
        const allScenarios: Scenario[] = sibRes.data.data ?? [];
        setSiblings(allScenarios.filter((s) => s.id !== scenario.id));
      } catch { /* non-fatal */ }
    };
    load();
  }, [scenario]);

  return (
    <div className="w-64 flex-shrink-0 space-y-4">
      <Card padding="sm">
        <p className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wide mb-3">Comparison Groups</p>
        {comparisons.length === 0 ? (
          <div className="space-y-2">
            <p className="text-xs text-[var(--text-tertiary)]">Not in any comparison</p>
            {canWrite && (
              <Button
                variant="ghost"
                size="sm"
                iconLeft={<GitMerge className="w-3.5 h-3.5" />}
                onClick={() => navigate('/scenarios')}
              >
                Compare with another
              </Button>
            )}
          </div>
        ) : (
          <div className="space-y-2">
            {comparisons.map((c) => (
              <button
                key={c.id}
                onClick={() => navigate(`/scenarios/compare/${c.id}`)}
                className="w-full text-left rounded-lg p-2 hover:bg-[var(--bg-elevated)] transition-colors"
              >
                <p className="text-xs font-medium text-brand-400 truncate">{c.comparison_name}</p>
                <p className="text-xs text-[var(--text-tertiary)]">{c.scenario_ids?.length ?? 0} scenarios</p>
              </button>
            ))}
          </div>
        )}
      </Card>

      {siblings.length > 0 && (
        <Card padding="sm">
          <p className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wide mb-3">Other Scenarios</p>
          <div className="space-y-2">
            {siblings.slice(0, 5).map((s) => (
              <button
                key={s.id}
                onClick={() => navigate(`/scenarios/${s.id}`)}
                className="w-full text-left rounded-lg p-2 hover:bg-[var(--bg-elevated)] transition-colors"
              >
                <p className="text-xs font-medium text-[var(--text-primary)] truncate">{s.scenario_name}</p>
                <p className={`text-xs font-financial ${s.npv !== null && s.npv >= 0 ? 'text-success' : 'text-danger'}`}>
                  NPV {s.npv !== null ? formatCurrency(s.npv, true) : '—'}
                </p>
              </button>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
