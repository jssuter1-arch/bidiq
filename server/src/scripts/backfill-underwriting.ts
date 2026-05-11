// backfill-underwriting.ts
// Run once during Phase 2 deployment to populate computed columns on
// deal_underwriting_models that were seeded with NULL outputs in Phase 1.
//
// Usage: npx tsx server/src/scripts/backfill-underwriting.ts
//
// Requires SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY env vars.

import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import { computeUnderwriting } from '../services/underwriting-calc-service';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

async function run() {
  const { data: models, error } = await supabase
    .from('deal_underwriting_models')
    .select('*')
    .is('irr', null); // only rows with no computed values

  if (error) throw new Error(`Failed to fetch models: ${error.message}`);
  if (!models || models.length === 0) {
    console.log('No underwriting models need backfill.');
    return;
  }

  console.log(`Backfilling ${models.length} underwriting model(s)...`);

  let updated = 0;
  let failed = 0;

  for (const model of models) {
    try {
      const results = computeUnderwriting(model);
      const { error: updateError } = await supabase
        .from('deal_underwriting_models')
        .update({
          total_capital_required: results.total_capital_required,
          projected_noi_year_1: results.projected_noi_year_1,
          projected_noi_stabilized: results.projected_noi_stabilized,
          projected_exit_value: results.projected_exit_value,
          projected_equity_at_exit: results.projected_equity_at_exit,
          equity_multiple: results.equity_multiple,
          irr: results.irr,
          npv: results.npv,
          cash_on_cash_year_1: results.cash_on_cash_year_1,
          recommended_max_bid: results.recommended_max_bid,
          meets_hurdle: results.meets_hurdle,
        })
        .eq('id', model.id);

      if (updateError) throw new Error(updateError.message);
      console.log(`  ✓ Model ${model.id} (v${model.version}): IRR=${results.irr !== null ? (results.irr * 100).toFixed(1) : 'N/A'}%`);
      updated++;
    } catch (err: any) {
      console.error(`  ✗ Model ${model.id}: ${err.message}`);
      failed++;
    }
  }

  console.log(`\nBackfill complete: ${updated} updated, ${failed} failed.`);
  if (failed > 0) process.exit(1);
}

run().catch((err) => {
  console.error('Backfill script error:', err.message);
  process.exit(1);
});
