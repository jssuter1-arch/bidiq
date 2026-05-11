// backfill-scenarios.ts
// One-time script: runs the scenario calc service for every scenario_models row
// and writes computed columns back to the database.
// Run: npx tsx src/scripts/backfill-scenarios.ts

import { supabaseAdmin } from '../utils/supabase';
import { computeScenario } from '../services/scenario-calc-service';

async function backfillScenarios() {
  const { data: scenarios, error: listErr } = await supabaseAdmin
    .from('scenario_models')
    .select('*');

  if (listErr) {
    console.error('Failed to list scenarios:', listErr.message);
    process.exit(1);
  }

  const rows = scenarios ?? [];
  console.log(`Backfilling ${rows.length} scenario(s)…`);

  for (const scenario of rows) {
    try {
      // Fetch active constraints for this scenario
      const constraintIds: string[] = scenario.triggered_constraints ?? [];
      let activeConstraints: { id: string; triggered_cost_estimate: number | null; is_active: boolean }[] = [];

      if (constraintIds.length > 0) {
        const { data: cs } = await supabaseAdmin
          .from('regulatory_constraints')
          .select('id, triggered_cost_estimate, is_active')
          .in('id', constraintIds);
        activeConstraints = cs ?? [];
      }

      const results = computeScenario({
        estimated_renovation_cost: Number(scenario.estimated_renovation_cost ?? 0),
        pre_scenario_rent_monthly: Number(scenario.pre_scenario_rent_monthly ?? 0),
        post_scenario_rent_monthly: Number(scenario.post_scenario_rent_monthly ?? 0),
        cap_rate: Number(scenario.cap_rate ?? 0.06),
        discount_rate: Number(scenario.discount_rate ?? 0.10),
        hold_period_months: Number(scenario.hold_period_months ?? 36),
        triggered_constraints: constraintIds,
        active_constraints: activeConstraints,
      });

      const { error: updateErr } = await supabaseAdmin
        .from('scenario_models')
        .update({
          triggered_constraint_costs: results.triggered_constraint_costs,
          total_capital_required: results.total_capital_required,
          monthly_income_delta: results.monthly_income_delta,
          annual_income_delta: results.annual_income_delta,
          value_created: results.value_created,
          npv: results.npv,
          irr: results.irr,
          payback_months: results.payback_months,
          meets_hurdle: results.meets_hurdle,
          updated_at: new Date().toISOString(),
        })
        .eq('id', scenario.id);

      if (updateErr) {
        console.error(`  ✗ [${scenario.id}] ${scenario.scenario_name}: ${updateErr.message}`);
      } else {
        console.log(`  ✓ [${scenario.id}] ${scenario.scenario_name}: NPV=${results.npv.toFixed(0)} IRR=${results.irr !== null ? (results.irr * 100).toFixed(1) + '%' : 'n/a'}`);
      }
    } catch (err) {
      console.error(`  ✗ [${scenario.id}] ${scenario.scenario_name}:`, err);
    }
  }

  console.log('Backfill complete.');
}

backfillScenarios();
