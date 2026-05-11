-- 103_project_budget_snapshots.sql
-- Canonical record of every budget state at every meaningful checkpoint.
-- projects.current_budget and projects.actual_spend become a denormalized cache;
-- the trigger in 104 keeps them in sync with the is_current = TRUE snapshot.

CREATE TABLE IF NOT EXISTS project_budget_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  org_id UUID NOT NULL REFERENCES organizations(id),
  snapshot_type TEXT NOT NULL CHECK (snapshot_type IN (
    'underwriting',
    'bank_declared',
    'project_created',
    'break_ground',
    'revision',
    'completion',
    'manual'
  )),
  is_current BOOLEAN NOT NULL DEFAULT FALSE,
  effective_date DATE NOT NULL DEFAULT CURRENT_DATE,
  budget_total NUMERIC(14,2) NOT NULL,
  actual_spend_at_snapshot NUMERIC(14,2) NOT NULL DEFAULT 0,
  change_order_total_at_snapshot NUMERIC(14,2) NOT NULL DEFAULT 0,
  line_items_snapshot JSONB,
  triggered_by_event TEXT,
  triggered_by_user UUID REFERENCES users(id),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- At most one current snapshot per project at any time.
-- The service layer demotes the previous current before inserting the new one.
CREATE UNIQUE INDEX one_current_snapshot_per_project
  ON project_budget_snapshots(project_id)
  WHERE is_current = TRUE;

CREATE INDEX idx_snapshots_project_type_date
  ON project_budget_snapshots(project_id, snapshot_type, effective_date DESC);

ALTER TABLE project_budget_snapshots ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org_isolation" ON project_budget_snapshots
  USING (org_id = (auth.jwt() ->> 'org_id')::UUID);
