import { useEffect, useState } from 'react';
import { TrendingDown } from 'lucide-react';
import api from '@/services/api';
import Card from '@/components/ui/Card';
import Spinner from '@/components/ui/Spinner';
import { formatCurrency } from '@/utils/format';

interface NormalizedRate {
  category: string;
  raw_avg_cost: number;
  normalized_avg_cost: number;
  invoice_count: number;
  scope_factor_adjustments: Array<{
    factor_key: string;
    display_name: string;
    presence_fraction: number;
    adjustment_pct: number;
    net_impact_pct: number;
  }>;
}

interface Props {
  contractorId: string;
}

export default function ContractorNormalizedRateCard({ contractorId }: Props) {
  const [rates, setRates] = useState<NormalizedRate[]>([]);
  const [loading, setLoading] = useState(true);
  const [warnings, setWarnings] = useState<string[]>([]);

  useEffect(() => {
    api.get(`/v1/change-orders/normalized-rates/${contractorId}`)
      .then((r) => {
        setRates(r.data.rates ?? []);
        setWarnings(r.data.warnings ?? []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [contractorId]);

  return (
    <Card className="space-y-3">
      <div className="flex items-center gap-2">
        <TrendingDown className="w-4 h-4 text-brand-400" />
        <h3 className="text-sm font-semibold text-[var(--text-primary)]">Normalized Rate Card</h3>
        <span className="text-xs text-[var(--text-tertiary)]">(scope-adjusted, trailing 12 mo)</span>
      </div>

      {loading && <div className="flex justify-center py-4"><Spinner /></div>}

      {!loading && warnings.length > 0 && rates.length === 0 && (
        <p className="text-sm text-[var(--text-tertiary)]">{warnings[0]}</p>
      )}

      {!loading && rates.length > 0 && (
        <div className="space-y-3">
          {rates.map((r) => {
            const pctChange = r.raw_avg_cost > 0
              ? ((r.normalized_avg_cost - r.raw_avg_cost) / r.raw_avg_cost) * 100
              : 0;
            return (
              <div key={r.category} className="p-3 rounded-lg bg-[var(--bg-elevated)] space-y-2">
                <div className="flex items-center justify-between">
                  <span className="capitalize text-sm font-medium text-[var(--text-primary)]">
                    {r.category.replace(/_/g, ' ')}
                  </span>
                  <span className="text-xs text-[var(--text-tertiary)]">{r.invoice_count} invoice{r.invoice_count !== 1 ? 's' : ''}</span>
                </div>
                <div className="flex items-center gap-6 text-sm">
                  <div>
                    <p className="text-xs text-[var(--text-tertiary)]">Raw Avg</p>
                    <p className="font-mono text-[var(--text-secondary)]">{formatCurrency(r.raw_avg_cost)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-[var(--text-tertiary)]">Normalized</p>
                    <p className="font-mono font-semibold text-[var(--text-primary)]">{formatCurrency(r.normalized_avg_cost)}</p>
                  </div>
                  {pctChange !== 0 && (
                    <div>
                      <p className="text-xs text-[var(--text-tertiary)]">Adj.</p>
                      <p className={`text-xs font-medium ${pctChange < 0 ? 'text-green-500' : 'text-red-400'}`}>
                        {pctChange > 0 ? '+' : ''}{pctChange.toFixed(1)}%
                      </p>
                    </div>
                  )}
                </div>
                {r.scope_factor_adjustments.length > 0 && (
                  <div className="space-y-1">
                    {r.scope_factor_adjustments.map((adj) => (
                      <div key={adj.factor_key} className="flex justify-between text-xs text-[var(--text-tertiary)]">
                        <span>{adj.display_name}</span>
                        <span>{(adj.presence_fraction * 100).toFixed(0)}% of jobs · −{(adj.net_impact_pct * 100).toFixed(1)}% net</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}
