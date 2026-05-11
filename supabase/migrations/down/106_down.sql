-- Down: 106_backfill_budget_snapshots
-- Removes only the backfill-generated snapshots (identified by triggered_by_event).
-- Does not remove snapshots created by normal application operation.
DELETE FROM project_budget_snapshots
WHERE triggered_by_event = 'phase_1_backfill';
