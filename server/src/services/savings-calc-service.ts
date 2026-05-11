// savings-calc-service.ts
// Computes BidIQ-attributable savings YTD.
// Three conservative components: renovation under-budget, overpay caught, change-order discipline.
// All numbers are intentionally conservative; methodology displayed transparently in UI.

import { supabaseAdmin } from '../utils/supabase';

export interface SavingsComponents {
  renovation_under_budget: number;
  overpay_caught: number;
  change_order_discipline: number;
}

export interface SavingsCalcOutput {
  total_ytd: number;
  components: SavingsComponents;
  ytd_start: string;
  computed_at: string;
  methodology_version: string;
}

export interface MonthlySavingsPoint {
  month: string; // 'YYYY-MM'
  cumulative: number;
}

function ytdStart(): string {
  const now = new Date();
  return `${now.getFullYear()}-01-01`;
}

export async function getSavingsYTD(orgId: string): Promise<SavingsCalcOutput> {
  const ytd = ytdStart();

  // --- Component 1: Renovation Under-Budget Savings ---
  // Projects with both a bank_declared snapshot and a completion snapshot where completion < bank_declared.
  const { data: completionSnaps } = await supabaseAdmin
    .from('project_budget_snapshots')
    .select('project_id, budget_total, actual_spend_at_snapshot, effective_date')
    .eq('org_id', orgId)
    .eq('snapshot_type', 'completion')
    .gte('effective_date', ytd);

  let renovationUnderBudget = 0;
  if (completionSnaps && completionSnaps.length > 0) {
    const projectIds = completionSnaps.map((s: any) => s.project_id);
    const { data: bankSnaps } = await supabaseAdmin
      .from('project_budget_snapshots')
      .select('project_id, budget_total')
      .eq('org_id', orgId)
      .eq('snapshot_type', 'bank_declared')
      .in('project_id', projectIds);

    const bankByProject = new Map<string, number>();
    (bankSnaps || []).forEach((s: any) => bankByProject.set(s.project_id, s.budget_total));

    for (const snap of completionSnaps) {
      const bankDeclared = bankByProject.get(snap.project_id);
      if (bankDeclared && bankDeclared > snap.actual_spend_at_snapshot) {
        renovationUnderBudget += bankDeclared - snap.actual_spend_at_snapshot;
      }
    }
  }

  // --- Component 2: Overpay Caught ---
  // Invoices flagged as overpay that were either rejected (status = 'rejected') or
  // renegotiated (original_amount > total_amount where flagged_overpay = true).
  const { data: flaggedInvoices } = await supabaseAdmin
    .from('contractor_invoices')
    .select('id, total_amount, original_amount, status')
    .eq('org_id', orgId)
    .eq('flagged_overpay', true)
    .gte('invoice_date', ytd);

  let overpayCaught = 0;
  for (const inv of flaggedInvoices || []) {
    if (inv.status === 'rejected') {
      overpayCaught += inv.original_amount ?? inv.total_amount ?? 0;
    } else if (inv.original_amount && inv.total_amount && inv.original_amount > inv.total_amount) {
      overpayCaught += inv.original_amount - inv.total_amount;
    }
  }

  // --- Component 3: Change Order Discipline ---
  // Estimated savings from below-industry CO rate, if cross-tenant benchmark exists.
  // Conservative: only credit 50% of outperformance gap.
  let changeOrderDiscipline = 0;
  const { data: aggRow } = await supabaseAdmin
    .from('cross_tenant_aggregates')
    .select('value_p50')
    .like('metric_key', 'change_order_rate_%')
    .limit(1)
    .maybeSingle();

  if (aggRow?.value_p50) {
    const industryCoRate = Number(aggRow.value_p50);

    const { data: orgInvoices } = await supabaseAdmin
      .from('contractor_invoices')
      .select('total_amount, is_change_order')
      .eq('org_id', orgId)
      .in('status', ['approved', 'paid'])
      .gte('invoice_date', ytd);

    const totalSpend = (orgInvoices || []).reduce((s: number, i: any) => s + (i.total_amount || 0), 0);
    const coSpend = (orgInvoices || [])
      .filter((i: any) => i.is_change_order)
      .reduce((s: number, i: any) => s + (i.total_amount || 0), 0);

    if (totalSpend > 0) {
      const orgCoRate = coSpend / totalSpend;
      if (orgCoRate < industryCoRate) {
        const initialBudgets = totalSpend; // proxy
        changeOrderDiscipline = (industryCoRate - orgCoRate) * initialBudgets * 0.5;
      }
    }
  }

  const total = renovationUnderBudget + overpayCaught + changeOrderDiscipline;

  return {
    total_ytd: Math.round(total * 100) / 100,
    components: {
      renovation_under_budget: Math.round(renovationUnderBudget * 100) / 100,
      overpay_caught: Math.round(overpayCaught * 100) / 100,
      change_order_discipline: Math.round(changeOrderDiscipline * 100) / 100,
    },
    ytd_start: ytd,
    computed_at: new Date().toISOString(),
    methodology_version: 'v1',
  };
}

export async function getSavingsTrend(orgId: string): Promise<MonthlySavingsPoint[]> {
  // Build monthly cumulative savings over the trailing 24 months.
  const now = new Date();
  const months: string[] = [];
  for (let i = 23; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
  }

  const { data: completionSnaps } = await supabaseAdmin
    .from('project_budget_snapshots')
    .select('project_id, actual_spend_at_snapshot, effective_date')
    .eq('org_id', orgId)
    .eq('snapshot_type', 'completion')
    .gte('effective_date', `${now.getFullYear() - 2}-01-01`);

  const { data: bankSnaps } = await supabaseAdmin
    .from('project_budget_snapshots')
    .select('project_id, budget_total')
    .eq('org_id', orgId)
    .eq('snapshot_type', 'bank_declared');

  const bankByProject = new Map<string, number>();
  (bankSnaps || []).forEach((s: any) => bankByProject.set(s.project_id, s.budget_total));

  // savings per month
  const savingsByMonth = new Map<string, number>();
  for (const snap of completionSnaps || []) {
    const month = snap.effective_date?.slice(0, 7);
    if (!month) continue;
    const bank = bankByProject.get(snap.project_id);
    if (bank && bank > snap.actual_spend_at_snapshot) {
      savingsByMonth.set(month, (savingsByMonth.get(month) || 0) + (bank - snap.actual_spend_at_snapshot));
    }
  }

  let cumulative = 0;
  return months.map((m) => {
    cumulative += savingsByMonth.get(m) || 0;
    return { month: m, cumulative: Math.round(cumulative * 100) / 100 };
  });
}
