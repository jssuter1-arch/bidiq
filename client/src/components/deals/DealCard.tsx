import { useNavigate } from 'react-router-dom';
import { MapPin, DollarSign } from 'lucide-react';
import { AcquisitionDeal } from '@/types/deals';
import { formatCurrency, formatPercent } from '@/utils/format';
import DealStatusBadge from './DealStatusBadge';
import { cn } from '@/utils/cn';

interface Props {
  deal: AcquisitionDeal;
}

export default function DealCard({ deal }: Props) {
  const navigate = useNavigate();

  // active_model can be an array (from !inner join) or a single object
  const activeModel = Array.isArray(deal.active_model)
    ? deal.active_model[0]
    : deal.active_model;

  return (
    <div
      onClick={() => navigate(`/deals/${deal.id}`)}
      className={cn(
        'group rounded-xl border border-[var(--border-default)] bg-[var(--bg-surface)] p-3',
        'hover:border-[var(--border-strong)] hover:shadow-elevated cursor-pointer transition-all',
        'space-y-2.5'
      )}
    >
      {/* Title row */}
      <div className="flex items-start justify-between gap-2">
        <h3 className="text-sm font-semibold text-[var(--text-primary)] leading-snug line-clamp-2 flex-1">
          {deal.deal_name}
        </h3>
        <DealStatusBadge status={deal.status} size="sm" />
      </div>

      {/* Address */}
      {(deal.city || deal.state) && (
        <div className="flex items-center gap-1 text-2xs text-[var(--text-tertiary)]">
          <MapPin className="w-3 h-3 flex-shrink-0" />
          <span>{[deal.city, deal.state].filter(Boolean).join(', ')}</span>
        </div>
      )}

      {/* Price row */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1 text-xs text-[var(--text-secondary)]">
          <DollarSign className="w-3 h-3" />
          <span className="font-mono">{deal.asking_price ? formatCurrency(deal.asking_price, true) : 'Ask TBD'}</span>
        </div>
        {deal.total_units && (
          <span className="text-2xs text-[var(--text-tertiary)]">{deal.total_units} units</span>
        )}
      </div>

      {/* IRR from active model */}
      {activeModel && (
        <div className={cn(
          'flex items-center justify-between rounded-md px-2 py-1 text-xs',
          activeModel.meets_hurdle ? 'bg-success-bg' : 'bg-danger-bg'
        )}>
          <span className="text-[var(--text-tertiary)]">IRR</span>
          <span className={cn(
            'font-mono font-semibold',
            activeModel.meets_hurdle ? 'text-success' : 'text-danger'
          )}>
            {activeModel.irr != null ? formatPercent(activeModel.irr * 100) : '—'}
          </span>
        </div>
      )}
    </div>
  );
}
