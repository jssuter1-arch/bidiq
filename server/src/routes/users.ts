import { Router } from 'express';
import { z } from 'zod';
import { authenticateUser, loadOrgContext, requireRole, validateBody, auditLog } from '../middleware';
import { listHandler, getHandler, updateHandler } from '../utils/crud';
import { supabaseAdmin } from '../utils/supabase';
import { AuthenticatedRequest } from '../middleware/authenticateUser';

const router = Router();
const auth = [authenticateUser, loadOrgContext];

const InviteSchema = z.object({
  email: z.string().email(),
  fullName: z.string().min(2),
  role: z.enum(['project_manager', 'analyst', 'viewer']),
});

const UpdateSchema = z.object({
  fullName: z.string().min(2).optional(),
  role: z.enum(['admin', 'project_manager', 'analyst', 'viewer']).optional(),
  isActive: z.boolean().optional(),
});

router.get('/', ...auth, listHandler('users'));

router.get('/me', ...auth, async (req: AuthenticatedRequest, res, next) => {
  try {
    const { data, error } = await supabaseAdmin.from('users').select('*').eq('id', req.userId!).single();
    if (error || !data) return res.status(404).json({ error: 'User not found' });
    res.json({ data });
  } catch (err) { next(err); }
});

router.patch('/me', ...auth, validateBody(z.object({ fullName: z.string().min(2).optional() })), async (req: AuthenticatedRequest, res, next) => {
  try {
    const patch: Record<string, unknown> = {};
    if (req.body.fullName) patch.full_name = req.body.fullName;
    const { data, error } = await supabaseAdmin.from('users').update(patch).eq('id', req.userId!).select().single();
    if (error) return res.status(400).json({ error: error.message });
    res.json({ data });
  } catch (err) { next(err); }
});

router.get('/:id', ...auth, getHandler('users'));

router.post('/invite', ...auth, requireRole('admin'), validateBody(InviteSchema), async (req: AuthenticatedRequest, res, next) => {
  try {
    const { email, fullName, role } = req.body;
    const { data, error } = await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
      data: { org_id: req.orgId, full_name: fullName, role },
    });
    if (error) return res.status(400).json({ error: error.message });

    await supabaseAdmin.from('users').insert({
      id: data.user.id,
      org_id: req.orgId,
      email,
      full_name: fullName,
      role,
      invited_by: req.userId,
    });

    res.status(201).json({ data: { message: 'Invite sent', userId: data.user.id } });
  } catch (err) { next(err); }
});

router.patch('/:id', ...auth, requireRole('admin'), validateBody(UpdateSchema), auditLog('update', 'users'), updateHandler('users'));

// GET /api/v1/users/me/module-access — lightweight endpoint for client-side nav gating
router.get('/me/module-access', ...auth, async (req: AuthenticatedRequest, res, next) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('organization_module_access')
      .select('module_key, enabled, allowed_roles')
      .eq('org_id', req.orgId!);
    if (error) return res.status(400).json({ error: error.message });

    const role = req.userRole ?? 'viewer';
    const accessMap: Record<string, boolean> = {};
    for (const row of (data ?? [])) {
      accessMap[row.module_key] = row.enabled && row.allowed_roles.includes(role);
    }
    res.json({ data: accessMap });
  } catch (err) { next(err); }
});

export default router;
