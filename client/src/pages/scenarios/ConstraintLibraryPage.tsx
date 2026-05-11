import { useEffect, useState } from 'react';
import { AlertCircle, Plus } from 'lucide-react';
import PageWrapper from '@/components/layout/PageWrapper';
import PageHeader from '@/components/layout/PageHeader';
import Button from '@/components/ui/Button';
import EmptyState from '@/components/ui/EmptyState';
import Skeleton from '@/components/ui/Skeleton';
import ConstraintTypeBadge from '@/components/scenarios/ConstraintTypeBadge';
import ConstraintFormDialog from '@/components/scenarios/ConstraintFormDialog';
import { formatCurrency, formatDate } from '@/utils/format';
import api from '@/services/api';
import type { Constraint, ConstraintType } from '@/types/scenarios';

const TYPE_OPTIONS: { value: string; label: string }[] = [
  { value: '', label: 'All Types' },
  { value: 'zoning_use', label: 'Zoning Use' },
  { value: 'unit_count_cap', label: 'Unit Count Cap' },
  { value: 'bedroom_count_cap', label: 'Bedroom Count Cap' },
  { value: 'fire_code_trigger', label: 'Fire Code Trigger' },
  { value: 'historic_district', label: 'Historic District' },
  { value: 'parking_minimum', label: 'Parking Minimum' },
  { value: 'height_limit', label: 'Height Limit' },
  { value: 'setback', label: 'Setback' },
  { value: 'other', label: 'Other' },
];

export default function ConstraintLibraryPage() {
  const [constraints, setConstraints] = useState<Constraint[]>([]);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState('');
  const [activeFilter, setActiveFilter] = useState('');
  const [showNew, setShowNew] = useState(false);
  const [editTarget, setEditTarget] = useState<Constraint | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = {};
      if (typeFilter) params.type = typeFilter;
      if (activeFilter !== '') params.isActive = activeFilter;
      const { data } = await api.get('/v1/constraints', { params });
      setConstraints(data.data ?? []);
    } catch {
      setConstraints([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [typeFilter, activeFilter]);

  const handleToggleActive = async (c: Constraint) => {
    try {
      await api.patch(`/v1/constraints/${c.id}`, { isActive: !c.is_active });
      load();
    } catch { /* non-fatal */ }
  };

  if (loading) return (
    <PageWrapper>
      <Skeleton className="h-8 w-48" />
      <div className="space-y-2">
        {[1, 2, 3].map((i) => <Skeleton key={i} className="h-14 rounded-xl" />)}
      </div>
    </PageWrapper>
  );

  return (
    <PageWrapper>
      <PageHeader
        title="Constraint Library"
        subtitle="Regulatory and physical constraints across your portfolio."
        actions={
          <div className="flex items-center gap-2">
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="h-8 rounded-lg border border-[var(--border-default)] bg-[var(--bg-elevated)] text-sm px-2 text-[var(--text-primary)]"
            >
              {TYPE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
            <select
              value={activeFilter}
              onChange={(e) => setActiveFilter(e.target.value)}
              className="h-8 rounded-lg border border-[var(--border-default)] bg-[var(--bg-elevated)] text-sm px-2 text-[var(--text-primary)]"
            >
              <option value="">All</option>
              <option value="true">Active</option>
              <option value="false">Inactive</option>
            </select>
            <Button iconLeft={<Plus className="w-3.5 h-3.5" />} onClick={() => setShowNew(true)}>
              + New Constraint
            </Button>
          </div>
        }
      />

      {constraints.length === 0 ? (
        <EmptyState
          icon={<AlertCircle className="w-6 h-6" />}
          title="No constraints found"
          description="Add zoning, fire-code, or other regulatory constraints across your portfolio."
          action={{ label: '+ New Constraint', onClick: () => setShowNew(true) }}
        />
      ) : (
        <div className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-surface)] overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-[var(--bg-elevated)] border-b border-[var(--border-subtle)]">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wide">Type</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wide">Description</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wide">Trigger</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wide">Est. Cost</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wide">Source Date</th>
                <th className="px-4 py-3 text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wide">Active</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-subtle)]">
              {constraints.map((c) => (
                <tr key={c.id} className="hover:bg-[var(--bg-elevated)] transition-colors">
                  <td className="px-4 py-3">
                    <ConstraintTypeBadge type={c.constraint_type} />
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-[var(--text-primary)] truncate max-w-xs" title={c.description}>
                      {c.description.length > 80 ? c.description.slice(0, 80) + '…' : c.description}
                    </p>
                  </td>
                  <td className="px-4 py-3 text-[var(--text-secondary)] text-xs">
                    {c.trigger_threshold ?? '—'}
                  </td>
                  <td className="px-4 py-3 text-right font-financial text-warning">
                    {c.triggered_cost_estimate !== null && c.triggered_cost_estimate !== undefined
                      ? formatCurrency(c.triggered_cost_estimate, true)
                      : '—'}
                  </td>
                  <td className="px-4 py-3 text-[var(--text-secondary)] text-xs">
                    {c.source_date ? formatDate(c.source_date) : '—'}
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => handleToggleActive(c)}
                      className={`px-2 py-0.5 rounded-full text-xs font-medium transition-colors ${
                        c.is_active ? 'bg-success-bg text-success' : 'bg-[var(--bg-elevated)] text-[var(--text-tertiary)]'
                      }`}
                    >
                      {c.is_active ? 'Active' : 'Inactive'}
                    </button>
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => setEditTarget(c)}
                      className="text-xs text-brand-400 hover:text-brand-300 transition-colors"
                    >
                      Edit
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showNew && (
        <ConstraintFormDialog
          open
          onClose={() => setShowNew(false)}
          onSuccess={() => { setShowNew(false); load(); }}
        />
      )}

      {editTarget && (
        <ConstraintFormDialog
          open
          onClose={() => setEditTarget(null)}
          onSuccess={() => { setEditTarget(null); load(); }}
          existing={editTarget}
        />
      )}
    </PageWrapper>
  );
}
