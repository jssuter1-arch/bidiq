import Drawer from '@/components/ui/Drawer';
import SnapshotTypeBadge from './SnapshotTypeBadge';
import { formatCurrency, formatDate } from '@/utils/format';

interface Snapshot {
  id: string;
  snapshot_type: string;
  effective_date: string;
  budget_total: number;
  actual_spend_at_snapshot: number;
  change_order_total_at_snapshot: number;
  is_current: boolean;
  notes: string | null;
  triggered_by_event?: string | null;
  line_items_snapshot?: unknown;
}

interface Props {
  snapshot: Snapshot | null;
  onClose: () => void;
}

export default function SnapshotDetailDrawer({ snapshot, onClose }: Props) {
  const lineItems = Array.isArray(snapshot?.line_items_snapshot)
    ? (snapshot!.line_items_snapshot as Array<{ category?: string; description?: string; budgeted_amount?: number; actual_amount?: number }>)
    : [];

  return (
    <Drawer open={!!snapshot} onClose={onClose} title="Snapshot Detail" width="520px">
      {snapshot && (
        <div className="space-y-5">
          <div className="flex items-center gap-3">
            <SnapshotTypeBadge type={snapshot.snapshot_type} />
            {snapshot.is_current && (
              <span className="text-xs text-brand-400 font-medium">Current</span>
            )}
          </div>

          <dl className="grid grid-cols-2 gap-3">
            {[
              { label: 'Date', value: formatDate(snapshot.effective_date) },
              { label: 'Triggered By', value: snapshot.triggered_by_event ?? '—' },
              { label: 'Budget Total', value: formatCurrency(snapshot.budget_total) },
              { label: 'Actual Spend', value: formatCurrency(snapshot.actual_spend_at_snapshot) },
              { label: 'Change Orders', value: formatCurrency(snapshot.change_order_total_at_snapshot) },
              {
                label: 'Variance',
                value: formatCurrency(snapshot.actual_spend_at_snapshot - snapshot.budget_total),
              },
            ].map(({ label, value }) => (
              <div key={label}>
                <dt className="text-2xs text-[var(--text-tertiary)] uppercase tracking-wide">{label}</dt>
                <dd className="text-sm font-mono font-medium text-[var(--text-primary)] mt-0.5">{value}</dd>
              </div>
            ))}
          </dl>

          {snapshot.notes && (
            <div>
              <p className="text-2xs text-[var(--text-tertiary)] uppercase tracking-wide mb-1">Notes</p>
              <p className="text-sm text-[var(--text-secondary)]">{snapshot.notes}</p>
            </div>
          )}

          {lineItems.length > 0 && (
            <div>
              <p className="text-2xs text-[var(--text-tertiary)] uppercase tracking-wide mb-2">Line Items at Snapshot</p>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-[var(--border-subtle)]">
                      <th className="text-left pb-1.5 text-[var(--text-tertiary)] font-medium pr-3">Category</th>
                      <th className="text-left pb-1.5 text-[var(--text-tertiary)] font-medium pr-3">Description</th>
                      <th className="text-right pb-1.5 text-[var(--text-tertiary)] font-medium pr-3">Budgeted</th>
                      <th className="text-right pb-1.5 text-[var(--text-tertiary)] font-medium">Actual</th>
                    </tr>
                  </thead>
                  <tbody>
                    {lineItems.map((item, i) => (
                      <tr key={i} className="border-b border-[var(--border-subtle)] last:border-0">
                        <td className="py-1 pr-3 text-[var(--text-secondary)]">{item.category ?? '—'}</td>
                        <td className="py-1 pr-3 text-[var(--text-secondary)]">{item.description ?? '—'}</td>
                        <td className="py-1 pr-3 text-right font-mono">{formatCurrency(item.budgeted_amount)}</td>
                        <td className="py-1 text-right font-mono">{formatCurrency(item.actual_amount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </Drawer>
  );
}
