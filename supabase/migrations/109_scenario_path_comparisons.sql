-- 109_scenario_path_comparisons.sql
-- Groups multiple scenario_models as alternative paths for a single decision.
-- selected_scenario_id records which path was chosen and when.

CREATE TABLE IF NOT EXISTS scenario_path_comparisons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  comparison_name TEXT NOT NULL,
  property_id UUID REFERENCES properties(id) ON DELETE CASCADE,
  deal_id UUID REFERENCES acquisition_deals(id) ON DELETE CASCADE,
  scenario_ids UUID[] NOT NULL,
  selected_scenario_id UUID REFERENCES scenario_models(id),
  decision_made_at TIMESTAMPTZ,
  decision_made_by UUID REFERENCES users(id),
  decision_notes TEXT,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CHECK (property_id IS NOT NULL OR deal_id IS NOT NULL)
);

ALTER TABLE scenario_path_comparisons ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org_isolation" ON scenario_path_comparisons
  USING (org_id = (auth.jwt() ->> 'org_id')::UUID);
