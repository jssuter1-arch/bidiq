import { cn } from '@/utils/cn';
import { formatCurrency } from '@/utils/format';

interface Props {
  purchasePrice: number;
  downPaymentPct: number;
  renovationCost?: number;
  closingCosts?: number;
  carryCosts?: number;
  hasConstructionLoan?: boolean;
  className?: string;
}

export default function CapitalStackBar({
  purchasePrice,
  downPaymentPct,
  renovationCost = 0,
  closingCosts = 0,
  carryCosts = 0,
  hasConstructionLoan = false,
  className,
}: Props) {
  const equityIn = purchasePrice * downPaymentPct;
  const seniorDebt = purchasePrice * (1 - downPaymentPct);
  const extraEquity = closingCosts + carryCosts + (hasConstructionLoan ? 0 : renovationCost);
  const totalEquity = equityIn + extraEquity;
  const total = totalEquity + seniorDebt;

  const equityPct = total > 0 ? (totalEquity / total) * 100 : 50;
  const debtPct = 100 - equityPct;

  return (
    <div className={cn('space-y-2', className)}>
      <div className="flex rounded-lg overflow-hidden h-5">
        <div
          className="bg-brand-500 flex items-center justify-center transition-all"
          style={{ width: `${equityPct}%` }}
          title={`Equity: ${formatCurrency(totalEquity)}`}
        >
          {equityPct > 12 && (
            <span className="text-2xs text-white font-medium px-1 truncate">
              {equityPct.toFixed(0)}%
            </span>
          )}
        </div>
        <div
          className="bg-[var(--bg-overlay)] flex items-center justify-center transition-all"
          style={{ width: `${debtPct}%` }}
          title={`Senior Debt: ${formatCurrency(seniorDebt)}`}
        >
          {debtPct > 12 && (
            <span className="text-2xs text-[var(--text-tertiary)] font-medium px-1 truncate">
              {debtPct.toFixed(0)}%
            </span>
          )}
        </div>
      </div>
      <div className="flex justify-between text-2xs text-[var(--text-tertiary)]">
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-sm bg-brand-500 inline-block" />
          Equity {formatCurrency(totalEquity, true)}
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-sm bg-[var(--bg-overlay)] border border-[var(--border-default)] inline-block" />
          Debt {formatCurrency(seniorDebt, true)}
        </span>
      </div>
    </div>
  );
}
