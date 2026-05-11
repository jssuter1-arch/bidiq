import { Router } from 'express';
import { z } from 'zod';
import { authenticateUser, loadOrgContext, requireRole, validateBody, auditLog } from '../middleware';
import { supabaseAdmin } from '../utils/supabase';
import { AuthenticatedRequest } from '../middleware/authenticateUser';

const router = Router();
const auth = [authenticateUser, loadOrgContext];

const UpdateSchema = z.object({
  name: z.string().min(1).optional(),
  slug: z.string().min(1).regex(/^[a-z0-9-]+$/, 'Only lowercase letters, numbers, and hyphens').optional(),
  plan: z.enum(['starter', 'growth', 'enterprise']).optional(),
  logoUrl: z.string().url().optional().or(z.literal('')),
});

router.get('/me', ...auth, async (req: AuthenticatedRequest, res, next) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('organizations')
      .select('*')
      .eq('id', req.orgId!)
      .single();
    if (error || !data) return res.status(404).json({ error: 'Organization not found' });
    res.json({ data });
  } catch (err) { next(err); }
});

router.patch('/me', ...auth, requireRole('admin'), validateBody(UpdateSchema), auditLog('update', 'organizations'), async (req: AuthenticatedRequest, res, next) => {
  try {
    const patch: Record<string, unknown> = {};
    if (req.body.name !== undefined) patch.name = req.body.name;
    if (req.body.slug !== undefined) patch.slug = req.body.slug;
    if (req.body.plan !== undefined) patch.plan = req.body.plan;
    if (req.body.logoUrl !== undefined) patch.logo_url = req.body.logoUrl;

    const { data, error } = await supabaseAdmin
      .from('organizations')
      .update(patch)
      .eq('id', req.orgId!)
      .select()
      .single();
    if (error) return res.status(400).json({ error: error.message });
    res.json({ data });
  } catch (err) { next(err); }
});

export default router;
