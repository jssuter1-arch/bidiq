import NegativeNpvWarning from './NegativeNpvWarning';
import { formatCurrency, formatPercent } from '@/utils/format';

interface Results {
  npv: number | null;
  irr: number | null;
  payback_months: number | null;
  total_capital_required: number;
  value_created: number | null;
  meets_hurdle: boolean | null;
}

interface Props {
  results: Results;
  hurdleRate?: number;
}

export default function ScenarioResultsPanel({ results, hurdleRate }: Props) {
  const { npv, irr, payback_months, total_capital_required, value_created, meets_hurdle } = results;

  return (
    <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-surface-2)] p-7 space-y-5 sticky top-4">
      {/* Hero */}
      <div className="text-center">
        <p className="text-4xl font-heading font-extrabold text-brand-400 drop-shadow-[0_0_24px_rgba(99,102,241,0.4)]">
          {value_created !== null ? formatCurrency(value_created, true) : '—'}
        </p>
        <p className="text-sm text-[var(--text-secondary)] mt-1">Equity created by this scenario</p>
      </div>

      {/* 4-up grid */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-[var(--bg-elevated)] rounded-xl p-3">
          <p className="text-xs text-[var(--text-tertiary)]">NPV</p>
          <p className={`text-xl font-financial font-bold mt-0.5 ${npv !== null && npv >= 0 ? 'text-success' : 'text-danger'}`}>
            {npv !== null ? formatCurrency(npv, true) : '—'}
          </p>
        </div>
        <div className="bg-[var(--bg-elevated)] rounded-xl p-3">
          <p className="text-xs text-[var(--text-tertiary)]">IRR</p>
          <p className={`text-xl font-financial font-bold mt-0.5 ${meets_hurdle ? 'text-success' : irr !== null ? 'text-warning' : 'text-[var(--text-secondary)]'}`}>
            {irr !== null ? formatPercent(irr * 100) : '—'}
          </p>
        </div>
        <div className="bg-[var(--bg-elevated)] rounded-xl p-3">
          <p className="text-xs text-[var(--text-tertiary)]">Payback</p>
          <p className="text-xl font-financial font-bold mt-0.5 text-[var(--text-primary)]">
            {payback_months !== null ? `${Math.round(payback_months)}mo` : '—'}
          </p>
        </div>
        <div className="bg-[var(--bg-elevated)] rounded-xl p-3">
          <p className="text-xs text-[var(--text-tertiary)]">Capital Required</p>
          <p className="text-xl font-financial font-bold mt-0.5 text-[var(--text-primary)]">
            {formatCurrency(total_capital_required, true)}
          </p>
        </div>
      </div>

      {/* Hurdle indicator */}
      <NegativeNpvWarning npv={npv} irr={irr} meetsHurdle={meets_hurdle} hurdleRate={hurdleRate} />
    </div>
  );
}
