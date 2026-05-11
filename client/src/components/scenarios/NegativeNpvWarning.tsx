import { AlertOctagon } from 'lucide-react';

interface Props {
  npv: number | null;
  irr: number | null;
  meetsHurdle: boolean | null;
  hurdleRate?: number;
}

export default function NegativeNpvWarning({ npv, irr, meetsHurdle, hurdleRate = 0.15 }: Props) {
  if (npv === null) {
    return (
      <div className="rounded-lg bg-[var(--bg-elevated)] border border-[var(--border-default)] px-4 py-3">
        <p className="text-sm text-[var(--text-tertiary)]">Enter inputs to see results</p>
      </div>
    );
  }

  if (npv <= 0) {
    return (
      <div className="rounded-lg bg-danger-bg border border-danger/30 px-4 py-3 flex items-start gap-3">
        <AlertOctagon className="w-5 h-5 text-danger flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-bold text-danger">Negative NPV — this scenario destroys value</p>
          <p className="text-xs text-danger/80 mt-0.5">
            The discounted cash flows do not recover the capital cost. Avoid committing capital to this path.
          </p>
        </div>
      </div>
    );
  }

  if (!meetsHurdle && irr !== null) {
    const hurdlePct = (hurdleRate * 100).toFixed(0);
    const irrPct = (irr * 100).toFixed(1);
    const gap = ((hurdleRate - irr) * 100).toFixed(1);
    return (
      <div className="rounded-lg bg-warning-bg border border-warning/30 px-4 py-3 flex items-start gap-3">
        <AlertOctagon className="w-5 h-5 text-warning flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-semibold text-warning">Creates value but below {hurdlePct}% hurdle</p>
          <p className="text-xs text-warning/80 mt-0.5">
            IRR is {irrPct}% — {gap}pts below the hurdle rate. Review assumptions before committing.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-lg bg-success-bg border border-success/30 px-4 py-3 flex items-center gap-3">
      <div className="w-5 h-5 rounded-full bg-success flex items-center justify-center flex-shrink-0">
        <span className="text-white text-xs font-bold">✓</span>
      </div>
      <p className="text-sm font-semibold text-success">This scenario creates value and exceeds your hurdle</p>
    </div>
  );
}
