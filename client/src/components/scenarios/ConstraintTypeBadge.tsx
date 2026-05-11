import { Map, Hash, BedDouble, Flame, Landmark, Car, Ruler, Square, AlertCircle } from 'lucide-react';
import { cn } from '@/utils/cn';
import type { ConstraintType } from '@/types/scenarios';

const CONFIG: Record<ConstraintType, { label: string; color: string; icon: React.ElementType }> = {
  zoning_use:        { label: 'Zoning Use',       color: 'bg-info-bg text-info',              icon: Map },
  unit_count_cap:    { label: 'Unit Count Cap',    color: 'bg-warning-bg text-warning',        icon: Hash },
  bedroom_count_cap: { label: 'Bedroom Cap',       color: 'bg-warning-bg text-warning',        icon: BedDouble },
  fire_code_trigger: { label: 'Fire Code',         color: 'bg-danger-bg text-danger',          icon: Flame },
  historic_district: { label: 'Historic District', color: 'bg-yellow-500/10 text-yellow-400', icon: Landmark },
  parking_minimum:   { label: 'Parking Min.',      color: 'bg-info-bg text-info',              icon: Car },
  height_limit:      { label: 'Height Limit',      color: 'bg-info-bg text-info',              icon: Ruler },
  setback:           { label: 'Setback',           color: 'bg-info-bg text-info',              icon: Square },
  other:             { label: 'Other',             color: 'bg-[var(--bg-overlay)] text-[var(--text-secondary)]', icon: AlertCircle },
};

interface Props {
  type: ConstraintType;
  className?: string;
}

export default function ConstraintTypeBadge({ type, className }: Props) {
  const { label, color, icon: Icon } = CONFIG[type] ?? CONFIG.other;
  return (
    <span className={cn('inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium', color, className)}>
      <Icon className="w-3 h-3 flex-shrink-0" />
      {label}
    </span>
  );
}
