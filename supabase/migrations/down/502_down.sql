ALTER TABLE budget_line_items DROP COLUMN IF EXISTS scope_factors;
DROP INDEX IF EXISTS idx_line_items_scope_factors;
