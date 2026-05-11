-- 502_budget_line_item_scope_factors.sql
-- Adds scope_factors UUID array to budget_line_items.
-- When users create or edit a line item, they can tag which scope factors were present,
-- giving the normalization service the data it needs to adjust contractor rates.

ALTER TABLE budget_line_items
  ADD COLUMN IF NOT EXISTS scope_factors UUID[] DEFAULT '{}';

CREATE INDEX IF NOT EXISTS idx_line_items_scope_factors
  ON budget_line_items USING GIN (scope_factors);
