-- 112_equity_analysis_npv_extension.sql
-- Adds NPV-grade decision columns to equity_analyses without disturbing existing rows.
-- Existing rows retain NULL in these columns; Phase 4 UI populates them on new analyses.

ALTER TABLE equity_analyses
  ADD COLUMN IF NOT EXISTS discount_rate    NUMERIC(5,4),
  ADD COLUMN IF NOT EXISTS hurdle_rate      NUMERIC(5,4),
  ADD COLUMN IF NOT EXISTS npv              NUMERIC(14,2),
  ADD COLUMN IF NOT EXISTS irr              NUMERIC(8,4),
  ADD COLUMN IF NOT EXISTS hold_period_months INTEGER,
  ADD COLUMN IF NOT EXISTS meets_hurdle     BOOLEAN;
