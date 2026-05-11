import Badge from '@/components/ui/Badge';

const TYPE_CONFIG: Record<string, { label: string; variant: 'default' | 'success' | 'warning' | 'danger' | 'info' | 'brand' }> = {
  project_created: { label: 'Created', variant: 'default' },
  bank_declared:   { label: 'Bank Declared', variant: 'brand' },
  break_ground:    { label: 'Break Ground', variant: 'info' },
  revision:        { label: 'Revision', variant: 'warning' },
  completion:      { label: 'Completion', variant: 'success' },
  manual:          { label: 'Manual', variant: 'default' },
  underwriting:    { label: 'Underwriting', variant: 'brand' },
};

interface Props {
  type: string;
}

export default function SnapshotTypeBadge({ type }: Props) {
  const cfg = TYPE_CONFIG[type] ?? { label: type, variant: 'default' as const };
  return <Badge variant={cfg.variant}>{cfg.label}</Badge>;
}
