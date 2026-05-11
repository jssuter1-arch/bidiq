-- 602_decision_hub_cache.sql
-- Per-org per-user cache of decision hub triage items (15-minute TTL).

CREATE TABLE IF NOT EXISTS decision_hub_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id),
  computed_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  items JSONB NOT NULL,
  UNIQUE(org_id, user_id)
);

ALTER TABLE decision_hub_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org_isolation" ON decision_hub_cache
  USING (org_id = (auth.jwt() ->> 'org_id')::UUID);

CREATE INDEX idx_decision_hub_expires ON decision_hub_cache(expires_at);
