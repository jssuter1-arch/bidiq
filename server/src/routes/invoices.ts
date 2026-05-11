import { Router } from 'express';
import { z } from 'zod';
import { authenticateUser, loadOrgContext, requireRole, validateBody, auditLog } from '../middleware';
import { listHandler, getHandler, createHandler, updateHandler, deleteHandler } from '../utils/crud';
import { supabaseAdmin } from '../utils/supabase';
import { AuthenticatedRequest } from '../middleware/authenticateUser';
import { recordBudgetSnapshot } from '../services/budget-snapshot-service';
import { computeChangeOrderTotal, captureLineItemsSnapshot } from '../services/budget-snapshot-helpers';

const router = Router();
const auth = [authenticateUser, loadOrgContext];

const CreateSchema = z.object({
  projectId: z.string().uuid(),
  contractorId: z.string().uuid(),
  budgetLineItemId: z.string().uuid().optional(),
  invoiceNumber: z.string().optional(),
  invoiceDate: z.string(),
  dueDate: z.string().optional(),
  amount: z.number().positive(),
  taxAmount: z.number().nonnegative().optional(),
  totalAmount: z.number().positive(),
  isChangeOrder: z.boolean().optional(),
  changeOrderReason: z.string().optional(),
  yardiPoNumber: z.string().optional(),
  notes: z.string().optional(),
});

const UpdateSchema = CreateSchema.partial();

const CO_CATEGORIES = [
  'scope_creep', 'design_change', 'unforeseen_conditions', 'material_escalation',
  'labor_shortage', 'permit_requirement', 'owner_request', 'error_omission', 'other',
] as const;

const ApproveSchema = z.object({
  paymentMethod: z.enum(['check', 'ach', 'wire', 'credit_card', 'cash']).optional(),
  changeOrderCategory: z.enum(CO_CATEGORIES).optional(),
  categoryNotes: z.string().optional(),
});

router.get('/', ...auth, listHandler('contractor_invoices', (sb, orgId, filters) => {
  let q = sb.from('contractor_invoices').select('*, contractors(company_name), projects(name)', { count: 'exact' }).eq('org_id', orgId);
  if (filters.projectId) q = q.eq('project_id', filters.projectId);
  if (filters.contractorId) q = q.eq('contractor_id', filters.contractorId);
  if (filters.status) q = q.eq('status', filters.status);
  if (filters.isChangeOrder) q = q.eq('is_change_order', filters.isChangeOrder === 'true');
  return q.order('invoice_date', { ascending: false });
}));

router.get('/:id', ...auth, getHandler('contractor_invoices'));
router.post('/', ...auth, requireRole('project_manager'), validateBody(CreateSchema), auditLog('create', 'contractor_invoices'), createHandler('contractor_invoices'));
router.patch('/:id', ...auth, requireRole('project_manager'), validateBody(UpdateSchema), auditLog('update', 'contractor_invoices'), updateHandler('contractor_invoices'));

router.post('/:id/approve', ...auth, requireRole('project_manager'), validateBody(ApproveSchema), auditLog('approve', 'contractor_invoices'), async (req: AuthenticatedRequest, res, next) => {
  try {
    // Fetch current invoice to check if it's a CO
    const { data: existing } = await supabaseAdmin
      .from('contractor_invoices')
      .select('is_change_order, change_order_category')
      .eq('id', req.params.id)
      .eq('org_id', req.orgId!)
      .single();

    if (existing?.is_change_order && !existing.change_order_category && !req.body.changeOrderCategory) {
      return res.status(400).json({ code: 'CATEGORY_REQUIRED', error: 'Change order category is required before approval.' });
    }

    const updatePayload: Record<string, unknown> = {
      status: 'approved',
      approved_by: req.userId,
      payment_method: req.body.paymentMethod,
    };
    if (req.body.changeOrderCategory) {
      updatePayload.change_order_category = req.body.changeOrderCategory;
      updatePayload.category_notes = req.body.categoryNotes ?? null;
      updatePayload.categorized_by = req.userId;
      updatePayload.categorized_at = new Date().toISOString();
    }

    const { data, error } = await supabaseAdmin
      .from('contractor_invoices')
      .update(updatePayload)
      .eq('id', req.params.id)
      .eq('org_id', req.orgId!)
      .select()
      .single();
    if (error || !data) return res.status(404).json({ error: 'Not found' });

    // Phase 3: Budget Lifecycle hook — revision snapshot when a change-order invoice is approved
    if (data.is_change_order) {
      try {
        const project = await supabaseAdmin
          .from('projects')
          .select('id, org_id, name, current_budget, actual_spend')
          .eq('id', data.project_id)
          .single();

        if (project.data) {
          const [coTotal, lineItems] = await Promise.all([
            computeChangeOrderTotal(data.project_id),
            captureLineItemsSnapshot(data.project_id),
          ]);
          await recordBudgetSnapshot({
            projectId: data.project_id,
            orgId: req.orgId!,
            snapshotType: 'revision',
            budgetTotal: project.data.current_budget ?? 0,
            actualSpendAtSnapshot: project.data.actual_spend ?? 0,
            changeOrderTotalAtSnapshot: coTotal,
            lineItemsSnapshot: lineItems,
            triggeredByEvent: 'change_order_approved',
            triggeredByUser: req.userId,
            notes: `Change order approved: Invoice ${data.invoice_number ?? data.id} — $${(data.total_amount ?? 0).toLocaleString()}`,
            markCurrent: true,
          });
        }
      } catch (snapErr) {
        console.error('[Phase 3] change_order_approved snapshot failed:', snapErr);
      }
    }

    res.json({ data });
  } catch (err) { next(err); }
});

router.post('/:id/mark-paid', ...auth, requireRole('project_manager'), auditLog('update', 'contractor_invoices'), async (req: AuthenticatedRequest, res, next) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('contractor_invoices')
      .update({ status: 'paid', payment_date: new Date().toISOString().split('T')[0] })
      .eq('id', req.params.id)
      .eq('org_id', req.orgId!)
      .select()
      .single();
    if (error || !data) return res.status(404).json({ error: 'Not found' });
    res.json({ data });
  } catch (err) { next(err); }
});

router.delete('/:id', ...auth, requireRole('admin'), auditLog('delete', 'contractor_invoices'), deleteHandler('contractor_invoices'));

export default router;
