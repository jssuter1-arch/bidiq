import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertCircle } from 'lucide-react';
import api from '@/services/api';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import { formatCurrency } from '@/utils/format';

const CATEGORY_LABELS: Record<string, string> = {
  scope_creep: 'Scope Creep',
  design_change: 'Design Change',
  unforeseen_conditions: 'Unforeseen',
  material_escalation: 'Material Escalation',
  labor_shortage: 'Labor Shortage',
  permit_requirement: 'Permit Req.',
  owner_request: 'Owner Request',
  error_omission: 'Error/Omission',
  other: 'Other',
};

export default function ExecutiveChangeOrderInsightsCard() {
  const navigate = useNavigate();
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    api.get('/v1/change-orders/analytics?lookbackDays=90')
      .then((r) => setData(r.data))
      .catch(() => {});
  }, []);

  if (!data) return null;

  const topCat = data.by_category?.[0];

  return (
    <Card className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-amber-400" />
          <h3 className="text-sm font-semibold text-[var(--text-primary)]">Change Orders (90d)</h3>
        </div>
        <Button variant="ghost" size="sm" onClick={() => navigate('/intelligence/change-orders')}>View All</Button>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <p className="text-xs text-[var(--text-tertiary)]">Total Spend</p>
          <p className="text-xl font-bold font-heading text-[var(--text-primary)]">{formatCurrency(data.total_co_amount, true)}</p>
        </div>
        <div>
          <p className="text-xs text-[var(--text-tertiary)]">Uncategorized</p>
          <p className={`text-xl font-bold font-heading ${data.uncategorized_count > 0 ? 'text-amber-400' : 'text-[var(--text-primary)]'}`}>
            {data.uncategorized_count}
          </p>
        </div>
      </div>

      {topCat && (
        <div className="flex items-center justify-between p-2 rounded-lg bg-[var(--bg-elevated)]">
          <span className="text-xs text-[var(--text-secondary)]">Top cause</span>
          <Badge variant="warning">{CATEGORY_LABELS[topCat.category] ?? topCat.category}</Badge>
        </div>
      )}

      {data.uncategorized_count > 0 && (
        <button
          onClick={() => navigate('/intelligence/change-orders/queue')}
          className="w-full text-xs text-amber-400 hover:text-amber-300 transition-colors text-center pt-1"
        >
          {data.uncategorized_count} change order{data.uncategorized_count !== 1 ? 's' : ''} need categorization →
        </button>
      )}
    </Card>
  );
}
