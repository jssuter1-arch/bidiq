import { Router, Response, NextFunction } from 'express';
import { z } from 'zod';
import { authenticateUser, loadOrgContext, requireModuleAccess, requireRole, validateBody, auditLog } from '../middleware';
import { supabaseAdmin } from '../utils/supabase';
import { AuthenticatedRequest } from '../middleware/authenticateUser';

const router = Router();
const auth = [authenticateUser, loadOrgContext, requireModuleAccess('portfolio_intelligence')];
const adminAuth = [...auth, requireRole('admin')];

// GET /api/v1/cross-tenant-participation
router.get('/', auth, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('cross_tenant_participation')
      .select('id, is_participating, consent_version, toggled_at, reason_for_change, prior_state')
      .eq('org_id', req.orgId!)
      .maybeSingle();

    if (error) return res.status(400).json({ error: error.message });

    // History from audit log with performer name
    const { data: history } = await supabaseAdmin
      .from('audit_log')
      .select('performed_by, created_at, new_values, old_values, users(full_name)')
      .eq('org_id', req.orgId!)
      .eq('table_name', 'cross_tenant_participation')
      .order('created_at', { ascending: false })
      .limit(20);

    res.json({ data: { participation: data, history: history || [] } });
  } catch (err) { next(err); }
});

const ToggleSchema = z.object({
  isParticipating: z.boolean(),
  reason: z.string().optional(),
});

// PATCH /api/v1/cross-tenant-participation — toggle participation
router.patch(
  '/',
  [...adminAuth, validateBody(ToggleSchema), auditLog('update', 'cross_tenant_participation')],
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { isParticipating, reason } = req.body as z.infer<typeof ToggleSchema>;

      // Get current state for prior_state audit
      const { data: current } = await supabaseAdmin
        .from('cross_tenant_participation')
        .select('is_participating')
        .eq('org_id', req.orgId!)
        .maybeSingle();

      const { data, error } = await supabaseAdmin
        .from('cross_tenant_participation')
        .upsert(
          {
            org_id: req.orgId!,
            is_participating: isParticipating,
            toggled_by: req.userId!,
            toggled_at: new Date().toISOString(),
            prior_state: current?.is_participating ?? null,
            reason_for_change: reason || null,
            consent_version: 'v1',
          },
          { onConflict: 'org_id' }
        )
        .select()
        .single();

      if (error) return res.status(400).json({ error: error.message });
      res.json({ data });
    } catch (err) { next(err); }
  }
);

// GET /api/v1/cross-tenant-participation/run-aggregation — manually trigger for admins
router.post('/run-aggregation', [...adminAuth, auditLog('update', 'cross_tenant_aggregates')],
  async (_req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { runCrossTenantAggregation } = await import('../jobs/cross-tenant-aggregation-job');
      const result = await runCrossTenantAggregation();
      res.json({ data: result });
    } catch (err) { next(err); }
  }
);

export default router;
