import { Router } from 'express';
import { z } from 'zod';
import { authenticateUser, loadOrgContext, requireRole, validateBody, auditLog } from '../middleware';
import { listHandler, getHandler, deleteHandler } from '../utils/crud';
import { supabaseAdmin } from '../utils/supabase';
import { AuthenticatedRequest } from '../middleware/authenticateUser';

const router = Router();
const auth = [authenticateUser, loadOrgContext];

const AnalysisSchema = z.object({
  propertyId: z.string().uuid(),
  projectId: z.string().uuid().optional(),
  name: z.string().min(1),
  renovationCost: z.number().nonnegative(),
  preRenovationRentPerUnit: z.number().nonnegative(),
  postRenovationRentPerUnit: z.number().nonnegative(),
  unitsAffected: z.number().int().positive(),
  capRate: z.number().positive(),
  isSaved: z.boolean().optional(),
});

function computeEquity(body: z.infer<typeof AnalysisSchema>) {
  const monthlyRentIncreasePerUnit = body.postRenovationRentPerUnit - body.preRenovationRentPerUnit;
  const totalMonthlyRentIncrease = monthlyRentIncreasePerUnit * body.unitsAffected;
  const annualRentIncrease = totalMonthlyRentIncrease * 12;
  const valueCreated = annualRentIncrease / body.capRate;
  const roiMultiple = body.renovationCost > 0 ? valueCreated / body.renovationCost : 0;
  const roiPercentage = body.renovationCost > 0 ? ((valueCreated - body.renovationCost) / body.renovationCost) * 100 : 0;
  const paybackMonths = totalMonthlyRentIncrease > 0 ? Math.ceil(body.renovationCost / totalMonthlyRentIncrease) : null;
  return {
    totalMonthlyRentIncrease,
    annualRentIncrease,
    valueCreated,
    roiMultiple,
    roiPercentage,
    paybackMonths,
    assumptions: {
      preRenovationRentPerUnit: body.preRenovationRentPerUnit,
      postRenovationRentPerUnit: body.postRenovationRentPerUnit,
      unitsAffected: body.unitsAffected,
      monthlyRentIncreasePerUnit,
    },
  };
}

router.get('/', ...auth, listHandler('equity_analyses', (sb, orgId, filters) => {
  let q = sb.from('equity_analyses').select('*, properties(name)', { count: 'exact' }).eq('org_id', orgId);
  if (filters.propertyId) q = q.eq('property_id', filters.propertyId);
  if (filters.isSaved) q = q.eq('is_saved', filters.isSaved === 'true');
  return q.order('created_at', { ascending: false });
}));

router.get('/:id', ...auth, getHandler('equity_analyses'));

router.post('/', ...auth, requireRole('analyst'), validateBody(AnalysisSchema), auditLog('create', 'equity_analyses'), async (req: AuthenticatedRequest, res, next) => {
  try {
    const body = req.body as z.infer<typeof AnalysisSchema>;
    const computed = computeEquity(body);
    const { data, error } = await supabaseAdmin
      .from('equity_analyses')
      .insert({
        org_id: req.orgId,
        created_by: req.userId,
        property_id: body.propertyId,
        project_id: body.projectId,
        name: body.name,
        renovation_cost: body.renovationCost,
        cap_rate: body.capRate,
        monthly_noi: computed.totalMonthlyRentIncrease,
        value_created: computed.valueCreated,
        roi_multiple: computed.roiMultiple,
        roi_percentage: computed.roiPercentage,
        payback_months: computed.paybackMonths,
        assumptions: computed.assumptions,
        is_saved: body.isSaved ?? false,
      })
      .select().single();
    if (error) return res.status(400).json({ error: error.message });
    res.status(201).json({ data });
  } catch (err) { next(err); }
});

router.patch('/:id', ...auth, requireRole('analyst'), validateBody(AnalysisSchema.partial()), auditLog('update', 'equity_analyses'), async (req: AuthenticatedRequest, res, next) => {
  try {
    const body = req.body as Partial<z.infer<typeof AnalysisSchema>>;
    const computed = Object.keys(body).length > 0 ? computeEquity(body as z.infer<typeof AnalysisSchema>) : {};
    const patch: Record<string, unknown> = {};
    if (body.renovationCost !== undefined) patch.renovation_cost = body.renovationCost;
    if (body.capRate !== undefined) patch.cap_rate = body.capRate;
    if (body.name !== undefined) patch.name = body.name;
    if (body.projectId !== undefined) patch.project_id = body.projectId;
    if (body.isSaved !== undefined) patch.is_saved = body.isSaved;
    if ('totalMonthlyRentIncrease' in computed) {
      const c = computed as ReturnType<typeof computeEquity>;
      patch.monthly_noi = c.totalMonthlyRentIncrease;
      patch.value_created = c.valueCreated;
      patch.roi_multiple = c.roiMultiple;
      patch.roi_percentage = c.roiPercentage;
      patch.payback_months = c.paybackMonths;
      patch.assumptions = c.assumptions;
    }
    const { data, error } = await supabaseAdmin
      .from('equity_analyses')
      .update(patch)
      .eq('id', req.params.id).eq('org_id', req.orgId!)
      .select().single();
    if (error || !data) return res.status(404).json({ error: 'Not found' });
    res.json({ data });
  } catch (err) { next(err); }
});

router.delete('/:id', ...auth, requireRole('analyst'), auditLog('delete', 'equity_analyses'), deleteHandler('equity_analyses'));

export default router;
