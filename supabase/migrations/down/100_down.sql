-- Down: 100_organization_module_access
DROP TRIGGER IF EXISTS trg_default_module_access ON organizations;
DROP FUNCTION IF EXISTS insert_default_module_access();
DROP FUNCTION IF EXISTS user_has_module_access(UUID, TEXT);
DROP TABLE IF EXISTS organization_module_access;
