-- 200_backfill_underwriting_calculations.sql
-- Records that the Phase 2 underwriting backfill has been applied.
-- The actual backfill is performed by the Node script:
--   node server/src/scripts/backfill-underwriting.js (compiled from .ts)
-- Run as part of Phase 2 deployment before any UI goes live.
-- This migration is intentionally a no-op on the SQL side.
DO $$ BEGIN
  RAISE NOTICE 'Phase 2 underwriting backfill must be run via: npx tsx server/src/scripts/backfill-underwriting.ts';
END $$;
