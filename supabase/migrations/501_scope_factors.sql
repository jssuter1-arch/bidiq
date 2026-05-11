-- 501_scope_factors.sql
-- Org-configurable scope factors used to normalize contractor rates.
-- Each factor captures how unusual scope (floor leveling, MEP rough-in, structural)
-- inflates the apparent cost of a category, so comparisons are apples-to-apples.

CREATE TABLE IF NOT EXISTS scope_factors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  factor_key TEXT NOT NULL,
  display_name TEXT NOT NULL,
  applicable_categories TEXT[] DEFAULT '{}',
  adjustment_pct NUMERIC(5,4),   -- e.g., 0.15 = +15% cost increase when present
  notes TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(org_id, factor_key)
);

ALTER TABLE scope_factors ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org_isolation" ON scope_factors
  USING (org_id = (auth.jwt() ->> 'org_id')::UUID);
