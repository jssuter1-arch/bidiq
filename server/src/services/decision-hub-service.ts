// decision-hub-service.ts
// Aggregates pending actions across the platform into a single prioritized list.
// Cached per-org per-user in decision_hub_cache with a 15-minute TTL.

import { supabaseAdmin } from '../utils/supabase';

export type ItemType =
  | 'scenario_decision'
  | 'deal_promotion'
  | 'change_order_categorization'
  | 'budget_alert'
  | 'permit_expiring'
  | 'underwriting_stale';

export type Urgency = 'today' | 'this_week' | 'background';

export interface DecisionHubItem {
  id: string;
  type: ItemType;
  title: string;
  context: string;
  open_url: string;
  urgency: Urgency;
  amount?: number;
  days_pending?: number;
  entity_name?: string;
}

export interface DecisionHubOutput {
  items: DecisionHubItem[];
  counts: { today: number; this_week: number; background: number; total: number };
  computed_at: string;
}

function daysSince(dateStr: string | null): number {
  if (!dateStr) return 0;
  return Math.floor((Date.now() - new Date(dateStr).getTime()) / (1000 * 60 * 60 * 24));
}

function daysUntil(dateStr: string | null): number {
  if (!dateStr) return 999;
  return Math.floor((new Date(dateStr).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
}

export async function getDecisionHubItems(orgId: string): Promise<DecisionHubOutput> {
  const items: DecisionHubItem[] = [];

  // 1. Scenario comparisons awaiting decision
  const { data: comparisons } = await supabaseAdmin
    .from('scenario_path_comparisons')
    .select('id, name, created_at, selected_scenario_id')
    .eq('org_id', orgId)
    .is('selected_scenario_id', null);

  for (const comp of comparisons || []) {
    const days = daysSince(comp.created_at);
    const urgency: Urgency = days > 7 ? 'this_week' : 'background';
    items.push({
      id: `scenario-${comp.id}`,
      type: 'scenario_decision',
      title: `${comp.name || 'Scenario Comparison'} — Awaiting Decision`,
      context: `Open for ${days} days`,
      open_url: `/scenarios/compare/${comp.id}`,
      urgency,
      days_pending: days,
      entity_name: comp.name,
    });
  }

  // 2. Deals closed_won not yet promoted (promoted_to_property_id is null means not yet acted on)
  const { data: wonDeals } = await supabaseAdmin
    .from('acquisition_deals')
    .select('id, deal_name, updated_at, purchase_price')
    .eq('org_id', orgId)
    .eq('status', 'closed_won')
    .is('promoted_to_property_id', null);

  for (const deal of wonDeals || []) {
    const days = daysSince(deal.updated_at);
    const urgency: Urgency = days > 14 ? 'this_week' : 'background';
    items.push({
      id: `deal-${deal.id}`,
      type: 'deal_promotion',
      title: `${deal.deal_name} — Won Deal Awaiting Project Creation`,
      context: `Closed ${days} days ago`,
      open_url: `/deals/${deal.id}`,
      urgency,
      amount: deal.purchase_price,
      days_pending: days,
      entity_name: deal.deal_name,
    });
  }

  // 3. Uncategorized change orders
  const { data: uncatCOs } = await supabaseAdmin
    .from('contractor_invoices')
    .select('id, invoice_number, invoice_date, total_amount, projects(name)')
    .eq('org_id', orgId)
    .eq('is_change_order', true)
    .is('change_order_category', null)
    .in('status', ['approved', 'paid'])
    .limit(20);

  for (const inv of uncatCOs || []) {
    const days = daysSince(inv.invoice_date);
    const urgency: Urgency = days > 30 ? 'this_week' : 'background';
    items.push({
      id: `co-${inv.id}`,
      type: 'change_order_categorization',
      title: `Change Order ${inv.invoice_number || inv.id.slice(0, 8)} — Needs Categorization`,
      context: `${(inv as any).projects?.name || 'Unknown project'} · ${days} days old`,
      open_url: '/intelligence/change-orders/queue',
      urgency,
      amount: inv.total_amount,
      days_pending: days,
      entity_name: (inv as any).projects?.name,
    });
  }

  // 4. Budget alerts — projects over 85% or 100%
  const { data: activeProjects } = await supabaseAdmin
    .from('projects')
    .select('id, name, current_budget, actual_spend')
    .eq('org_id', orgId)
    .in('status', ['active', 'permitting']);

  for (const proj of activeProjects || []) {
    const pct = proj.current_budget > 0 ? (proj.actual_spend / proj.current_budget) * 100 : 0;
    if (pct >= 85) {
      const urgency: Urgency = pct >= 100 ? 'today' : 'this_week';
      items.push({
        id: `budget-${proj.id}`,
        type: 'budget_alert',
        title: `${proj.name} — ${pct >= 100 ? 'Over Budget' : 'Approaching Budget Limit'}`,
        context: `${pct.toFixed(1)}% of budget consumed`,
        open_url: `/projects/${proj.id}`,
        urgency,
        amount: proj.actual_spend,
        entity_name: proj.name,
      });
    }
  }

  // 5. Permits expiring within 30 days
  const in30 = new Date();
  in30.setDate(in30.getDate() + 30);
  const { data: expiringPermits } = await supabaseAdmin
    .from('permits')
    .select('id, permit_type, expiry_date, projects(id, name)')
    .eq('org_id', orgId)
    .in('status', ['approved', 'active'])
    .lte('expiry_date', in30.toISOString().slice(0, 10));

  for (const permit of expiringPermits || []) {
    const daysLeft = daysUntil(permit.expiry_date);
    const urgency: Urgency = daysLeft <= 7 ? 'today' : 'this_week';
    const projName = (permit as any).projects?.name || 'Unknown project';
    items.push({
      id: `permit-${permit.id}`,
      type: 'permit_expiring',
      title: `${permit.permit_type} Permit Expiring — ${projName}`,
      context: `Expires in ${daysLeft} days`,
      open_url: `/permits`,
      urgency,
      days_pending: daysLeft,
      entity_name: projName,
    });
  }

  // 6. Underwriting stale — active deals in underwriting/under_negotiation with no update in 14+ days
  const { data: staleDeals } = await supabaseAdmin
    .from('acquisition_deals')
    .select('id, deal_name, updated_at')
    .eq('org_id', orgId)
    .in('status', ['underwriting', 'under_negotiation']);

  for (const deal of staleDeals || []) {
    const days = daysSince(deal.updated_at);
    if (days >= 14) {
      items.push({
        id: `stale-${deal.id}`,
        type: 'underwriting_stale',
        title: `${deal.deal_name} — Underwriting Not Updated`,
        context: `Last updated ${days} days ago`,
        open_url: `/deals/${deal.id}`,
        urgency: 'this_week',
        days_pending: days,
        entity_name: deal.deal_name,
      });
    }
  }

  // Sort: today first, then this_week, then background; within tier: oldest first
  const urgencyOrder: Record<Urgency, number> = { today: 0, this_week: 1, background: 2 };
  items.sort((a, b) => {
    const uDiff = urgencyOrder[a.urgency] - urgencyOrder[b.urgency];
    if (uDiff !== 0) return uDiff;
    return (b.days_pending || 0) - (a.days_pending || 0);
  });

  const counts = {
    today: items.filter((i) => i.urgency === 'today').length,
    this_week: items.filter((i) => i.urgency === 'this_week').length,
    background: items.filter((i) => i.urgency === 'background').length,
    total: items.length,
  };

  return { items, counts, computed_at: new Date().toISOString() };
}

export async function getCachedDecisionHub(orgId: string, userId: string): Promise<DecisionHubOutput> {
  const now = new Date();

  // Check cache
  const { data: cached } = await supabaseAdmin
    .from('decision_hub_cache')
    .select('items, expires_at')
    .eq('org_id', orgId)
    .eq('user_id', userId)
    .maybeSingle();

  if (cached && new Date(cached.expires_at) > now) {
    return cached.items as DecisionHubOutput;
  }

  // Recompute
  const fresh = await getDecisionHubItems(orgId);

  const expiresAt = new Date(now.getTime() + 15 * 60 * 1000).toISOString();
  await supabaseAdmin
    .from('decision_hub_cache')
    .upsert({ org_id: orgId, user_id: userId, items: fresh, computed_at: now.toISOString(), expires_at: expiresAt },
      { onConflict: 'org_id,user_id' });

  return fresh;
}

export async function invalidateDecisionHubCache(orgId: string): Promise<void> {
  await supabaseAdmin
    .from('decision_hub_cache')
    .delete()
    .eq('org_id', orgId);
}
