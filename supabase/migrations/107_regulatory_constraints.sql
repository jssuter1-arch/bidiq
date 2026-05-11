-- 107_regulatory_constraints.sql
-- Code and regulatory constraints as first-class inputs for scenario modeling.
-- A constraint must be attached to either a property or a deal (or both).

CREATE TABLE IF NOT EXISTS regulatory_constraints (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  property_id UUID REFERENCES properties(id) ON DELETE CASCADE,
  deal_id UUID REFERENCES acquisition_deals(id) ON DELETE CASCADE,
  constraint_type TEXT NOT NULL CHECK (constraint_type IN (
    'zoning_use',
    'unit_count_cap',
    'bedroom_count_cap',
    'fire_code_trigger',
    'historic_district',
    'parking_minimum',
    'height_limit',
    'setback',
    'other'
  )),
  description TEXT NOT NULL,
  trigger_threshold TEXT,
  triggered_cost_estimate NUMERIC(14,2),
  source TEXT,
  source_date DATE,
  is_active BOOLEAN DEFAULT TRUE,
  notes TEXT,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CHECK (property_id IS NOT NULL OR deal_id IS NOT NULL)
);

CREATE INDEX idx_constraints_property ON regulatory_constraints(property_id)
  WHERE property_id IS NOT NULL;
CREATE INDEX idx_constraints_deal ON regulatory_constraints(deal_id)
  WHERE deal_id IS NOT NULL;

ALTER TABLE regulatory_constraints ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org_isolation" ON regulatory_constraints
  USING (org_id = (auth.jwt() ->> 'org_id')::UUID);
