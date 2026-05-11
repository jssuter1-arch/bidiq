import { useState } from 'react';
import { AlertCircle } from 'lucide-react';
import ConstraintTypeBadge from './ConstraintTypeBadge';
import ConstraintFormDialog from './ConstraintFormDialog';
import EmptyState from '@/components/ui/EmptyState';
import { formatCurrency } from '@/utils/format';
import type { Constraint } from '@/types/scenarios';
import api from '@/services/api';

interface Props {
  constraints: Constraint[];
  propertyId?: string;
  dealId?: string;
  canWrite?: boolean;
  onRefresh?: () => void;
}

export default function ConstraintMiniTable({ constraints, propertyId, dealId, canWrite, onRefresh }: Props) {
  const [editTarget, setEditTarget] = useState<Constraint | null>(null);
  const [showNew, setShowNew] = useState(false);

  const handleToggle = async (c: Constraint) => {
    try {
      await api.patch(`/v1/constraints/${c.id}`, { isActive: !c.is_active });
      onRefresh?.();
    } catch { /* non-fatal */ }
  };

  if (constraints.length === 0 && !canWrite) {
    return (
      <EmptyState
        icon={<AlertCircle className="w-5 h-5" />}
        title="No constraints documented"
        description="Add zoning, fire-code, or other regulatory factors that affect this property or deal."
      />
    );
  }

  return (
    <div className="space-y-2">
      {canWrite && (
        <button
          onClick={() => setShowNew(true)}
          className="text-xs font-medium text-brand-400 hover:text-brand-300 transition-colors"
        >
          + Add Constraint
        </button>
      )}

      {constraints.length === 0 ? (
        <p className="text-xs text-[var(--text-tertiary)] py-2">No constraints yet.</p>
      ) : (
        <div className="divide-y divide-[var(--border-subtle)]">
          {constraints.map((c) => (
            <div key={c.id} className="py-2.5 flex items-start gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <ConstraintTypeBadge type={c.constraint_type} />
                  {!c.is_active && <span className="text-xs text-[var(--text-tertiary)]">(inactive)</span>}
                </div>
                <p className="text-sm text-[var(--text-primary)] mt-1 truncate">{c.description}</p>
                {c.trigger_threshold && (
                  <p className="text-xs text-[var(--text-secondary)] mt-0.5">If: {c.trigger_threshold}</p>
                )}
              </div>
              <div className="text-right flex-shrink-0">
                {c.triggered_cost_estimate !== null && c.triggered_cost_estimate !== undefined ? (
                  <p className="text-sm font-financial font-semibold text-[var(--text-primary)]">
                    {formatCurrency(c.triggered_cost_estimate, true)}
                  </p>
                ) : (
                  <p className="text-xs text-[var(--text-tertiary)]">Est. TBD</p>
                )}
                {canWrite && (
                  <div className="flex items-center gap-2 mt-1 justify-end">
                    <button
                      onClick={() => handleToggle(c)}
                      className="text-xs text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] transition-colors"
                    >
                      {c.is_active ? 'Deactivate' : 'Activate'}
                    </button>
                    <button
                      onClick={() => setEditTarget(c)}
                      className="text-xs text-brand-400 hover:text-brand-300 transition-colors"
                    >
                      Edit
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {showNew && (
        <ConstraintFormDialog
          open={showNew}
          onClose={() => setShowNew(false)}
          onSuccess={() => { setShowNew(false); onRefresh?.(); }}
          propertyId={propertyId}
          dealId={dealId}
        />
      )}

      {editTarget && (
        <ConstraintFormDialog
          open
          onClose={() => setEditTarget(null)}
          onSuccess={() => { setEditTarget(null); onRefresh?.(); }}
          existing={editTarget}
        />
      )}
    </div>
  );
}
