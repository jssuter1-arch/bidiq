-- Down: 112_equity_analysis_npv_extension
ALTER TABLE equity_analyses
  DROP COLUMN IF EXISTS meets_hurdle,
  DROP COLUMN IF EXISTS hold_period_months,
  DROP COLUMN IF EXISTS irr,
  DROP COLUMN IF EXISTS npv,
  DROP COLUMN IF EXISTS hurdle_rate,
  DROP COLUMN IF EXISTS discount_rate;
