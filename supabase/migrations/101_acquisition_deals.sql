-- 101_acquisition_deals.sql
-- Deal pipeline for pre-purchase underwriting.
-- A deal is NOT a property; it becomes one only when promoted via closed_won action.

CREATE TABLE IF NOT EXISTS acquisition_deals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  deal_name TEXT NOT NULL,
  street_address TEXT,
  city TEXT,
  state TEXT,
  zip TEXT,
  property_type TEXT CHECK (property_type IN ('residential','commercial','mixed_use')),
  total_units INTEGER,
  total_sqft NUMERIC(12,2),
  asking_price NUMERIC(14,2),
  source TEXT CHECK (source IN ('broker_om','off_market','referral','public_listing','other')),
  source_contact_name TEXT,
  source_contact_email TEXT,
  source_contact_phone TEXT,
  status TEXT NOT NULL CHECK (status IN (
    'prospecting',
    'underwriting',
    'loi_submitted',
    'under_negotiation',
    'due_diligence',
    'closed_won',
    'closed_lost',
    'passed'
  )) DEFAULT 'prospecting',
  status_changed_at TIMESTAMPTZ DEFAULT NOW(),
  expected_close_date DATE,
  actual_close_date DATE,
  closed_lost_reason TEXT,
  promoted_to_property_id UUID REFERENCES properties(id),
  promoted_at TIMESTAMPTZ,
  promoted_by UUID REFERENCES users(id),
  notes TEXT,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_deals_org_status  ON acquisition_deals(org_id, status);
CREATE INDEX idx_deals_org_created ON acquisition_deals(org_id, created_at DESC);

ALTER TABLE acquisition_deals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org_isolation" ON acquisition_deals
  USING (org_id = (auth.jwt() ->> 'org_id')::UUID);
