-- 400_scenario_recalc_queue.sql
-- Queue table for async scenario recalculation triggered by constraint changes.
-- Processed by the scenario-recalc-job cron every 5 minutes.

CREATE TABLE IF NOT EXISTS scenario_recalc_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  scenario_id UUID NOT NULL REFERENCES scenario_models(id) ON DELETE CASCADE,
  triggered_by_constraint_id UUID REFERENCES regulatory_constraints(id),
  queued_at TIMESTAMPTZ DEFAULT NOW(),
  processed_at TIMESTAMPTZ,
  status TEXT CHECK (status IN ('pending', 'processing', 'complete', 'failed')) DEFAULT 'pending',
  error_message TEXT,
  UNIQUE (scenario_id, triggered_by_constraint_id, status)
    DEFERRABLE INITIALLY DEFERRED
);

CREATE INDEX idx_recalc_queue_pending ON scenario_recalc_queue(status, queued_at)
  WHERE status = 'pending';

ALTER TABLE scenario_recalc_queue ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org_isolation" ON scenario_recalc_queue
  USING (org_id = (auth.jwt() ->> 'org_id')::UUID);
