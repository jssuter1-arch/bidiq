-- 105_budget_reconciliation_log.sql
-- Audit log for the nightly reconciliation job.
-- Records any drift detected between projects flat columns and the current snapshot.

CREATE TABLE IF NOT EXISTS budget_reconciliation_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id),
  project_id UUID NOT NULL REFERENCES projects(id),
  ran_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  flat_current_budget NUMERIC(14,2),
  snapshot_current_budget NUMERIC(14,2),
  flat_actual_spend NUMERIC(14,2),
  snapshot_actual_spend NUMERIC(14,2),
  drift_detected BOOLEAN NOT NULL,
  drift_amount NUMERIC(14,2),
  auto_corrected BOOLEAN DEFAULT FALSE,
  notes TEXT
);

CREATE INDEX idx_reconciliation_drift
  ON budget_reconciliation_log(org_id, drift_detected, ran_at DESC);

ALTER TABLE budget_reconciliation_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org_isolation" ON budget_reconciliation_log
  USING (org_id = (auth.jwt() ->> 'org_id')::UUID);
