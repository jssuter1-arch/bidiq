-- 110_change_order_category.sql
-- Adds structured change_order_category alongside the existing free-text
-- change_order_reason column. Existing rows get NULL; Phase 5 UI prompts for it.

ALTER TABLE contractor_invoices
  ADD COLUMN IF NOT EXISTS change_order_category TEXT
    CHECK (change_order_category IN (
      'scope_addition',
      'missed_at_walkthrough',
      'code_requirement',
      'contractor_error',
      'hidden_condition',
      'client_request',
      'material_price_change',
      'other'
    ));

CREATE INDEX IF NOT EXISTS idx_invoices_change_order_category
  ON contractor_invoices(change_order_category)
  WHERE is_change_order = TRUE;
