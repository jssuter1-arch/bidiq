// cross-tenant-aggregation-job.ts
// Nightly job: gathers cost data from participating orgs, applies k-anonymity (min 5 orgs),
// and upserts anonymized aggregates into cross_tenant_aggregates.
// NEVER logs which orgs contributed. Never writes identifiable data.

import { supabaseAdmin } from '../utils/supabase';

const K_ANONYMITY_THRESHOLD = 5;

// Metro-area buckets — roll city up to metro to prevent geographic re-identification.
function toCityBucket(city: string | null): string {
  if (!city) return 'unknown';
  const c = city.toLowerCase();
  if (c.includes('boston') || c.includes('cambridge') || c.includes('somerville') ||
      c.includes('brookline') || c.includes('newton') || c.includes('quincy') ||
      c.includes('malden') || c.includes('medford') || c.includes('waltham')) return 'greater_boston';
  if (c.includes('new york') || c.includes('brooklyn') || c.includes('manhattan') ||
      c.includes('bronx') || c.includes('queens') || c.includes('staten')) return 'greater_new_york';
  if (c.includes('chicago') || c.includes('evanston') || c.includes('naperville')) return 'greater_chicago';
  if (c.includes('los angeles') || c.includes('santa monica') || c.includes('pasadena')) return 'greater_los_angeles';
  if (c.includes('san francisco') || c.includes('oakland') || c.includes('san jose') ||
      c.includes('berkeley')) return 'greater_san_francisco';
  if (c.includes('washington') || c.includes('dc') || c.includes('arlington') ||
      c.includes('alexandria') || c.includes('bethesda')) return 'greater_washington_dc';
  return 'other';
}

function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  const idx = (p / 100) * (sorted.length - 1);
  const lo = Math.floor(idx);
  const hi = Math.ceil(idx);
  if (lo === hi) return sorted[lo];
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (idx - lo);
}

function stats(values: number[]) {
  const sorted = [...values].sort((a, b) => a - b);
  const mean = values.reduce((s, v) => s + v, 0) / values.length;
  const variance = values.reduce((s, v) => s + (v - mean) ** 2, 0) / values.length;
  return {
    p25: Math.round(percentile(sorted, 25) * 100) / 100,
    p50: Math.round(percentile(sorted, 50) * 100) / 100,
    p75: Math.round(percentile(sorted, 75) * 100) / 100,
    mean: Math.round(mean * 100) / 100,
    std_dev: Math.round(Math.sqrt(variance) * 100) / 100,
  };
}

interface DataPoint {
  orgId: string;
  metricKey: string;
  propertyType: string | null;
  unitType: string | null;
  cityBucket: string;
  value: number;
}

