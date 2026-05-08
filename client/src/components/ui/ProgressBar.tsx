import { cn } from '@/utils/cn';

interface ProgressBarProps {
  value: number;
  max?: number;
  showLabel?: boolean;
  size?: 'xs' | 'sm' | 'md';
  className?: string;
  color?: 'brand' | 'success' | 'warning' | 'danger';
}

const colors = {
  brand: 'bg-brand-500',
  success: 'bg-success',
  warning: 'bg-warning',
  danger: 'bg-danger',
};

const heights = { xs: 'h-1', sm: 'h-1.5', md: 'h-2' };

export default function ProgressBar({ value, max = 100, showLabel, size = 'sm', className, color }: ProgressBarProps) {
  const pct = Math.min(100, (value / max) * 100);
  const autoColor: keyof typeof colors = color ?? (pct <= 90 ? 'success' : pct <= 100 ? 'warning' : 'danger');

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <div className={cn('flex-1 rounded-full bg-[var(--bg-overlay)] overflow-hidden', heights[size])}>
        <div
          className={cn('h-full rounded-full transition-all duration-500', colors[autoColor])}
          style={{ width: `${Math.min(pct, 100)}%` }}
        />
      </div>
      {showLabel && (
        <span className={cn('text-xs font-mono tabular-nums', pct > 100 ? 'text-danger' : 'text-[var(--text-tertiary)]')}>
          {pct.toFixed(0)}%
        </span>
      )}
    </div>
  );
}
