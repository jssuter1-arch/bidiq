import { formatCurrency, formatPercent } from '@/utils/format';
import type { Scenario } from '@/types/scenarios';

interface Props {
  scenarios: Scenario[];
  baselineId?: string | null;
}

function delta(a: number | null, b: number | null) {
  if (a === null || b === null) return null;
  return a - b;
}

export default function ScenarioComparisonBar({ scenarios, baselineId }: Props) {
  const baseline = scenarios.find((s) => s.id === baselineId) ?? (
    // If no explicit baseline, use highest-NPV scenario
    [...scenarios].sort((a, b) => (b.npv ?? -Infinity) - (a.npv ?? -Infinity))[0]
  );
  if (!baseline || scenarios.length < 2) return null;

  const others = scenarios.filter((s) => s.id !== baseline.id);

  return (
    <div className="bg-[var(--bg-elevated)] border border-[var(--border-subtle)] rounded-xl px-4 py-3 mb-4">
      <p className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wide mb-2">
        vs. {baseline.scenario_name} (Baseline)
      </p>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 md:grid-cols-3">
        {others.map((s) => {
          const npvDelta = delta(s.npv, baseline.npv);
          const irrDelta = delta(s.irr, baseline.irr);
          const paybackDelta = delta(s.payback_months, baseline.payback_months);
          return (
            <div key={s.id} className="rounded-lg bg-[var(--bg-surface)] border border-[var(--border-subtle)] px-3 py-2">
              <p className="text-xs font-medium text-[var(--text-primary)] truncate mb-1.5">{s.scenario_name}</p>
              <div className="flex flex-wrap gap-x-3 gap-y-1">
                {npvDelta !== null && (
                  <span className={`text-xs font-financial ${npvDelta >= 0 ? 'text-success' : 'text-danger'}`}>
                    NPV {npvDelta >= 0 ? '+' : ''}{formatCurrency(npvDelta, true)}
                  </span>
                )}
                {irrDelta !== null && (
                  <span className={`text-xs font-financial ${irrDelta >= 0 ? 'text-success' : 'text-danger'}`}>
                    IRR {irrDelta >= 0 ? '+' : ''}{formatPercent(irrDelta * 100, 1)}pts
                  </span>
                )}
                {paybackDelta !== null && (
                  <span className={`text-xs font-financial ${paybackDelta <= 0 ? 'text-success' : 'text-warning'}`}>
                    Payback {paybackDelta >= 0 ? '+' : ''}{Math.round(paybackDelta)}mo
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
