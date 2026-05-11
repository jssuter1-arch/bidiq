import { Router } from 'express';
import { z } from 'zod';
import { authenticateUser, loadOrgContext, requireRole, validateBody, auditLog } from '../middleware';
import { supabaseAdmin } from '../utils/supabase';
import { requireModuleAccess } from '../middleware/requireModuleAccess';
import { AuthenticatedRequest } from '../middleware/authenticateUser';
import { getChangeOrderAnalytics } from '../services/change-order-analytics-service';
import { getNormalizedRateCard } from '../services/scope-normalization-service';

const router = Router();
const auth = [authenticateUser, loadOrgContext, requireModuleAccess('cost_intelligence_extended')];

const VALID_CATEGORIES = [
  'scope_creep', 'design_change', 'unforeseen_conditions', 'material_escalation',
  'labor_shortage', 'permit_requirement', 'owner_request', 'error_omission', 'other',
] as const;
type CoCategory = typeof VALID_CATEGORIES[number];

// Analytics summary
router.get('/analytics', ...auth, async (req: AuthenticatedRequest, res, next) => {
  try {
    const lookbackDays = req.query.lookbackDays ? parseInt(req.query.lookbackDays as string, 10) : 365;
    const result = await getChangeOrderAnalytics({ orgId: req.orgId!, lookbackDays });
    res.json(result);
  } catch (err) { next(err); }
});

// List change-order invoices (uncategorized queue)
router.get('/queue', ...auth, async (req: AuthenticatedRequest, res, next) => {
  try {
    let q = supabaseAdmin
      .from('contractor_invoices')
      .select('*, contractors(company_name), projects(name)', { count: 'exact' })
      .eq('org_id', req.orgId!)
      .eq('is_change_order', true);

    if (req.query.uncategorized === 'true') {
      q = q.is('change_order_category', null);
    }
    if (req.query.projectId) q = q.eq('project_id', req.query.projectId as string);

    const { data, count, error } = await q.order('invoice_date', { ascending: false }).limit(100);
    if (error) return res.status(400).json({ error: error.message });
    res.json({ data, count });
  } catch (err) { next(err); }
});

// Categorize a single CO invoice
const CategorizeSchema = z.object({
  change_order_category: z.enum(VALID_CATEGORIES),
  category_notes: z.string().optional(),
});

router.patch('/:id/categorize', ...auth, requireRole('analyst'), validateBody(CategorizeSchema), auditLog('update', 'contractor_invoices'), async (req: AuthenticatedRequest, res, next) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('contractor_invoices')
      .update({
        change_order_category: req.body.change_order_category,
        category_notes: req.body.category_notes,
        categorized_by: req.userId,
        categorized_at: new Date().toISOString(),
      })
      .eq('id', req.params.id)
      .eq('org_id', req.orgId!)
      .eq('is_change_order', true)
      .select()
      .single();
    if (error || !data) return res.status(404).json({ error: 'Not found' });
    res.json({ data });
  } catch (err) { next(err); }
});

// Bulk categorize
const BulkCategorizeSchema = z.object({
  ids: z.array(z.string().uuid()).min(1),
  change_order_category: z.enum(VALID_CATEGORIES),
  category_notes: z.string().optional(),
});

router.post('/bulk-categorize', ...auth, requireRole('analyst'), validateBody(BulkCategorizeSchema), auditLog('update', 'contractor_invoices'), async (req: AuthenticatedRequest, res, next) => {
  try {
    const { ids, change_order_category, category_notes } = req.body;
    const { data, error } = await supabaseAdmin
      .from('contractor_invoices')
      .update({
        change_order_category,
        category_notes,
        categorized_by: req.userId,
        categorized_at: new Date().toISOString(),
      })
      .in('id', ids)
      .eq('org_id', req.orgId!)
      .eq('is_change_order', true)
      .select('id');
    if (error) return res.status(400).json({ error: error.message });
    res.json({ updated: (data ?? []).length });
  } catch (err) { next(err); }
});

// Normalized rate card for a contractor
router.get('/normalized-rates/:contractorId', ...auth, async (req: AuthenticatedRequest, res, next) => {
  try {
    const lookbackDays = req.query.lookbackDays ? parseInt(req.query.lookbackDays as string, 10) : 365;
    const result = await getNormalizedRateCard({
      orgId: req.orgId!,
      contractorId: req.params.contractorId,
      category: req.query.category as string | undefined,
      lookbackDays,
    });
    res.json(result);
  } catch (err) { next(err); }
});

export default router;
