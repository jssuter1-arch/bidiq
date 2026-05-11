-- Down: 200_backfill_underwriting_calculations
-- No-op migration — nothing to undo.
-- The backfill script cannot be undone automatically.
-- To revert: set computed columns to NULL in deal_underwriting_models.
SELECT 1;
