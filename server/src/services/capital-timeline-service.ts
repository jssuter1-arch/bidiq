// capital-timeline-service.ts
// Projects capital required and estimated cash position over a forward time horizon.
// Intentionally a linear projection — directional, not Monte Carlo.

import { supabaseAdmin } from '../utils/supabase';

export type Granularity = 'monthly' | 'quarterly';
export type ViewMode = 'capital_required' | 'cash_position' | 'combined';

export interface CapitalPeriod {
  label: string;       // "Q3 2026" or "Aug 2026"
  period_start: string; // ISO date
  period_end: string;
  capital_required: number;
  cash_position_end: number;
  margin: number;
  health: 'green' | 'amber' | 'red';
  contributors: Array<{ name: string; amount: number; type: 'project' | 'deal' | 'scenario' }>;
  notes: string;
}

export interface CapitalTimelineOutput {
  periods: CapitalPeriod[];
  granularity: Granularity;
  horizon_months: number;
  current_cash: number;
  computed_at: string;
}

function buildPeriods(horizonMonths: number, granularity: Granularity): Array<{ label: string; start: Date; end: Date }> {
  const now = new Date();
  // Snap to beginning of current month
  const base = new Date(now.getFullYear(), now.getMonth(), 1);
  const periods: Array<{ label: string; start: Date; end: Date }> = [];

  if (granularity === 'monthly') {
    for (let i = 0; i < horizonMonths; i++) {
      const start = new Date(base.getFullYear(), base.getMonth() + i, 1);
      const end = new Date(base.getFullYear(), base.getMonth() + i + 1, 0);
      const label = start.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
      periods.push({ label, start, end });
    }
  } else {
    // Quarterly — snap to current quarter
    const qStart = Math.floor(base.getMonth() / 3) * 3;
    const quarterCount = Math.ceil(horizonMonths / 3);
    for (let i = 0; i < quarterCount; i++) {
      const startMonth = qStart + i * 3;
      const start = new Date(base.getFullYear(), startMonth, 1);
      const end = new Date(base.getFullYear(), startMonth + 3, 0);
      const q = Math.floor(start.getMonth() / 3) + 1;
      const label = `Q${q} ${start.getFullYear()}`;
      periods.push({ label, start, end });
    }
  }
  return periods;
}

function allocateLinear(totalAmount: number, projectStart: Date, projectEnd: Date, periodStart: Date, periodEnd: Date): number {
  const projDuration = Math.max(1, (projectEnd.getTime() - projectStart.getTime()) / (1000 * 60 * 60 * 24));
  const overlapStart = Math.max(periodStart.getTime(), projectStart.getTime());
  const overlapEnd = Math.min(periodEnd.getTime(), projectEnd.getTime());
  if (overlapEnd <= overlapStart) return 0;
  const overlapDays = (overlapEnd - overlapStart) / (1000 * 60 * 60 * 24);
  return totalAmount * (overlapDays / projDuration);
}

export async function getCapitalTimeline(
  orgId: string,
  horizonMonths: number = 24,
  granularity: Granularity = 'quarterly',
): Promise<CapitalTimelineOutput> {
  const periods = buildPeriods(horizonMonths, granularity);

  // Current cash position
  const { data: cashAccounts } = await supabaseAdmin
    .from('cash_accounts')
    .select('current_balance')
    .eq('org_id', orgId);

  const currentCash = (cashAccounts || []).reduce((s: number, a: any) => s + (a.current_balance || 0), 0);

  // Active + permitting projects
  const { data: projects } = await supabaseAdmin
    .from('projects')
    .select('id, name, status, current_budget, actual_spend, start_date, projected_end_date')
    .eq('org_id', orgId)
    .in('status', ['active', 'permitting']);

  // Prospective deals
  const { data: deals } = await supabaseAdmin
    .from('acquisition_deals')
    .select('id, deal_name, expected_close_date, purchase_price, renovation_budget_estimate')
    .eq('org_id', orgId)
    .not('status', 'in', '("closed_won","closed_lost","passed")');

  // Monthly rent income estimate
  const { data: units } = await supabaseAdmin
    .from('units')
    .select('current_rent')
    .eq('org_id', orgId);

  const monthlyRent = (units || []).reduce((s: number, u: any) => s + (u.current_rent || 0), 0) * 0.92; // ~8% vacancy
  const monthlyRentPerPeriod = granularity === 'monthly' ? monthlyRent : monthlyRent * 3;

  // Loan debt service estimate: simple 6% annual on active loan principals
  const { data: loans } = await supabaseAdmin
    .from('loan_draws')
    .select('amount')
    .eq('org_id', orgId)
    .eq('status', 'funded');

  const totalLoanPrincipal = (loans || []).reduce((s: number, l: any) => s + (l.amount || 0), 0);
  const monthlyDebtService = totalLoanPrincipal * 0.005; // ~6% annual / 12
  const debtServicePerPeriod = granularity === 'monthly' ? monthlyDebtService : monthlyDebtService * 3;

  const now = new Date();
  let runningCash = currentCash;

  const result: CapitalPeriod[] = periods.map(({ label, start, end }) => {
    let capitalRequired = 0;
    const contributors: CapitalPeriod['contributors'] = [];

    // Project spend allocation
    for (const proj of projects || []) {
      const projStart = proj.start_date ? new Date(proj.start_date) : now;
      const projEnd = proj.projected_end_date ? new Date(proj.projected_end_date) : new Date(now.getFullYear(), now.getMonth() + 6, 1);
      const remaining = Math.max(0, (proj.current_budget || 0) - (proj.actual_spend || 0));
      const allocated = allocateLinear(remaining, projStart, projEnd, start, end);
      if (allocated > 0) {
        capitalRequired += allocated;
        contributors.push({ name: proj.name, amount: allocated, type: 'project' });
      }
    }

    // Deal spend allocation (acquisition + renovation after expected close)
    for (const deal of deals || []) {
      if (!deal.expected_close_date) continue;
      const closeDate = new Date(deal.expected_close_date);
      if (closeDate >= start && closeDate <= end) {
        const dealAmount = (deal.purchase_price || 0) * 0.05 + (deal.renovation_budget_estimate || 0) * 0.1; // closing costs + initial reno
        capitalRequired += dealAmount;
        contributors.push({ name: deal.deal_name, amount: dealAmount, type: 'deal' });
      }
    }

    // Cash position = prior cash + income - debt service - capital required
    const netCash = runningCash + monthlyRentPerPeriod - debtServicePerPeriod - capitalRequired;
    runningCash = netCash;

    const margin = netCash - capitalRequired;
    const marginRatio = capitalRequired > 0 ? margin / capitalRequired : 1;
    const health: CapitalPeriod['health'] = netCash < 0 ? 'red' : marginRatio < 0.2 ? 'amber' : 'green';

    // Auto-note
    const topContrib = contributors.sort((a, b) => b.amount - a.amount)[0];
    const notes = topContrib ? `${topContrib.name} is the largest contributor` : '';

    return {
      label,
      period_start: start.toISOString().slice(0, 10),
      period_end: end.toISOString().slice(0, 10),
      capital_required: Math.round(capitalRequired * 100) / 100,
      cash_position_end: Math.round(netCash * 100) / 100,
      margin: Math.round(margin * 100) / 100,
      health,
      contributors,
      notes,
    };
  });

  return {
    periods: result,
    granularity,
    horizon_months: horizonMonths,
    current_cash: Math.round(currentCash * 100) / 100,
    computed_at: new Date().toISOString(),
  };
}
