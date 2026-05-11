import { formatCurrency, formatDate } from '@/utils/format';
import SnapshotTypeBadge from './SnapshotTypeBadge';

interface Snapshot {
  id: string;
  snapshot_type: string;
  effective_date: string;
  budget_total: number;
  actual_spend_at_snapshot: number;
  change_order_total_at_snapshot: number;
  is_current: boolean;
  notes: string | null;
}

interface Props {
  snapshots: Snapshot[];
  onSelect?: (snapshot: Snapshot) => void;
  selectedId?: string;
}

export default function SnapshotTable({ snapshots, onSelect, selectedId }: Props) {
  if (snapshots.length === 0) {
    return (
      <p className="text-sm text-[var(--text-tertiary)] text-center py-6">No snapshots recorded yet.</p>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-[var(--border-subtle)]">
            <th className="text-left text-2xs font-semibold text-[var(--text-tertiary)] uppercase tracking-wide pb-2 pr-4">Type</th>
            <th className="text-left text-2xs font-semibold text-[var(--text-tertiary)] uppercase tracking-wide pb-2 pr-4">Date</th>
            <th className="text-right text-2xs font-semibold text-[var(--text-tertiary)] uppercase tracking-wide pb-2 pr-4">Budget</th>
            <th className="text-right text-2xs font-semibold text-[var(--text-tertiary)] uppercase tracking-wide pb-2 pr-4">Spend</th>
            <th className="text-right text-2xs font-semibold text-[var(--text-tertiary)] uppercase tracking-wide pb-2">COs</th>
          </tr>
        </thead>
        <tbody>
          {snapshots.map((snap) => {
            const variance = snap.actual_spend_at_snapshot - snap.budget_total;
            const isSelected = snap.id === selectedId;
            return (
              <tr
                key={snap.id}
                onClick={() => onSelect?.(snap)}
                className={`border-b border-[var(--border-subtle)] last:border-0 transition-colors ${
                  onSelect ? 'cursor-pointer hover:bg-[var(--bg-elevated)]' : ''
                } ${isSelected ? 'bg-[var(--bg-elevated)]' : ''}`}
              >
                <td className="py-2 pr-4">
                  <div className="flex items-center gap-2">
                    <SnapshotTypeBadge type={snap.snapshot_type} />
                    {snap.is_current && (
                      <span className="text-2xs text-brand-400 font-medium">current</span>
                    )}
                  </div>
                </td>
                <td className="py-2 pr-4 text-[var(--text-secondary)] font-mono text-xs whitespace-nowrap">
                  {formatDate(snap.effective_date)}
                </td>
                <td className="py-2 pr-4 text-right font-mono text-xs text-[var(--text-primary)]">
                  {formatCurrency(snap.budget_total)}
                </td>
                <td className="py-2 pr-4 text-right font-mono text-xs">
                  <span className={variance > 0 ? 'text-danger' : 'text-[var(--text-primary)]'}>
                    {formatCurrency(snap.actual_spend_at_snapshot)}
                  </span>
                </td>
                <td className="py-2 text-right font-mono text-xs text-warning">
                  {snap.change_order_total_at_snapshot > 0 ? formatCurrency(snap.change_order_total_at_snapshot) : '—'}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
