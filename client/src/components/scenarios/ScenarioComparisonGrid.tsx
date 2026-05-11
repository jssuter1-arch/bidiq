import ScenarioPanel from './ScenarioPanel';
import type { Scenario, Constraint } from '@/types/scenarios';

interface Props {
  scenarios: Scenario[];
  selectedId?: string | null;
  isDecided?: boolean;
  availableConstraints?: Constraint[];
  canDecide?: boolean;
  onSelectPath?: (scenarioId: string) => void;
}

export default function ScenarioComparisonGrid({ scenarios, selectedId, isDecided, availableConstraints, canDecide, onSelectPath }: Props) {
  const gridClass = scenarios.length === 2
    ? 'grid grid-cols-1 md:grid-cols-2 gap-4'
    : scenarios.length === 3
    ? 'grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4'
    : 'grid grid-cols-1 md:grid-cols-2 gap-4';

  return (
    <div className={gridClass}>
      {scenarios.map((s) => (
        <ScenarioPanel
          key={s.id}
          scenario={s}
          isSelected={selectedId === s.id}
          isDecided={isDecided}
          availableConstraints={availableConstraints}
          canDecide={canDecide}
          onSelectPath={() => onSelectPath?.(s.id)}
        />
      ))}
    </div>
  );
}
