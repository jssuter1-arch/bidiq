-- 601_cross_tenant_aggregates.sql
-- Stores pre-computed anonymized aggregates from the nightly aggregation job.
-- No RLS — contains only aggregate statistics, never identifiable org data.
-- Aggregates suppressed when sample_org_count < 5 (k-anonymity).

CREATE TABLE IF NOT EXISTS cross_tenant_aggregates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  metric_key TEXT NOT NULL,
  property_type TEXT,
  unit_type TEXT,
  city_bucket TEXT,
  sample_org_count INTEGER NOT NULL,
  sample_record_count INTEGER NOT NULL,
  value_p25 NUMERIC(14,2),
  value_p50 NUMERIC(14,2),
  value_p75 NUMERIC(14,2),
  value_mean NUMERIC(14,2),
  std_dev NUMERIC(14,2),
  computed_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(metric_key, property_type, unit_type, city_bucket)
);

CREATE INDEX idx_aggregates_metric ON cross_tenant_aggregates(metric_key, property_type, unit_type, city_bucket);
