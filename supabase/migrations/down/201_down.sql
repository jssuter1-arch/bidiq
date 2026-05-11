-- Down: 201_property_documents_deal_id
DROP INDEX IF EXISTS idx_property_documents_deal;
ALTER TABLE property_documents DROP COLUMN IF EXISTS deal_id;
