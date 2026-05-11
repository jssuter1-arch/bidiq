// budget-snapshot-service.ts
// Single write path for all project budget mutations.
// NO other code path may write directly to projects.current_budget or projects.actual_spend.
// See: scripts/lint-forbidden-writes.js

import { supabaseAdmin } from '../utils/supabase';

export interface RecordSnapshotInput {
  projectId: string;
  orgId: string;
  snapshotType:
    | 'underwriting'
    | 'bank_declared'
    | 'project_created'
    | 'break_ground'
    | 'revision'
    | 'completion'
    | 'manual';
  budgetTotal: number;
  actualSpendAtSnapshot: number;
  changeOrderTotalAtSnapshot: number;
  effectiveDate?: string; // ISO date; defaults to today
  lineItemsSnapshot?: unknown;
  triggeredByEvent?: string;
  triggeredByUser?: string;
  notes?: string;
  markCurrent: boolean;
}

export async function recordBudgetSnapshot(
  input: RecordSnapshotInput,
): Promise<{ snapshotId: string }> {
  // If this snapshot becomes current, demote any existing current snapshot first.
  // This must happen BEFORE the INSERT to avoid violating the
  // one_current_snapshot_per_project unique partial index.
  if (input.markCurrent) {
    const { error: demoteError } = await supabaseAdmin
      .from('project_budget_snapshots')
      .update({ is_current: false })
      .eq('project_id', input.projectId)
      .eq('is_current', true);

    if (demoteError) {
      throw new Error(`Failed to demote current snapshot: ${demoteError.message}`);
    }
  }

  const { data, error } = await supabaseAdmin
    .from('project_budget_snapshots')
    .insert({
      project_id: input.projectId,
      org_id: input.orgId,
      snapshot_type: input.snapshotType,
      is_current: input.markCurrent,
      effective_date: input.effectiveDate ?? new Date().toISOString().slice(0, 10),
      budget_total: input.budgetTotal,
      actual_spend_at_snapshot: input.actualSpendAtSnapshot,
      change_order_total_at_snapshot: input.changeOrderTotalAtSnapshot,
      line_items_snapshot: input.lineItemsSnapshot ?? null,
      triggered_by_event: input.triggeredByEvent ?? null,
      triggered_by_user: input.triggeredByUser ?? null,
      notes: input.notes ?? null,
    })
    .select('id')
    .single();

  if (error) {
    throw new Error(`Failed to record budget snapshot: ${error.message}`);
  }

  return { snapshotId: data.id };
}
