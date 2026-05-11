-- Down: 104_snapshot_sync_trigger
DROP TRIGGER IF EXISTS trg_sync_flat_budget ON project_budget_snapshots;
DROP FUNCTION IF EXISTS sync_project_flat_budget_columns();
