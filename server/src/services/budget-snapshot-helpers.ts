import { supabaseAdmin } from '../utils/supabase';

/**
 * Sum of all approved/paid change-order invoices for a project.
 * Used to populate change_order_total_at_snapshot.
 */
export async function computeChangeOrderTotal(projectId: string): Promise<number> {
  const { data, error } = await supabaseAdmin
    .from('contractor_invoices')
    .select('total_amount')
    .eq('project_id', projectId)
    .eq('is_change_order', true)
    .in('status', ['approved', 'paid']);

  if (error) throw new Error(`computeChangeOrderTotal: ${error.message}`);
  return (data ?? []).reduce((sum, row) => sum + (row.total_amount ?? 0), 0);
}

/**
 * Snapshot of all budget_line_items for a project at a point in time.
 * Stored as JSON in project_budget_snapshots.line_items_snapshot.
 */
export async function captureLineItemsSnapshot(projectId: string): Promise<unknown> {
  const { data, error } = await supabaseAdmin
    .from('budget_line_items')
    .select('id, category, description, budgeted_amount, actual_amount, status')
    .eq('project_id', projectId)
    .order('category');

  if (error) throw new Error(`captureLineItemsSnapshot: ${error.message}`);
  return data ?? [];
}
