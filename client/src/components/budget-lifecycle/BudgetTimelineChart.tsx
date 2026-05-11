import { useMemo } from 'react';
import { formatCurrency, formatDate } from '@/utils/format';

interface TimelinePoint {
  id: string;
  snapshotType: string;
  effectiveDate: string;
  budgetTotal: number;
  actualSpend: number;
  changeOrderTotal: number;
  isCurrent: boolean;
  notes: string | null;
}

interface Props {
  timeline: TimelinePoint[];
  height?: number;
}

const TYPE_COLOR: Record<string, string> = {
  project_created: 'var(--text-tertiary)',
  bank_declared:   'var(--brand-400, #818cf8)',
  break_ground:    '#3b82f6',
  revision:        '#f59e0b',
  completion:      '#22c55e',
  manual:          'var(--text-secondary)',
  underwriting:    'var(--brand-400, #818cf8)',
};

export default function BudgetTimelineChart({ timeline, height = 160 }: Props) {
  const padH = 12;
  const padV = 24;
  const width = 600; // viewBox width; SVG scales to container

  const { budgetPoints, spendPoints, maxVal } = useMemo(() => {
    if (timeline.length === 0) return { budgetPoints: [], spendPoints: [], maxVal: 1 };
    const maxVal = Math.max(...timeline.map((t) => Math.max(t.budgetTotal, t.actualSpend)), 1);
    const n = timeline.length;
    const xStep = n > 1 ? (width - padH * 2) / (n - 1) : 0;
    const chartH = height - padV * 2;

    const budgetPoints = timeline.map((t, i) => ({
      x: padH + i * xStep,
      y: padV + chartH - (t.budgetTotal / maxVal) * chartH,
      ...t,
    }));
    const spendPoints = timeline.map((t, i) => ({
      x: padH + i * xStep,
      y: padV + chartH - (t.actualSpend / maxVal) * chartH,
      ...t,
    }));
    return { budgetPoints, spendPoints, maxVal };
  }, [timeline, height]);

  if (timeline.length === 0) {
    return (
      <div className="flex items-center justify-center h-32 text-sm text-[var(--text-tertiary)]">
        No snapshot data yet
      </div>
    );
  }

  const toPolyline = (pts: typeof budgetPoints) =>
    pts.map((p) => `${p.x},${p.y}`).join(' ');

  return (
    <div className="w-full overflow-hidden">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full"
        style={{ height }}
        aria-label="Budget timeline chart"
      >
        {/* Grid lines */}
        {[0, 0.25, 0.5, 0.75, 1].map((pct) => {
          const y = padV + (height - padV * 2) * (1 - pct);
          return (
            <g key={pct}>
              <line x1={padH} y1={y} x2={width - padH} y2={y} stroke="var(--border-subtle)" strokeWidth={0.5} />
              <text x={padH} y={y - 3} fontSize={9} fill="var(--text-tertiary)" fontFamily="monospace">
                {formatCurrency(maxVal * pct, true)}
              </text>
            </g>
          );
        })}

        {/* Budget line (lighter) */}
        <polyline
          points={toPolyline(budgetPoints)}
          fill="none"
          stroke="var(--brand-500)"
          strokeWidth={1.5}
          strokeOpacity={0.5}
          strokeDasharray="4 3"
        />

        {/* Spend line */}
        <polyline
          points={toPolyline(spendPoints)}
          fill="none"
          stroke="var(--brand-500)"
          strokeWidth={2}
        />

        {/* Event dots on budget line */}
        {budgetPoints.map((p) => (
          <g key={`b-${p.id}`}>
            <circle
              cx={p.x}
              cy={p.y}
              r={4}
              fill={TYPE_COLOR[p.snapshotType] ?? 'var(--text-tertiary)'}
              stroke="var(--bg-surface)"
              strokeWidth={1.5}
            />
            {/* Date label */}
            <text
              x={p.x}
              y={height - 4}
              fontSize={8}
              fill="var(--text-tertiary)"
              textAnchor="middle"
              fontFamily="monospace"
            >
              {formatDate(p.effectiveDate, 'MMM yy')}
            </text>
          </g>
        ))}

        {/* Tooltip via title on dots */}
        {budgetPoints.map((p) => (
          <circle key={`tip-${p.id}`} cx={p.x} cy={p.y} r={10} fillOpacity={0} cursor="pointer">
            <title>{`${p.snapshotType}\n${formatDate(p.effectiveDate)}\nBudget: ${formatCurrency(p.budgetTotal)}\nSpend: ${formatCurrency(p.actualSpend)}`}</title>
          </circle>
        ))}
      </svg>

      {/* Legend */}
      <div className="flex gap-4 text-2xs text-[var(--text-tertiary)] mt-1 px-3">
        <span className="flex items-center gap-1">
          <span className="inline-block w-4 border-t border-dashed border-brand-500 opacity-60" />
          Budget
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block w-4 border-t-2 border-brand-500" />
          Actual Spend
        </span>
      </div>
    </div>
  );
}
