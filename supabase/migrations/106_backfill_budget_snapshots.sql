-- 106_backfill_budget_snapshots.sql
-- One-time backfill: creates a project_created snapshot for every existing project
-- that does not yet have a current snapshot.
-- After this runs, the reconciliation job should report zero drift on its first pass.
-- lint-forbidden-writes: migration file — allowed

INSERT INTO project_budget_snapshots (
  project_id,
  org_id,
  snapshot_type,
  is_current,
  effective_date,
  budget_total,
  actual_spend_at_snapshot,
  change_order_total_at_snapshot,
  triggered_by_event,
  notes
)
SELECT
  p.id,
  p.org_id,
  'project_created',
  TRUE,
  COALESCE(p.start_date, p.created_at::DATE),
  COALESCE(p.current_budget, p.initial_budget, 0),
  COALESCE(p.actual_spend, 0),
  0,
  'phase_1_backfill',
  'Auto-generated snapshot during Phase 1 schema migration. Represents the budget state at the time of the foundation upgrade.'
FROM projects p
WHERE NOT EXISTS (
  SELECT 1 FROM project_budget_snapshots s
   WHERE s.project_id = p.id AND s.is_current = TRUE
);
