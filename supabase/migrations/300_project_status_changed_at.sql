-- Migration 300: Add status_changed_at to projects
-- Records when project status last changed; required by Phase 3 break_ground / completion snapshot hooks.

ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS status_changed_at TIMESTAMPTZ;

-- Backfill: treat current updated_at as the last status change time for existing rows.
UPDATE projects
SET status_changed_at = updated_at
WHERE status_changed_at IS NULL;
