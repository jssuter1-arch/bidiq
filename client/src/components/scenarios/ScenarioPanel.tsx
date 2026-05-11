import { useNavigate } from 'react-router-dom';
import { CheckCircle, AlertTriangle, AlertOctagon, Edit2 } from 'lucide-react';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import ConstraintTypeBadge from './ConstraintTypeBadge';
import { formatCurrency, formatPercent } from '@/utils/format';
import type { Scenario, Constraint } from '@/types/scenarios';
import { cn } from '@/utils/cn';

interface Props {
  scenario: Scenario;
  isSelected?: boolean;
  isDecided?: boolean;
  availableConstraints?: Constraint[];
  canDecide?: boolean;
  onSelectPath?: () => void;
}

export default function ScenarioPanel({ scenario, isSelected, isDecided, availableConstraints = [], canDecide, onSelectPath }: Props) {
  const navigate = useNavigate();
  const npv = scenario.npv ?? 0;
  const irr = scenario.irr;
  const meetsHurdle = scenario.meets_hurdle;

  const triggeredConstraintRows = availableConstraints.filter(
    (c) => (scenario.triggered_constraints ?? []).includes(c.id),
  );

  return (
    <Card
      className={cn(
        'flex flex-col gap-4 transition-all',
        isSelected && 'border-brand-500 ring-2 ring-brand-500/30',
      )}
    >
      {/* Header */}
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
          {isSelected && <Badge variant="success" size="sm">Selected Path</Badge>}
        </div>
      </div>

      {/* Financial grid */}
      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-lg bg-[var(--bg-elevated)] p-2.5">
          <p className="text-xs text-[var(--text-tertiary)]">NPV</p>
          <p className={`text-base font-financial font-bold mt-0.5 ${npv >= 0 ? 'text-success' : 'text-danger'}`}>
            {formatCurrency(npv, true)}
          </p>
        </div>
        <div className="rounded-lg bg-[var(--bg-elevated)] p-2.5">
          <p className="text-xs text-[var(--text-tertiary)]">IRR</p>
          <p className={`text-base font-financial font-bold mt-0.5 ${meetsHurdle ? 'text-success' : irr !== null ? 'text-warning' : 'text-[var(--text-secondary)]'}`}>
            {irr !== null ? formatPercent(irr * 100) : '—'}
          </p>
        </div>
        <div className="rounded-lg bg-[var(--bg-elevated)] p-2.5">
          <p className="text-xs text-[var(--text-tertiary)]">Payback</p>
          <p className="text-base font-financial font-bold mt-0.5 text-[var(--text-primary)]">
            {scenario.payback_months !== null ? `${Math.round(scenario.payback_months)}mo` : '—'}
          </p>
        </div>
        <div className="rounded-lg bg-[var(--bg-elevated)] p-2.5">
          <p className="text-xs text-[var(--text-tertiary)]">Capital</p>
          <p className="text-base font-financial font-bold mt-0.5 text-[var(--text-primary)]">
            {formatCurrency(scenario.total_capital_required, true)}
          </p>
        </div>
      </div>

      {/* NPV indicator */}
      {npv <= 0 && (
        <div className="rounded-lg bg-danger-bg border border-danger/20 px-3 py-2 flex items-center gap-2">
          <AlertOctagon className="w-4 h-4 text-danger flex-shrink-0" />
          <p className="text-xs font-semibold text-danger">Negative NPV — destroys value</p>
        </div>
      )}

      {/* Triggered constraints */}
      {triggeredConstraintRows.length > 0 && (
        <div>
          <p className="text-xs text-[var(--text-tertiary)] mb-1.5">Triggered Constraints</p>
          <div className="flex flex-wrap gap-1">
            {triggeredConstraintRows.map((c) => (
              <ConstraintTypeBadge key={c.id} type={c.constraint_type} />
            ))}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-2 pt-1 border-t border-[var(--border-subtle)]">
        <Button
          variant="ghost"
          size="sm"
          iconLeft={<Edit2 className="w-3.5 h-3.5" />}
          onClick={() => navigate(`/scenarios/${scenario.id}`)}
          disabled={isDecided}
        >
          Edit
        </Button>
        {canDecide && !isDecided && (
          <Button size="sm" onClick={onSelectPath}>
            Select This Path
          </Button>
        )}
        {isSelected && (
          <div className="flex items-center gap-1 ml-auto">
            <CheckCircle className="w-4 h-4 text-success" />
            <span className="text-xs text-success font-medium">Decision captured</span>
          </div>
        )}
      </div>
    </Card>
  );
}
