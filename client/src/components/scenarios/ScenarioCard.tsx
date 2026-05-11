import { useNavigate } from 'react-router-dom';
import { CheckCircle, AlertTriangle } from 'lucide-react';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import { formatCurrency, formatPercent } from '@/utils/format';
import type { Scenario } from '@/types/scenarios';

interface Props {
  scenario: Scenario;
}

export default function ScenarioCard({ scenario }: Props) {
  const navigate = useNavigate();
  const npv = scenario.npv ?? 0;
  const irr = scenario.irr;
  const meetsHurdle = scenario.meets_hurdle;

  return (
    <Card
      hover
      onClick={() => navigate(`/scenarios/${scenario.id}`)}
      className="flex flex-col gap-3"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-[var(--text-primary)] truncate">{scenario.scenario_name}</p>
          {scenario.description && (
            <p className="text-xs text-[var(--text-secondary)] mt-0.5 line-clamp-2">{scenario.description}</p>
          )}
        </div>
        <div className="flex flex-col items-end gap-1 flex-shrink-0">
          {scenario.is_baseline && <Badge variant="default" size="sm">Baseline</Badge>}
          {scenario.is_recommended && <Badge variant="brand" size="sm">Recommended</Badge>}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div>
          <p className="text-xs text-[var(--text-tertiary)]">NPV</p>
          <p className={`text-sm font-financial font-semibold ${npv >= 0 ? 'text-success' : 'text-danger'}`}>
            {formatCurrency(npv, true)}
          </p>
        </div>
        <div>
          <p className="text-xs text-[var(--text-tertiary)]">IRR</p>
          <p className={`text-sm font-financial font-semibold ${meetsHurdle ? 'text-success' : irr !== null ? 'text-warning' : 'text-[var(--text-secondary)]'}`}>
            {irr !== null ? formatPercent(irr * 100) : '—'}
          </p>
        </div>
        <div>
          <p className="text-xs text-[var(--text-tertiary)]">Payback</p>
          <p className="text-sm font-financial text-[var(--text-primary)]">
            {scenario.payback_months !== null ? `${Math.round(scenario.payback_months)}mo` : '—'}
          </p>
        </div>
        <div>
          <p className="text-xs text-[var(--text-tertiary)]">Capital</p>
          <p className="text-sm font-financial text-[var(--text-primary)]">
            {formatCurrency(scenario.total_capital_required, true)}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-1.5 pt-1 border-t border-[var(--border-subtle)]">
        {meetsHurdle
          ? <><CheckCircle className="w-3.5 h-3.5 text-success" /><span className="text-xs text-success font-medium">Meets Hurdle</span></>
          : npv < 0
          ? <><AlertTriangle className="w-3.5 h-3.5 text-danger" /><span className="text-xs text-danger font-medium">Negative NPV</span></>
          : <><AlertTriangle className="w-3.5 h-3.5 text-warning" /><span className="text-xs text-warning font-medium">Below Hurdle</span></>
        }
      </div>
    </Card>
  );
}
