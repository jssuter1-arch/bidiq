-- 104_snapshot_sync_trigger.sql
-- Trigger: when a snapshot becomes current, sync projects flat budget columns.
-- The service layer must demote any existing current snapshot BEFORE inserting the new one
-- to avoid violating the one_current_snapshot_per_project unique index.

CREATE OR REPLACE FUNCTION sync_project_flat_budget_columns()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_current = TRUE THEN
    -- Demote any other current snapshot for this project (defensive; service should pre-demote)
    UPDATE project_budget_snapshots
       SET is_current = FALSE
     WHERE project_id = NEW.project_id
       AND id != NEW.id
       AND is_current = TRUE;

    -- Sync flat columns on projects
    -- lint-forbidden-writes: allowed in trigger function
    UPDATE projects
       SET current_budget = NEW.budget_total,
           actual_spend   = NEW.actual_spend_at_snapshot,
           updated_at     = NOW()
     WHERE id = NEW.project_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sync_flat_budget ON project_budget_snapshots;
CREATE TRIGGER trg_sync_flat_budget
AFTER INSERT OR UPDATE OF is_current
ON project_budget_snapshots
FOR EACH ROW
EXECUTE FUNCTION sync_project_flat_budget_columns();
