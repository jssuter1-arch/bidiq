ALTER TABLE contractors DROP CONSTRAINT IF EXISTS contractors_rate_type_check;
ALTER TABLE contractors ADD CONSTRAINT contractors_rate_type_check
  CHECK (rate_type IN ('hourly', 'daily', 'fixed', 'per_sqft', 'per_unit'));

UPDATE contractors SET rate_type = 'per_sqft' WHERE rate_type = 'sq_ft';
