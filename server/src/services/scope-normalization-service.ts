import { supabaseAdmin } from '../utils/supabase';

export interface NormalizationInput {
  orgId: string;
  contractorId: string;
  /** If provided, only consider invoices for this category */
  category?: string;
  /** Lookback window in days (default 365) */
  lookbackDays?: number;
}

export interface NormalizedRate {
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

export interface NormalizedRateCardOutput {
  contractor_id: string;
  org_id: string;
  computed_at: string;
  rates: NormalizedRate[];
  warnings: string[];
}

export async function getNormalizedRateCard(input: NormalizationInput): Promise<NormalizedRateCardOutput> {
  const { orgId, contractorId, category, lookbackDays = 365 } = input;
  const cutoff = new Date(Date.now() - lookbackDays * 24 * 60 * 60 * 1000).toISOString();

  // Fetch approved invoices with their line items (which carry scope_factors)
  let invoiceQuery = supabaseAdmin
    .from('contractor_invoices')
    .select(`
      id,
      total_amount,
      is_change_order,
      budget_line_item_id,
      budget_line_items (
        id,
        category,
        scope_factors
      )
    `)
    .eq('org_id', orgId)
    .eq('contractor_id', contractorId)
    .eq('status', 'approved')
    .gte('invoice_date', cutoff.split('T')[0]);

  const { data: invoices } = await invoiceQuery;

  // Fetch all active scope factors for this org
  const { data: scopeFactors } = await supabaseAdmin
    .from('scope_factors')
    .select('id, factor_key, display_name, applicable_categories, adjustment_pct')
    .eq('org_id', orgId)
    .eq('is_active', true);

  const factorMap = new Map((scopeFactors ?? []).map((f: any) => [f.id, f]));

  // Group invoice amounts by category
  interface CategoryBucket {
    totalCost: number;
    count: number;
    factorHitCounts: Map<string, number>; // factorId → jobs where present
  }
  const buckets = new Map<string, CategoryBucket>();

  for (const inv of invoices ?? []) {
    const li = (inv as any).budget_line_items;
    if (!li) continue;
    const cat: string = li.category;
    if (category && cat !== category) continue;

    if (!buckets.has(cat)) {
      buckets.set(cat, { totalCost: 0, count: 0, factorHitCounts: new Map() });
    }
    const bucket = buckets.get(cat)!;
    bucket.totalCost += (inv as any).total_amount ?? 0;
    bucket.count += 1;

    for (const fId of (li.scope_factors ?? []) as string[]) {
      bucket.factorHitCounts.set(fId, (bucket.factorHitCounts.get(fId) ?? 0) + 1);
    }
  }

  const rates: NormalizedRate[] = [];
  const warnings: string[] = [];

  for (const [cat, bucket] of buckets) {
    if (bucket.count === 0) continue;
    const raw_avg = bucket.totalCost / bucket.count;

    // Build per-factor adjustment info
    const adjustments: NormalizedRate['scope_factor_adjustments'] = [];
    let cumulativeAdjustment = 1.0;

    for (const [fId, hitCount] of bucket.factorHitCounts) {
      const factor = factorMap.get(fId);
      if (!factor) continue;
      const presence = hitCount / bucket.count;
      const adjPct = Number(factor.adjustment_pct ?? 0);
      const netImpact = presence * adjPct;
      cumulativeAdjustment *= (1 - netImpact);
      adjustments.push({
        factor_key: factor.factor_key,
        display_name: factor.display_name,
        presence_fraction: presence,
        adjustment_pct: adjPct,
        net_impact_pct: netImpact,
      });
    }

    const normalized_avg = raw_avg * cumulativeAdjustment;

    rates.push({
      category: cat,
      raw_avg_cost: Math.round(raw_avg * 100) / 100,
      normalized_avg_cost: Math.round(normalized_avg * 100) / 100,
      invoice_count: bucket.count,
      scope_factor_adjustments: adjustments,
    });
  }

  if (rates.length === 0) {
    warnings.push(`No approved invoices found for contractor ${contractorId} in the last ${lookbackDays} days.`);
  }

  return {
    contractor_id: contractorId,
    org_id: orgId,
    computed_at: new Date().toISOString(),
    rates,
    warnings,
  };
}
