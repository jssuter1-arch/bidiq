// budget-reconciliation.ts
// Nightly job: asserts projects.current_budget and projects.actual_spend match
// the is_current = TRUE row in project_budget_snapshots.
// On drift > $0.01, corrects flat columns back to snapshot values (snapshot is source of truth),
// logs to budget_reconciliation_log, and notifies org admin.
// lint-forbidden-writes: allowed — this is the designated auto-correction path

import { supabaseAdmin } from '../utils/supabase';

interface ProjectRow {
  id: string;
  org_id: string;
  name: string;
  current_budget: number | null;
  actual_spend: number | null;
}

interface SnapshotRow {
  project_id: string;
  budget_total: number;
  actual_spend_at_snapshot: number;
}

export async function runBudgetReconciliation(): Promise<{
  checked: number;
  drifted: number;
  corrected: number;
}> {
  // Prune clean-pass log rows older than 90 days to prevent unbounded table growth.
  const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();
  await supabaseAdmin
    .from('budget_reconciliation_log')
    .delete()
    .eq('drift_detected', false)
    .lt('ran_at', ninetyDaysAgo);

  // Fetch all projects
  const { data: projects, error: projErr } = await supabaseAdmin
    .from('projects')
    .select('id, org_id, name, current_budget, actual_spend');

  if (projErr) throw new Error(`Reconciliation: failed to fetch projects: ${projErr.message}`);
  if (!projects || projects.length === 0) return { checked: 0, drifted: 0, corrected: 0 };

  // Fetch all current snapshots in one query
  const projectIds = (projects as ProjectRow[]).map((p) => p.id);
  const { data: snapshots, error: snapErr } = await supabaseAdmin
    .from('project_budget_snapshots')
    .select('project_id, budget_total, actual_spend_at_snapshot')
    .in('project_id', projectIds)
    .eq('is_current', true);

  if (snapErr) throw new Error(`Reconciliation: failed to fetch snapshots: ${snapErr.message}`);

  const snapshotMap = new Map<string, SnapshotRow>();
  for (const s of (snapshots ?? []) as SnapshotRow[]) {
    snapshotMap.set(s.project_id, s);
  }

  let drifted = 0;
  let corrected = 0;
  const DRIFT_THRESHOLD = 0.01;

  for (const project of projects as ProjectRow[]) {
    const snapshot = snapshotMap.get(project.id);

    if (!snapshot) {
      // No current snapshot — log without correcting
      await supabaseAdmin.from('budget_reconciliation_log').insert({
        org_id: project.org_id,
        project_id: project.id,
        flat_current_budget: project.current_budget,
        snapshot_current_budget: null,
        flat_actual_spend: project.actual_spend,
        snapshot_actual_spend: null,
        drift_detected: true,
        drift_amount: null,
        auto_corrected: false,
        notes: 'No current snapshot found for project.',
      });
      drifted++;
      continue;
    }

    const budgetDrift = Math.abs((project.current_budget ?? 0) - snapshot.budget_total);
    const spendDrift = Math.abs((project.actual_spend ?? 0) - snapshot.actual_spend_at_snapshot);
    const totalDrift = budgetDrift + spendDrift;
    const hasDrift = totalDrift > DRIFT_THRESHOLD;

    if (hasDrift) {
      drifted++;

      // Auto-correct: snapshot is source of truth
      // lint-forbidden-writes: allowed — reconciliation job is the designated correction path
      const { error: fixErr } = await supabaseAdmin
        .from('projects')
        .update({
          current_budget: snapshot.budget_total,
          actual_spend: snapshot.actual_spend_at_snapshot,
          updated_at: new Date().toISOString(),
        })
        .eq('id', project.id);

      const wasFixed = !fixErr;
      if (wasFixed) corrected++;

      await supabaseAdmin.from('budget_reconciliation_log').insert({
        org_id: project.org_id,
        project_id: project.id,
        flat_current_budget: project.current_budget,
        snapshot_current_budget: snapshot.budget_total,
        flat_actual_spend: project.actual_spend,
        snapshot_actual_spend: snapshot.actual_spend_at_snapshot,
        drift_detected: true,
        drift_amount: totalDrift,
        auto_corrected: wasFixed,
        notes: wasFixed ? null : `Auto-correction failed: ${fixErr?.message}`,
      });

      // Notify the org admin
      const { data: adminUser } = await supabaseAdmin
        .from('users')
        .select('id')
        .eq('org_id', project.org_id)
        .eq('role', 'admin')
        .limit(1)
        .single();

      if (adminUser) {
        await supabaseAdmin.from('notifications').insert({
          org_id: project.org_id,
          user_id: adminUser.id,
          type: 'budget_overrun',
          title: 'Budget Reconciliation: Drift Detected',
          message: `Project "${project.name}" had a budget discrepancy of $${totalDrift.toFixed(2)}. ${wasFixed ? 'Auto-corrected to match snapshot.' : 'Auto-correction failed — please review.'}`,
          link: `/projects/${project.id}`,
          is_read: false,
        });
      }
    } else {
      // No drift — log a clean pass row for audit completeness
      await supabaseAdmin.from('budget_reconciliation_log').insert({
        org_id: project.org_id,
        project_id: project.id,
        flat_current_budget: project.current_budget,
        snapshot_current_budget: snapshot.budget_total,
        flat_actual_spend: project.actual_spend,
        snapshot_actual_spend: snapshot.actual_spend_at_snapshot,
        drift_detected: false,
        drift_amount: 0,
        auto_corrected: false,
        notes: null,
      });
    }
  }

  return { checked: projects.length, drifted, corrected };
}
