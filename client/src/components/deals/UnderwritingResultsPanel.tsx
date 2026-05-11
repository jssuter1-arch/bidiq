import { CheckCircle, XCircle } from 'lucide-react';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import { UnderwritingModel } from '@/types/deals';
import { formatCurrency, formatPercent, formatMultiple } from '@/utils/format';
import CapitalStackBar from './CapitalStackBar';

interface Props {
  model: UnderwritingModel;
}

function MetricCell({ label, value, highlight }: { label: string; value: React.ReactNode; highlight?: boolean }) {
  return (
    <div className="space-y-1">
      <p className="text-2xs text-[var(--text-tertiary)] uppercase tracking-wide">{label}</p>
      <p className={`text-sm font-mono font-semibold ${highlight ? 'text-brand-400' : 'text-[var(--text-primary)]'}`}>
        {value}
      </p>
    </div>
  );
}

export default function UnderwritingResultsPanel({ model }: Props) {
  const irrDisplay = model.irr != null
    ? formatPercent(model.irr * 100)
    : '—';

  const cocDisplay = model.cash_on_cash_year_1 != null
    ? formatPercent(model.cash_on_cash_year_1 * 100)
    : '—';

  return (
    <div className="space-y-4">
      {/* Hurdle status banner */}
      <div className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium ${
        model.meets_hurdle
          ? 'bg-success-bg text-success'
          : 'bg-danger-bg text-danger'
      }`}>
        {model.meets_hurdle
          ? <CheckCircle className="w-4 h-4 flex-shrink-0" />
          : <XCircle className="w-4 h-4 flex-shrink-0" />
        }
        <span>
          {model.meets_hurdle ? 'Meets hurdle rate' : 'Does not meet hurdle rate'}
        </span>
        {model.hurdle_rate != null && (
          <span className="ml-auto text-xs opacity-70">
            Hurdle: {formatPercent(model.hurdle_rate * 100)}
          </span>
        )}
      </div>

      {/* Returns grid */}
      <Card padding="sm">
        <h4 className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wide mb-3">Returns</h4>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <MetricCell label="IRR" value={irrDisplay} highlight />
          <MetricCell label="Equity Multiple" value={formatMultiple(model.equity_multiple)} highlight />
          <MetricCell label="NPV" value={formatCurrency(model.npv, true)} />
          <MetricCell label="CoC Year 1" value={cocDisplay} />
        </div>
      </Card>

      {/* Exit & NOI */}
      <Card padding="sm">
        <h4 className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wide mb-3">Exit & Income</h4>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <MetricCell label="Exit Value" value={formatCurrency(model.projected_exit_value, true)} />
          <MetricCell label="Equity at Exit" value={formatCurrency(model.projected_equity_at_exit, true)} />
          <MetricCell label="NOI Year 1" value={formatCurrency(model.projected_noi_year_1, true)} />
          <MetricCell label="NOI Stabilized" value={formatCurrency(model.projected_noi_stabilized, true)} />
        </div>
      </Card>

      {/* Capital */}
      <Card padding="sm">
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wide">Capital Required</h4>
          <span className="text-sm font-mono font-semibold text-[var(--text-primary)]">
            {formatCurrency(model.total_capital_required)}
          </span>
        </div>
        <CapitalStackBar
          purchasePrice={model.proposed_purchase_price}
          downPaymentPct={model.down_payment_pct}
          renovationCost={model.estimated_renovation_cost}
          closingCosts={model.estimated_closing_costs}
          carryCosts={model.estimated_carry_costs}
          hasConstructionLoan={model.has_construction_loan}
        />
      </Card>

      {/* Max Bid */}
      {model.recommended_max_bid != null && (
        <Card padding="sm" className="border-brand-500/30">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-[var(--text-secondary)] uppercase tracking-wide">Recommended Max Bid</p>
              <p className="text-lg font-mono font-bold text-brand-400 mt-0.5">
                {model.recommended_max_bid > 0
                  ? formatCurrency(model.recommended_max_bid)
                  : 'Deal does not clear hurdle at any price'
                }
              </p>
            </div>
            {model.recommended_max_bid > 0 && (
              <Badge
                variant={model.recommended_max_bid >= model.proposed_purchase_price ? 'success' : 'warning'}
              >
                {model.recommended_max_bid >= model.proposed_purchase_price ? 'Bid range ok' : 'Below proposed'}
              </Badge>
            )}
          </div>
        </Card>
      )}
    </div>
  );
}
