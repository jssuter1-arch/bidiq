-- 100_organization_module_access.sql
-- Per-org module access configuration for Phase 1+ modules.
-- Also inserts default rows when a new organization is created (via trigger).

CREATE TABLE IF NOT EXISTS organization_module_access (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  module_key TEXT NOT NULL CHECK (module_key IN (
    'deal_intelligence',
    'budget_lifecycle',
    'scenario_modeling',
    'cost_intelligence_extended',
    'portfolio_intelligence'
  )),
  enabled BOOLEAN NOT NULL DEFAULT TRUE,
  allowed_roles TEXT[] NOT NULL DEFAULT ARRAY['admin'],
  configured_by UUID REFERENCES users(id),
  configured_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(org_id, module_key)
);

ALTER TABLE organization_module_access ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org_isolation" ON organization_module_access
  USING (org_id = (auth.jwt() ->> 'org_id')::UUID);

CREATE INDEX idx_module_access_org ON organization_module_access(org_id);

-- Auto-insert default module access rows for every new organization.
CREATE OR REPLACE FUNCTION insert_default_module_access()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO organization_module_access (org_id, module_key, enabled, allowed_roles)
  VALUES
    (NEW.id, 'deal_intelligence',           TRUE, ARRAY['admin']),
    (NEW.id, 'budget_lifecycle',            TRUE, ARRAY['admin']),
    (NEW.id, 'scenario_modeling',           TRUE, ARRAY['admin']),
    (NEW.id, 'cost_intelligence_extended',  TRUE, ARRAY['admin']),
    (NEW.id, 'portfolio_intelligence',      TRUE, ARRAY['admin'])
  ON CONFLICT (org_id, module_key) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_default_module_access ON organizations;
CREATE TRIGGER trg_default_module_access
AFTER INSERT ON organizations
FOR EACH ROW EXECUTE FUNCTION insert_default_module_access();

-- Helper function for downstream phases to gate feature access.
CREATE OR REPLACE FUNCTION user_has_module_access(p_user_id UUID, p_module_key TEXT)
RETURNS BOOLEAN AS $$
DECLARE
  user_org  UUID;
  user_role TEXT;
  module_enabled BOOLEAN;
  module_roles   TEXT[];
BEGIN
  SELECT org_id, role INTO user_org, user_role FROM users WHERE id = p_user_id;
  IF user_org IS NULL THEN RETURN FALSE; END IF;

  SELECT enabled, allowed_roles INTO module_enabled, module_roles
  FROM organization_module_access
  WHERE org_id = user_org AND module_key = p_module_key;

  IF module_enabled IS NULL OR module_enabled = FALSE THEN RETURN FALSE; END IF;
  RETURN user_role = ANY(module_roles);
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;
