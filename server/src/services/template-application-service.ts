import { supabaseAdmin } from '../utils/supabase';

export interface UnitScope {
  unitId: string;
  categories: string[];
  overrides: Record<string, number>;
}

export interface PropertyLevelScope {
  category: string;
  sqft?: number;
  notes?: string;
}

export interface TemplateApplicationInput {
  propertyId: string;
  orgId: string;
  templateId: string;
  useOrgBenchmarks: boolean;
  unitScopes: UnitScope[];
  propertyLevelScopes: PropertyLevelScope[];
}

export interface DraftLineItem {
  category: string;
  subcategory?: string;
  description: string;
  unit_id?: string;
  budgeted_amount: number;
  sqft_applicable?: number;
  unit_count: number;
  source: 'template' | 'benchmark' | 'manual';
  source_reference?: string;
}

export interface TemplateApplicationOutput {
  lineItems: DraftLineItem[];
  total_budgeted: number;
  warnings: string[];
}

export async function applyTemplate(input: TemplateApplicationInput): Promise<TemplateApplicationOutput> {
  const { propertyId, orgId, templateId, useOrgBenchmarks, unitScopes, propertyLevelScopes } = input;

  // Fetch template items
  const { data: templateItems } = await supabaseAdmin
    .from('pricing_template_items')
    .select('*')
    .eq('template_id', templateId)
    .eq('org_id', orgId);

  // Fetch org benchmarks if requested
  let benchmarks: any[] = [];
  if (useOrgBenchmarks) {
    const { data: bData } = await supabaseAdmin
      .from('cost_benchmarks')
      .select('*')
      .eq('org_id', orgId)
      .gte('sample_count', 3);
    benchmarks = bData ?? [];
  }

  // Fetch units for property
  const { data: units } = await supabaseAdmin
    .from('units')
    .select('id, unit_number, bedrooms, bathrooms, square_feet, status')
    .eq('property_id', propertyId)
    .eq('org_id', orgId);

  const unitMap = new Map((units ?? []).map((u: any) => [u.id, u]));
  const templateMap = new Map((templateItems ?? []).map((t: any) => [t.category, t]));
  const benchmarkMap = new Map((benchmarks ?? []).map((b: any) => [b.category, b]));

  const lineItems: DraftLineItem[] = [];
  const warnings: string[] = [];

  // Process unit-level scopes
  for (const scope of unitScopes) {
    const unit = unitMap.get(scope.unitId);
    const unitSqft = unit?.square_feet ?? 0;

    for (const cat of scope.categories) {
      // Manual override takes priority
      if (scope.overrides[cat] !== undefined) {
        lineItems.push({
          category: cat,
          description: `${cat.replace(/_/g, ' ')} — Unit ${unit?.unit_number ?? scope.unitId}`,
          unit_id: scope.unitId,
          budgeted_amount: scope.overrides[cat],
          sqft_applicable: unitSqft,
          unit_count: 1,
          source: 'manual',
        });
        continue;
      }

      const tItem = templateMap.get(cat);
      if (tItem) {
        let amount = 0;
        let warn = false;

        if (tItem.unit_basis === 'per_unit') {
          amount = tItem.unit_cost;
        } else if (tItem.unit_basis === 'per_sqft') {
          amount = tItem.unit_cost * (unitSqft || 0);
        } else if (tItem.unit_basis === 'flat') {
          amount = tItem.unit_cost;
        } else {
          // per_linear_ft — cannot auto-compute
          warnings.push(`${cat}: per_linear_ft basis requires manual footage entry for Unit ${unit?.unit_number ?? scope.unitId}.`);
          warn = true;
        }

        if (!warn) {
          lineItems.push({
            category: cat,
            subcategory: tItem.subcategory ?? undefined,
            description: tItem.description ?? `${cat.replace(/_/g, ' ')} — Unit ${unit?.unit_number ?? scope.unitId}`,
            unit_id: scope.unitId,
            budgeted_amount: amount,
            sqft_applicable: unitSqft,
            unit_count: 1,
            source: 'template',
            source_reference: templateId,
          });
        }
        continue;
      }

      // Fall back to benchmark
      const bench = benchmarkMap.get(cat);
      if (bench && useOrgBenchmarks) {
        const amount = bench.avg_cost
          ? (bench.unit_of_measure === 'sq_ft' ? bench.avg_cost * (unitSqft || 0) : bench.avg_cost)
          : 0;
        if (amount > 0) {
          lineItems.push({
            category: cat,
            description: `${cat.replace(/_/g, ' ')} — Unit ${unit?.unit_number ?? scope.unitId} (benchmark)`,
            unit_id: scope.unitId,
            budgeted_amount: amount,
            sqft_applicable: unitSqft,
            unit_count: 1,
            source: 'benchmark',
            source_reference: bench.id,
          });
          continue;
        }
      }

      warnings.push(`${cat} — Unit ${unit?.unit_number ?? scope.unitId}: no template item or benchmark available — manual entry required.`);
    }
  }

  // Process property-level scopes
  for (const scope of propertyLevelScopes) {
    const tItem = templateMap.get(scope.category);
    if (tItem) {
      let amount = 0;
      const sqft = scope.sqft ?? 0;
      if (tItem.unit_basis === 'per_sqft') {
        amount = tItem.unit_cost * sqft;
      } else if (tItem.unit_basis === 'per_unit' || tItem.unit_basis === 'flat') {
        amount = tItem.unit_cost;
      } else {
        warnings.push(`${scope.category}: per_linear_ft basis requires manual footage entry for property-level scope.`);
        continue;
      }

      lineItems.push({
        category: scope.category,
        description: scope.notes ?? `${scope.category.replace(/_/g, ' ')} — Property-wide`,
        budgeted_amount: amount,
        sqft_applicable: sqft,
        unit_count: 1,
        source: 'template',
        source_reference: templateId,
      });
      continue;
    }

    const bench = benchmarkMap.get(scope.category);
    if (bench && useOrgBenchmarks) {
      const sqft = scope.sqft ?? 0;
      const amount = bench.avg_cost
        ? (bench.unit_of_measure === 'sq_ft' ? bench.avg_cost * sqft : bench.avg_cost)
        : 0;
      if (amount > 0) {
        lineItems.push({
          category: scope.category,
          description: `${scope.category.replace(/_/g, ' ')} — Property-wide (benchmark)`,
          budgeted_amount: amount,
          sqft_applicable: sqft,
          unit_count: 1,
          source: 'benchmark',
          source_reference: bench.id,
        });
        continue;
      }
    }

    warnings.push(`${scope.category}: no template item or benchmark available — manual entry required.`);
  }

  const total_budgeted = lineItems.reduce((s, l) => s + l.budgeted_amount, 0);
  return { lineItems, total_budgeted, warnings };
}
