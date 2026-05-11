// scenario-recalc-job.ts
// Processes pending scenario recalculation rows from scenario_recalc_queue.
// Triggered every 5 minutes by Vercel Cron at /api/v1/jobs/scenario-recalc.

import { supabaseAdmin } from '../utils/supabase';
import { computeScenario } from '../services/scenario-calc-service';

const BATCH_SIZE = 100;

export async function runScenarioRecalc(): Promise<{ processed: number; failed: number }> {
  const { data: pending, error: fetchErr } = await supabaseAdmin
    .from('scenario_recalc_queue')
    .select('id, scenario_id, org_id')
    .eq('status', 'pending')
    .order('queued_at', { ascending: true })
    .limit(BATCH_SIZE);

  if (fetchErr) {
    console.error('[scenario-recalc] Failed to fetch queue:', fetchErr.message);
    return { processed: 0, failed: 0 };
  }

  const rows = pending ?? [];
  if (rows.length === 0) return { processed: 0, failed: 0 };

  // Mark as processing
  const ids = rows.map((r) => r.id);
  await supabaseAdmin
    .from('scenario_recalc_queue')
    .update({ status: 'processing' })
    .in('id', ids);

  let processed = 0;
  let failed = 0;

  for (const row of rows) {
    try {
      const { data: scenario } = await supabaseAdmin
        .from('scenario_models')
        .select('*')
        .eq('id', row.scenario_id)
        .eq('org_id', row.org_id)
        .single();

      if (!scenario) {
        await supabaseAdmin
          .from('scenario_recalc_queue')
          .update({ status: 'failed', error_message: 'Scenario not found', processed_at: new Date().toISOString() })
          .eq('id', row.id);
        failed++;
        continue;
      }

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

      await supabaseAdmin
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
        .eq('id', row.scenario_id);

      await supabaseAdmin
        .from('scenario_recalc_queue')
        .update({ status: 'complete', processed_at: new Date().toISOString() })
        .eq('id', row.id);

      processed++;
    } catch (err: any) {
      await supabaseAdmin
        .from('scenario_recalc_queue')
        .update({
          status: 'failed',
          error_message: err?.message ?? 'Unknown error',
          processed_at: new Date().toISOString(),
        })
        .eq('id', row.id);
      failed++;
      console.error(`[scenario-recalc] Failed to recalc scenario ${row.scenario_id}:`, err);
    }
  }

  return { processed, failed };
}
