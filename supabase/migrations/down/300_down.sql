-- Down migration 300: Remove status_changed_at from projects
ALTER TABLE projects
  DROP COLUMN IF EXISTS status_changed_at;
