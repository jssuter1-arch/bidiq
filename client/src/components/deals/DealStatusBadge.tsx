import Badge from '@/components/ui/Badge';
import { DealStatus, DEAL_STATUS_LABELS } from '@/types/deals';

const STATUS_VARIANT: Record<DealStatus, any> = {
  prospecting: 'info',
  underwriting: 'brand',
  loi_submitted: 'warning',
  under_negotiation: 'warning',
  due_diligence: 'warning',
  closed_won: 'success',
  closed_lost: 'danger',
  passed: 'default',
};

interface Props {
  status: DealStatus;
  size?: 'sm' | 'md';
  dot?: boolean;
}

export default function DealStatusBadge({ status, size = 'md', dot }: Props) {
  return (
    <Badge variant={STATUS_VARIANT[status]} size={size} dot={dot}>
      {DEAL_STATUS_LABELS[status] ?? status}
    </Badge>
  );
}
