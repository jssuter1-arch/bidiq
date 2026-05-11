import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Copy, Star, Edit, ChevronRight } from 'lucide-react';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import { UnderwritingModel } from '@/types/deals';
import { formatCurrency, formatPercent, formatDate } from '@/utils/format';
import api from '@/services/api';

interface Props {
  models: UnderwritingModel[];
  dealId: string;
  onRefresh: () => void;
  userRole?: string | null;
}

export default function UnderwritingVersionList({ models, dealId, onRefresh, userRole }: Props) {
  const navigate = useNavigate();
  const [actionId, setActionId] = useState<string | null>(null);

  const canWrite = userRole === 'admin' || userRole === 'project_manager';

  async function handleActivate(id: string) {
    setActionId(id);
    try {
      await api.post(`/v1/underwriting/${id}/activate`);
      onRefresh();
    } finally {
      setActionId(null);
    }
  }

  async function handleDuplicate(id: string) {
    setActionId(id);
    try {
      await api.post(`/v1/underwriting/${id}/duplicate`);
      onRefresh();
    } finally {
      setActionId(null);
    }
  }

  const sorted = [...models].sort((a, b) => a.version - b.version);

  return (
    <div className="space-y-2">
      {sorted.map((m) => {
        const isActive = m.is_active_version;
        return (
          <div
            key={m.id}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg border transition-all ${
              isActive
                ? 'border-brand-500/40 bg-brand-500/5'
                : 'border-[var(--border-subtle)] bg-[var(--bg-surface)]'
            }`}
          >
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm font-medium text-[var(--text-primary)] truncate">
                  {m.model_name || `v${m.version}`}
                </span>
                {isActive && <Badge variant="brand" size="sm">Active</Badge>}
              </div>
              <div className="flex items-center gap-3 mt-0.5 text-2xs text-[var(--text-tertiary)]">
                <span>
                  IRR:{' '}
                  <span className={`font-mono ${m.meets_hurdle ? 'text-success' : 'text-danger'}`}>
                    {m.irr != null ? formatPercent(m.irr * 100) : '—'}
                  </span>
                </span>
                <span>Price: {formatCurrency(m.proposed_purchase_price, true)}</span>
                <span>{formatDate(m.created_at)}</span>
              </div>
            </div>

            <div className="flex items-center gap-1 flex-shrink-0">
              {canWrite && !isActive && (
                <Button
                  variant="ghost"
                  size="xs"
                  title="Set as active version"
                  loading={actionId === m.id}
                  onClick={() => handleActivate(m.id)}
                >
                  <Star className="w-3.5 h-3.5" />
                </Button>
              )}
              {canWrite && (
                <Button
                  variant="ghost"
                  size="xs"
                  title="Duplicate"
                  loading={actionId === m.id}
                  onClick={() => handleDuplicate(m.id)}
                >
                  <Copy className="w-3.5 h-3.5" />
                </Button>
              )}
              {canWrite && (
                <Button
                  variant="ghost"
                  size="xs"
                  title="Edit"
                  onClick={() => navigate(`/underwriting/${m.id}/edit`)}
                >
                  <Edit className="w-3.5 h-3.5" />
                </Button>
              )}
              <Button
                variant="ghost"
                size="xs"
                onClick={() => navigate(`/deals/${dealId}/underwriting/compare?a=${m.id}`)}
                title="Compare"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>
        );
      })}
      {sorted.length === 0 && (
        <p className="text-sm text-[var(--text-tertiary)] text-center py-4">
          No underwriting models yet. Create one to evaluate this deal.
        </p>
      )}
    </div>
  );
}
