-- 500_pricing_template_uses.sql
-- Tracks which projects and scenarios applied a pricing template.
-- Powers the "Last Used" column on the template library page.

CREATE TABLE IF NOT EXISTS pricing_template_uses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  template_id UUID NOT NULL REFERENCES pricing_templates(id) ON DELETE CASCADE,
  used_in_project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
  used_in_scenario_id UUID REFERENCES scenario_models(id) ON DELETE SET NULL,
  used_by UUID REFERENCES users(id),
  used_at TIMESTAMPTZ DEFAULT NOW(),
  CHECK (used_in_project_id IS NOT NULL OR used_in_scenario_id IS NOT NULL)
);

CREATE INDEX idx_template_uses_template ON pricing_template_uses(template_id, used_at DESC);

ALTER TABLE pricing_template_uses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org_isolation" ON pricing_template_uses
  USING (org_id = (auth.jwt() ->> 'org_id')::UUID);
