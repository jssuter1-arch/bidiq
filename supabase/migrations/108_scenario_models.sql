-- 108_scenario_models.sql
-- What-if scenario models for deal or property decisions.
-- Computed return columns (NPV, IRR) are populated by Phase 4 calc service.

CREATE TABLE IF NOT EXISTS scenario_models (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  property_id UUID REFERENCES properties(id) ON DELETE CASCADE,
  deal_id UUID REFERENCES acquisition_deals(id) ON DELETE CASCADE,
  scenario_name TEXT NOT NULL,
  description TEXT,

  -- Scope
  units_affected INTEGER,
  scope_summary JSONB,

  -- Costs
  estimated_renovation_cost NUMERIC(14,2),
  triggered_constraint_costs NUMERIC(14,2) DEFAULT 0,
  total_capital_required NUMERIC(14,2),

  -- Income deltas
  pre_scenario_rent_monthly NUMERIC(14,2),
  post_scenario_rent_monthly NUMERIC(14,2),
  monthly_income_delta NUMERIC(14,2),
  annual_income_delta NUMERIC(14,2),

  -- Returns (populated by Phase 4 — NULL until then)
  cap_rate NUMERIC(5,4) DEFAULT 0.06,
  discount_rate NUMERIC(5,4) DEFAULT 0.10,
  hold_period_months INTEGER DEFAULT 36,
  value_created NUMERIC(14,2),
  npv NUMERIC(14,2),
  irr NUMERIC(8,4),
  payback_months NUMERIC(8,2),
  meets_hurdle BOOLEAN,

  -- Decision support
  triggered_constraints UUID[] DEFAULT '{}',
  is_baseline BOOLEAN DEFAULT FALSE,
  is_recommended BOOLEAN DEFAULT FALSE,
  notes TEXT,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CHECK (property_id IS NOT NULL OR deal_id IS NOT NULL)
);

CREATE INDEX idx_scenarios_property ON scenario_models(property_id)
  WHERE property_id IS NOT NULL;
CREATE INDEX idx_scenarios_deal ON scenario_models(deal_id)
  WHERE deal_id IS NOT NULL;

ALTER TABLE scenario_models ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org_isolation" ON scenario_models
  USING (org_id = (auth.jwt() ->> 'org_id')::UUID);
