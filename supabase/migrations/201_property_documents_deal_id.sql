-- 201_property_documents_deal_id.sql
-- Extends property_documents to support deal-scoped documents.
-- deal_id is nullable; existing rows are unaffected (property_id stays as-is).
-- When a deal is promoted to a property, all documents are bulk-updated
-- to set property_id while preserving deal_id for historical reference.

ALTER TABLE property_documents
  ADD COLUMN IF NOT EXISTS deal_id UUID REFERENCES acquisition_deals(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_property_documents_deal
  ON property_documents(deal_id)
  WHERE deal_id IS NOT NULL;
