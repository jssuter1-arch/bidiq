-- 600_cross_tenant_participation.sql
-- Tracks each org's opt-in/opt-out state for cross-tenant benchmark aggregation.
-- Default: all existing orgs opt in on deployment.

CREATE TABLE IF NOT EXISTS cross_tenant_participation (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  is_participating BOOLEAN NOT NULL DEFAULT TRUE,
  consent_version TEXT NOT NULL DEFAULT 'v1',
  toggled_by UUID REFERENCES users(id),
  toggled_at TIMESTAMPTZ DEFAULT NOW(),
  prior_state BOOLEAN,
  reason_for_change TEXT,
  UNIQUE(org_id)
);

ALTER TABLE cross_tenant_participation ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org_isolation" ON cross_tenant_participation
  USING (org_id = (auth.jwt() ->> 'org_id')::UUID);

-- Default opt-in for every existing org
INSERT INTO cross_tenant_participation (org_id, is_participating, consent_version, reason_for_change)
SELECT id, TRUE, 'v1', 'Default opt-in at Phase 6 deployment'
FROM organizations
WHERE NOT EXISTS (
  SELECT 1 FROM cross_tenant_participation cp WHERE cp.org_id = organizations.id
);
