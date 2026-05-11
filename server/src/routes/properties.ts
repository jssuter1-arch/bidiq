import { Router } from 'express';
import { z } from 'zod';
import { authenticateUser, loadOrgContext, requireRole, validateBody, auditLog } from '../middleware';
import { listHandler, getHandler, createHandler, updateHandler, deleteHandler } from '../utils/crud';
import { supabaseAdmin } from '../utils/supabase';
import { AuthenticatedRequest } from '../middleware/authenticateUser';

const router = Router();
const auth = [authenticateUser, loadOrgContext];

const CreateSchema = z.object({
  name: z.string().min(1),
  address: z.string().min(1),
  city: z.string().min(1),
  state: z.string().length(2),
  zip: z.string().min(5),
  propertyType: z.enum(['single_family', 'multi_family', 'commercial', 'mixed_use', 'land']),
  status: z.enum(['active', 'under_renovation', 'for_sale', 'sold', 'inactive']).optional(),
  unitCount: z.number().int().min(1).optional(),
  purchasePrice: z.number().positive().optional(),
  purchaseDate: z.string().optional(),
  currentValue: z.number().positive().optional(),
  yardiPropertyId: z.string().optional(),
  notes: z.string().optional(),
});

const UpdateSchema = CreateSchema.partial();

router.get('/', ...auth, listHandler('properties', (sb, orgId, filters) => {
  let q = sb.from('properties').select('*', { count: 'exact' }).eq('org_id', orgId);
  if (filters.status) q = q.eq('status', filters.status);
  if (filters.propertyType) q = q.eq('property_type', filters.propertyType);
  if (filters.search) q = q.ilike('name', `%${filters.search}%`);
  return q.order('created_at', { ascending: false });
}));

router.get('/:id', ...auth, getHandler('properties'));

router.get('/:id/summary', ...auth, async (req: AuthenticatedRequest, res, next) => {
  try {
    const { data: property, error } = await supabaseAdmin
      .from('properties')
      .select('*, units(*), projects(*, budget_line_items(*))')
      .eq('id', req.params.id)
      .eq('org_id', req.orgId!)
      .single();
    if (error || !property) return res.status(404).json({ error: 'Not found' });
    res.json({ data: property });
  } catch (err) { next(err); }
});

router.post('/', ...auth, requireRole('project_manager'), validateBody(CreateSchema), auditLog('create', 'properties'), createHandler('properties'));
router.patch('/:id', ...auth, requireRole('project_manager'), validateBody(UpdateSchema), auditLog('update', 'properties'), updateHandler('properties'));
router.delete('/:id', ...auth, requireRole('admin'), auditLog('delete', 'properties'), deleteHandler('properties'));

export default router;
