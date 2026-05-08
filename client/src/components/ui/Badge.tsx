import { cn } from '@/utils/cn';

type BadgeVariant = 'default' | 'success' | 'warning' | 'danger' | 'info' | 'brand';
type BadgeSize = 'sm' | 'md';

interface BadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
  size?: BadgeSize;
  dot?: boolean;
  className?: string;
}

const variants: Record<BadgeVariant, string> = {
  default: 'bg-[var(--bg-overlay)] text-[var(--text-secondary)]',
  success: 'bg-success-bg text-success',
  warning: 'bg-warning-bg text-warning',
  danger: 'bg-danger-bg text-danger',
  info: 'bg-info-bg text-info',
  brand: 'bg-brand-500/10 text-brand-400',
};

const sizes: Record<BadgeSize, string> = {
  sm: 'px-1.5 py-0.5 text-2xs',
  md: 'px-2 py-0.5 text-xs',
};

export default function Badge({ children, variant = 'default', size = 'md', dot, className }: BadgeProps) {
  return (
    <span className={cn('inline-flex items-center gap-1 rounded-full font-medium', variants[variant], sizes[size], className)}>
      {dot && (
        <span className={cn(
          'w-1.5 h-1.5 rounded-full flex-shrink-0',
          variant === 'success' ? 'bg-success' :
          variant === 'warning' ? 'bg-warning' :
          variant === 'danger' ? 'bg-danger' :
          variant === 'info' ? 'bg-info' :
          variant === 'brand' ? 'bg-brand-400' :
          'bg-[var(--text-tertiary)]'
        )} />
      )}
      {children}
    </span>
  );
}

export function BudgetHealthBadge({ pct }: { pct: number }) {
  if (pct <= 90) return <Badge variant="success">On Budget</Badge>;
  if (pct <= 100) return <Badge variant="warning">Near Limit</Badge>;
  if (pct <= 110) return <Badge variant="danger">Over Budget</Badge>;
  return <Badge variant="danger" className="animate-pulse-critical">Critical</Badge>;
}
