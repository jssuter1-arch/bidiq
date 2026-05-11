import { Router } from 'express';
import { z } from 'zod';
import { authenticateUser, loadOrgContext, requireRole, validateBody } from '../middleware';
import { supabaseAdmin } from '../utils/supabase';
import { AuthenticatedRequest } from '../middleware/authenticateUser';

const router = Router();
const auth = [authenticateUser, loadOrgContext];

const MODULE_KEYS = [
  'deal_intelligence',
  'budget_lifecycle',
  'scenario_modeling',
  'cost_intelligence_extended',
  'portfolio_intelligence',
] as const;

const PatchModuleSchema = z.object({
  enabled: z.boolean().optional(),
  allowed_roles: z.array(z.enum(['admin', 'project_manager', 'analyst', 'viewer'])).optional(),
});

// GET /api/v1/settings/module-access
// Returns this org's module access configuration.
router.get('/module-access', ...auth, async (req: AuthenticatedRequest, res, next) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('organization_module_access')
      .select('*')
      .eq('org_id', req.orgId!)
      .order('module_key');

    if (error) return res.status(400).json({ error: error.message });
    res.json({ data });
  } catch (err) { next(err); }
});

// PATCH /api/v1/settings/module-access/:module_key
// Admin-only. Updates enabled and/or allowed_roles for one module.
router.patch(
  '/module-access/:module_key',
  ...auth,
  requireRole('admin'),
  validateBody(PatchModuleSchema),
  async (req: AuthenticatedRequest, res, next) => {
    try {
      const { module_key } = req.params;
      if (!MODULE_KEYS.includes(module_key as typeof MODULE_KEYS[number])) {
        return res.status(400).json({ error: `Unknown module_key: ${module_key}` });
      }

      const patch: Record<string, unknown> = { updated_at: new Date().toISOString(), configured_by: req.userId };
      if (req.body.enabled !== undefined) patch.enabled = req.body.enabled;
      if (req.body.allowed_roles !== undefined) patch.allowed_roles = req.body.allowed_roles;

      const { data, error } = await supabaseAdmin
        .from('organization_module_access')
        .update(patch)
        .eq('org_id', req.orgId!)
        .eq('module_key', module_key)
        .select()
        .single();

      if (error) return res.status(400).json({ error: error.message });
      if (!data) return res.status(404).json({ error: 'Module access record not found' });
      res.json({ data });
    } catch (err) { next(err); }
  },
);

export default router;
