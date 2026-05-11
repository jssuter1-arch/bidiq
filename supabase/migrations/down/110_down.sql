-- Down: 110_change_order_category
DROP INDEX IF EXISTS idx_invoices_change_order_category;
ALTER TABLE contractor_invoices DROP COLUMN IF EXISTS change_order_category;