export async function runCrossTenantAggregation(): Promise<{
  processed: number;
  emitted: number;
  suppressed: number;
}> {
  // 1. Get participating org IDs
  const { data: participants } = await supabaseAdmin
    .from('cross_tenant_participation')
    .select('org_id')
    .eq('is_participating', true);

  if (!participants || participants.length === 0) {
    return { processed: 0, emitted: 0, suppressed: 0 };
  }

  const participatingOrgIds = participants.map((p: any) => p.org_id);

  // 2. Gather properties for city bucketing
  const { data: properties } = await supabaseAdmin
    .from('properties')
    .select('id, property_type, city, org_id')
    .in('org_id', participatingOrgIds);

  const propMap = new Map<string, { propertyType: string | null; city: string | null; orgId: string }>();
  for (const prop of properties || []) {
    propMap.set(prop.id, { propertyType: prop.property_type, city: prop.city, orgId: prop.org_id });
  }

  // 3. Gather approved invoices from participating orgs (rolling 12 months)
  const twelveMonthsAgo = new Date();
  twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);

  const { data: invoices } = await supabaseAdmin
    .from('contractor_invoices')
    .select('id, org_id, total_amount, is_change_order, invoice_date, projects(id, property_id, unit_count)')
    .in('org_id', participatingOrgIds)
    .in('status', ['approved', 'paid'])
    .gte('invoice_date', twelveMonthsAgo.toISOString().slice(0, 10));

  const { data: lineItems } = await supabaseAdmin
    .from('budget_line_items')
    .select('id, invoice_id, category, unit_of_measure, unit_cost, quantity')
    .in('org_id', participatingOrgIds);

  const lineByInvoice = new Map<string, any[]>();
  for (const li of lineItems || []) {
    if (!li.invoice_id) continue;
    if (!lineByInvoice.has(li.invoice_id)) lineByInvoice.set(li.invoice_id, []);
    lineByInvoice.get(li.invoice_id)!.push(li);
  }

  const dataPoints: DataPoint[] = [];

  for (const inv of invoices || []) {
    const proj = (inv as any).projects;
    if (!proj?.property_id) continue;
    const prop = propMap.get(proj.property_id);
    if (!prop) continue;
    const cityBucket = toCityBucket(prop.city);
    const unitCount = proj.unit_count || 1;
    const sqft = unitCount * 850; // rough proxy: 850 sqft per unit

    const lis = lineByInvoice.get(inv.id) || [];
    for (const li of lis) {
      if (!li.category || !li.unit_cost) continue;
      const total = (li.unit_cost || 0) * (li.quantity || 1);

      // cost_per_unit
      dataPoints.push({
        orgId: inv.org_id,
        metricKey: `cost_per_unit_${li.category}_${prop.propertyType || 'unknown'}`,
        propertyType: prop.propertyType,
        unitType: null,
        cityBucket,
        value: total / unitCount,
      });

      // cost_per_sqft
      dataPoints.push({
        orgId: inv.org_id,
        metricKey: `cost_per_sqft_${li.category}_${prop.propertyType || 'unknown'}`,
        propertyType: prop.propertyType,
        unitType: null,
        cityBucket,
        value: total / sqft,
      });

      // change_order_rate
      if (inv.is_change_order) {
        dataPoints.push({
          orgId: inv.org_id,
          metricKey: `change_order_rate_${li.category}`,
          propertyType: prop.propertyType,
          unitType: null,
          cityBucket,
          value: 1, // binary indicator; averaged over all data points
        });
      }
    }
  }

  // 4. Group by (metricKey, propertyType, unitType, cityBucket)
  type GroupKey = string;
  const groups = new Map<GroupKey, { points: DataPoint[]; orgIds: Set<string> }>();

  for (const dp of dataPoints) {
    const key = `${dp.metricKey}|${dp.propertyType || ''}|${dp.unitType || ''}|${dp.cityBucket}`;
    if (!groups.has(key)) groups.set(key, { points: [], orgIds: new Set() });
    const g = groups.get(key)!;
    g.points.push(dp);
    g.orgIds.add(dp.orgId);
  }

  // 5. Apply k-anonymity threshold and upsert
  let emitted = 0;
  let suppressed = 0;
  const processed = groups.size;

  const upserts: any[] = [];
  for (const [key, { points, orgIds }] of groups) {
    if (orgIds.size < K_ANONYMITY_THRESHOLD) {
      suppressed++;
      continue;
    }
    const [metricKey, propertyType, unitType, cityBucket] = key.split('|');
    const values = points.map((p) => p.value);
    const s = stats(values);
    upserts.push({
      metric_key: metricKey,
      property_type: propertyType || null,
      unit_type: unitType || null,
      city_bucket: cityBucket || null,
      sample_org_count: orgIds.size,
      sample_record_count: values.length,
      value_p25: s.p25,
      value_p50: s.p50,
      value_p75: s.p75,
      value_mean: s.mean,
      std_dev: s.std_dev,
      computed_at: new Date().toISOString(),
    });
    emitted++;
  }

  if (upserts.length > 0) {
    await supabaseAdmin
      .from('cross_tenant_aggregates')
      .upsert(upserts, { onConflict: 'metric_key,property_type,unit_type,city_bucket' });
  }

  console.log(`[cross-tenant-aggregation] processed=${processed} emitted=${emitted} suppressed=${suppressed}`);
  return { processed, emitted, suppressed };
}
