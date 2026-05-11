import { Router } from 'express';
import { z } from 'zod';
import { authenticateUser, loadOrgContext, requireRole, validateBody, auditLog } from '../middleware';
import { listHandler, createHandler, updateHandler, deleteHandler } from '../utils/crud';
import { requireModuleAccess } from '../middleware/requireModuleAccess';

const router = Router();
const auth = [authenticateUser, loadOrgContext, requireModuleAccess('cost_intelligence_extended')];

const ScopeFactorSchema = z.object({
  factor_key: z.string().min(1).regex(/^[a-z0-9_]+$/, 'factor_key must be snake_case'),
  display_name: z.string().min(1),
  applicable_categories: z.array(z.string()).optional(),
  adjustment_pct: z.number().min(-1).max(1).optional(),
  notes: z.string().optional(),
  is_active: z.boolean().optional(),
});

router.get('/', ...auth, listHandler('scope_factors', (sb, orgId, filters) => {
  let q = sb.from('scope_factors').select('*', { count: 'exact' }).eq('org_id', orgId);
  if (filters.isActive !== undefined) q = q.eq('is_active', filters.isActive === 'true');
  return q.order('display_name');
}));

router.post('/', ...auth, requireRole('admin'), validateBody(ScopeFactorSchema), auditLog('create', 'scope_factors'), createHandler('scope_factors'));
router.patch('/:id', ...auth, requireRole('admin'), validateBody(ScopeFactorSchema.partial()), auditLog('update', 'scope_factors'), updateHandler('scope_factors'));
router.delete('/:id', ...auth, requireRole('admin'), auditLog('delete', 'scope_factors'), deleteHandler('scope_factors'));

export default router;
