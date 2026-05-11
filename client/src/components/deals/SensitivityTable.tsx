import { SensitivityResult } from '@/types/deals';
import { formatCurrency, formatPercent } from '@/utils/format';
import { cn } from '@/utils/cn';

interface Props {
  data: SensitivityResult;
  hurdleRate?: number;
}

function irrCell(irr: number | null, hurdleRate?: number) {
  if (irr == null) return <span className="text-[var(--text-tertiary)]">—</span>;
  const meetsHurdle = hurdleRate != null ? irr >= hurdleRate : false;
  return (
    <span className={cn('font-mono text-xs', meetsHurdle ? 'text-success' : 'text-danger')}>
      {formatPercent(irr * 100)}
    </span>
  );
}

export default function SensitivityTable({ data, hurdleRate }: Props) {
  return (
    <div className="space-y-6">
      {/* Purchase Price */}
      <div>
        <h4 className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wide mb-2">
          Purchase Price Sensitivity
        </h4>
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-[var(--border-subtle)]">
              <th className="text-left py-1.5 text-[var(--text-tertiary)] font-medium">Price</th>
              <th className="text-right py-1.5 text-[var(--text-tertiary)] font-medium">Delta</th>
              <th className="text-right py-1.5 text-[var(--text-tertiary)] font-medium">IRR</th>
            </tr>
          </thead>
          <tbody>
            {data.purchase_price.map((row, i) => {
              const base = data.purchase_price[2]?.price || 0;
              const delta = base > 0 ? ((row.price - base) / base) * 100 : 0;
              return (
                <tr key={i} className={cn('border-b border-[var(--border-subtle)]', i === 2 && 'bg-[var(--bg-elevated)]')}>
                  <td className="py-1.5 font-mono text-[var(--text-primary)]">{formatCurrency(row.price, true)}</td>
                  <td className="py-1.5 text-right text-[var(--text-tertiary)]">
                    {delta === 0 ? 'Base' : `${delta > 0 ? '+' : ''}${delta.toFixed(0)}%`}
                  </td>
                  <td className="py-1.5 text-right">{irrCell(row.irr, hurdleRate)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Exit Cap Rate */}
      <div>
        <h4 className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wide mb-2">
          Exit Cap Rate Sensitivity
        </h4>
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-[var(--border-subtle)]">
              <th className="text-left py-1.5 text-[var(--text-tertiary)] font-medium">Cap Rate</th>
              <th className="text-right py-1.5 text-[var(--text-tertiary)] font-medium">Delta</th>
              <th className="text-right py-1.5 text-[var(--text-tertiary)] font-medium">IRR</th>
            </tr>
          </thead>
          <tbody>
            {data.exit_cap_rate.map((row, i) => {
              const base = data.exit_cap_rate[2]?.cap || 0;
              const deltaBps = Math.round((row.cap - base) * 10000);
              return (
                <tr key={i} className={cn('border-b border-[var(--border-subtle)]', i === 2 && 'bg-[var(--bg-elevated)]')}>
                  <td className="py-1.5 font-mono text-[var(--text-primary)]">{formatPercent(row.cap * 100, 2)}</td>
                  <td className="py-1.5 text-right text-[var(--text-tertiary)]">
                    {deltaBps === 0 ? 'Base' : `${deltaBps > 0 ? '+' : ''}${deltaBps}bps`}
                  </td>
                  <td className="py-1.5 text-right">{irrCell(row.irr, hurdleRate)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Renovation Cost */}
      <div>
        <h4 className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wide mb-2">
          Renovation Cost Sensitivity
        </h4>
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-[var(--border-subtle)]">
              <th className="text-left py-1.5 text-[var(--text-tertiary)] font-medium">Reno Cost</th>
              <th className="text-right py-1.5 text-[var(--text-tertiary)] font-medium">Upside</th>
              <th className="text-right py-1.5 text-[var(--text-tertiary)] font-medium">IRR</th>
            </tr>
          </thead>
          <tbody>
            {data.renovation_cost.map((row, i) => {
              const base = data.renovation_cost[0]?.reno || 0;
              const delta = base > 0 ? ((row.reno - base) / base) * 100 : 0;
              return (
                <tr key={i} className={cn('border-b border-[var(--border-subtle)]', i === 0 && 'bg-[var(--bg-elevated)]')}>
                  <td className="py-1.5 font-mono text-[var(--text-primary)]">{formatCurrency(row.reno, true)}</td>
                  <td className="py-1.5 text-right text-[var(--text-tertiary)]">
                    {delta === 0 ? 'Base' : `+${delta.toFixed(0)}%`}
                  </td>
                  <td className="py-1.5 text-right">{irrCell(row.irr, hurdleRate)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
