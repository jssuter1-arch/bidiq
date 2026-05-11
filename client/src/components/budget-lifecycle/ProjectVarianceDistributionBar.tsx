import { cn } from '@/utils/cn';
import { formatCurrency } from '@/utils/format';

interface Props {
  budget: number;
  spend: number;
  changeOrders?: number;
  className?: string;
}

export default function ProjectVarianceDistributionBar({ budget, spend, changeOrders = 0, className }: Props) {
  const baseSpend = Math.max(0, spend - changeOrders);
  const basePct = budget > 0 ? Math.min(100, (baseSpend / budget) * 100) : 0;
  const coPct = budget > 0 ? Math.min(100 - basePct, (changeOrders / budget) * 100) : 0;
  const overPct = budget > 0 ? Math.max(0, ((spend - budget) / budget) * 100) : 0;

  return (
    <div className={cn('space-y-1.5', className)}>
      <div className="flex h-3 rounded-full overflow-hidden bg-[var(--bg-overlay)] gap-px">
        {basePct > 0 && (
          <div
            className="h-full bg-brand-500 rounded-l-full transition-all"
            style={{ width: `${basePct}%` }}
            title={`Base spend: ${formatCurrency(baseSpend)}`}
          />
        )}
        {coPct > 0 && (
          <div
            className="h-full bg-warning"
            style={{ width: `${coPct}%` }}
            title={`Change orders: ${formatCurrency(changeOrders)}`}
          />
        )}
        {overPct > 0 && (
          <div
            className="h-full bg-danger rounded-r-full"
            style={{ width: `${Math.min(overPct, 30)}%` }}
            title={`Over budget: ${formatCurrency(spend - budget)}`}
          />
        )}
      </div>
      <div className="flex items-center gap-3 text-2xs text-[var(--text-tertiary)]">
        <span className="flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-brand-500 inline-block" />
          Base {formatCurrency(baseSpend, true)}
        </span>
        {changeOrders > 0 && (
          <span className="flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-warning inline-block" />
            COs {formatCurrency(changeOrders, true)}
          </span>
        )}
        <span className="ml-auto font-mono">{budget > 0 ? `${((spend / budget) * 100).toFixed(1)}% of budget` : '—'}</span>
      </div>
    </div>
  );
}
