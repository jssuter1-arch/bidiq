-- 102_deal_underwriting_models.sql
-- Versioned underwriting models per deal. Exactly one version per deal is is_active_version = TRUE.
-- Computed output columns (IRR, NPV, etc.) are populated by Phase 2 calculation service.

CREATE TABLE IF NOT EXISTS deal_underwriting_models (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id UUID NOT NULL REFERENCES acquisition_deals(id) ON DELETE CASCADE,
  org_id UUID NOT NULL REFERENCES organizations(id),
  version INTEGER NOT NULL,
  model_name TEXT,
  is_active_version BOOLEAN NOT NULL DEFAULT FALSE,

  -- Capital Stack
  proposed_purchase_price NUMERIC(14,2) NOT NULL,
  down_payment_pct NUMERIC(5,4) NOT NULL,
  senior_debt_amount NUMERIC(14,2),
  senior_debt_rate NUMERIC(6,4),
  senior_debt_term_months INTEGER,
  senior_debt_amortization_months INTEGER,
  has_construction_loan BOOLEAN DEFAULT FALSE,
  construction_loan_amount NUMERIC(14,2),
  construction_loan_rate NUMERIC(6,4),
  construction_loan_term_months INTEGER,
  estimated_renovation_cost NUMERIC(14,2),
  estimated_closing_costs NUMERIC(14,2),
  estimated_carry_costs NUMERIC(14,2),

  -- Income & Operations
  current_rent_roll_monthly NUMERIC(14,2),
  projected_post_reno_rent_monthly NUMERIC(14,2),
  current_other_income_monthly NUMERIC(14,2),
  projected_other_income_monthly NUMERIC(14,2),
  current_operating_expenses_monthly NUMERIC(14,2),
  projected_operating_expenses_monthly NUMERIC(14,2),
  vacancy_factor_pct NUMERIC(5,4) DEFAULT 0.05,

  -- Exit & Hurdle
  exit_cap_rate NUMERIC(5,4) DEFAULT 0.06,
  hold_period_months INTEGER DEFAULT 36,
  hurdle_rate NUMERIC(5,4) DEFAULT 0.15,
  discount_rate NUMERIC(5,4) DEFAULT 0.10,

  -- Computed Outputs (cached; populated by Phase 2 calc service — NULL until then)
  total_capital_required NUMERIC(14,2),
  projected_noi_year_1 NUMERIC(14,2),
  projected_noi_stabilized NUMERIC(14,2),
  projected_exit_value NUMERIC(14,2),
  projected_equity_at_exit NUMERIC(14,2),
  equity_multiple NUMERIC(8,4),
  irr NUMERIC(8,4),
  npv NUMERIC(14,2),
  cash_on_cash_year_1 NUMERIC(8,4),
  recommended_max_bid NUMERIC(14,2),
  meets_hurdle BOOLEAN,

  notes TEXT,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(deal_id, version)
);

-- Exactly one active version per deal
CREATE UNIQUE INDEX one_active_underwriting_per_deal
  ON deal_underwriting_models(deal_id)
  WHERE is_active_version = TRUE;

CREATE INDEX idx_underwriting_deal ON deal_underwriting_models(deal_id, version DESC);

ALTER TABLE deal_underwriting_models ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org_isolation" ON deal_underwriting_models
  USING (org_id = (auth.jwt() ->> 'org_id')::UUID);
