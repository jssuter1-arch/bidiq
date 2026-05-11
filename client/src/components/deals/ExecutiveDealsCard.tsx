import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { TrendingUp, ArrowRight } from 'lucide-react';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import Skeleton from '@/components/ui/Skeleton';
import { AcquisitionDeal, DEAL_STATUS_LABELS, PIPELINE_STATUSES } from '@/types/deals';
import { formatCurrency, formatPercent } from '@/utils/format';
import api from '@/services/api';

const STATUS_COLORS: Record<string, any> = {
  prospecting: 'info',
  underwriting: 'brand',
  loi_submitted: 'warning',
  under_negotiation: 'warning',
  due_diligence: 'warning',
};

export default function ExecutiveDealsCard() {
  const navigate = useNavigate();
  const [deals, setDeals] = useState<AcquisitionDeal[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get('/v1/deals', { params: { limit: 50 } })
      .then((r) => setDeals(r.data.data || []))
      .catch(() => setDeals([]))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <Card className="space-y-3">
        <Skeleton className="h-4 w-32" />
        <div className="space-y-2">
          {[0, 1, 2].map((i) => <Skeleton key={i} className="h-8" />)}
        </div>
      </Card>
    );
  }

  const pipeline = deals.filter((d) => PIPELINE_STATUSES.includes(d.status));
  const activeModels = deals
    .map((d) => Array.isArray(d.active_model) ? d.active_model[0] : d.active_model)
    .filter(Boolean);
  const meetingHurdle = activeModels.filter((m: any) => m?.meets_hurdle).length;

  const countsByStatus = PIPELINE_STATUSES.reduce((acc, s) => {
    acc[s] = pipeline.filter((d) => d.status === s).length;
    return acc;
  }, {} as Record<string, number>);

  const topIRR = activeModels
    .filter((m: any) => m?.irr != null)
    .sort((a: any, b: any) => b.irr - a.irr)
    .slice(0, 3);

  return (
    <Card className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-brand-400" />
          <h3 className="text-sm font-semibold text-[var(--text-primary)]">Deal Pipeline</h3>
        </div>
        <button
          onClick={() => navigate('/deals')}
          className="flex items-center gap-1 text-xs text-brand-400 hover:text-brand-300 transition-colors"
        >
          View all <ArrowRight className="w-3 h-3" />
        </button>
      </div>

      {pipeline.length === 0 ? (
        <p className="text-sm text-[var(--text-tertiary)] py-2 text-center">No active deals in pipeline</p>
      ) : (
        <>
          {/* Status distribution */}
          <div className="flex flex-wrap gap-1.5">
            {PIPELINE_STATUSES.map((s) => countsByStatus[s] > 0 && (
              <Badge key={s} variant={STATUS_COLORS[s]} size="sm">
                {countsByStatus[s]} {DEAL_STATUS_LABELS[s]}
              </Badge>
            ))}
          </div>

          {/* Hurdle summary */}
          <div className="flex items-center justify-between text-xs text-[var(--text-secondary)] border-t border-[var(--border-subtle)] pt-3">
            <span>{meetingHurdle} of {activeModels.length} meet hurdle</span>
            <span className="text-[var(--text-tertiary)]">{pipeline.length} in pipeline</span>
          </div>

          {/* Top IRR deals */}
          {topIRR.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-2xs text-[var(--text-tertiary)] uppercase tracking-wide">Top IRR deals</p>
              {topIRR.map((m: any) => {
                const deal = deals.find((d) => d.id === m.deal_id);
                if (!deal) return null;
                return (
                  <div
                    key={m.id}
                    onClick={() => navigate(`/deals/${deal.id}`)}
                    className="flex items-center justify-between text-xs hover:bg-[var(--bg-elevated)] px-1.5 py-1 rounded cursor-pointer transition-colors"
                  >
                    <span className="text-[var(--text-primary)] truncate flex-1">{deal.deal_name}</span>
                    <span className={`font-mono ml-2 ${m.meets_hurdle ? 'text-success' : 'text-danger'}`}>
                      {formatPercent(m.irr * 100)}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
    </Card>
  );
}
