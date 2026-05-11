import { Router } from 'express';
import { z } from 'zod';
import { authenticateUser, loadOrgContext, requireRole, validateBody, auditLog } from '../middleware';
import { listHandler, getHandler, deleteHandler } from '../utils/crud';
import { supabaseAdmin } from '../utils/supabase';
import { AuthenticatedRequest } from '../middleware/authenticateUser';
import { recordBudgetSnapshot } from '../services/budget-snapshot-service';
import { computeChangeOrderTotal, captureLineItemsSnapshot } from '../services/budget-snapshot-helpers';

const router = Router();
const auth = [authenticateUser, loadOrgContext];

const CreateSchema = z.object({
  propertyId: z.string().uuid(),
  name: z.string().min(1),
  description: z.string().optional(),
  status: z.enum(['planning', 'active', 'on_hold', 'completed', 'cancelled']).optional(),
  projectType: z.enum(['renovation', 'new_construction', 'repair', 'capital_improvement', 'unit_turn']),
  initialBudget: z.number().nonnegative(),
  currentBudget: z.number().nonnegative().optional(),
  hasConstructionLoan: z.boolean().optional(),
  loanAmount: z.number().nonnegative().optional(),
  lenderName: z.string().optional(),
  loanInterestRate: z.number().min(0).max(100).optional(),
  startDate: z.string().optional(),
  targetCompletion: z.string().optional(),
  projectManagerId: z.string().uuid().optional(),
  primaryContractorId: z.string().uuid().optional(),
  priority: z.enum(['low', 'medium', 'high', 'critical']).optional(),
  // Phase 3: skip the budget lifecycle hooks (used by deal promotion)
  skipPhase3Hook: z.boolean().optional(),
});

const UpdateSchema = CreateSchema.partial();

router.get('/', ...auth, listHandler('projects', (sb, orgId, filters) => {
  let q = sb.from('projects').select('*, properties(name, address, city)', { count: 'exact' }).eq('org_id', orgId);
  if (filters.status) q = q.eq('status', filters.status);
  if (filters.propertyId) q = q.eq('property_id', filters.propertyId);
  if (filters.priority) q = q.eq('priority', filters.priority);
  if (filters.search) q = q.ilike('name', `%${filters.search}%`);
  return q.order('created_at', { ascending: false });
}));

router.get('/:id', ...auth, async (req: AuthenticatedRequest, res, next) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('projects')
      .select(`
        *,
        properties(name, address, city, state),
        budget_line_items(*),
        contractor_invoices(*, contractors(company_name)),
        permits(*),
        loan_draws(*)
      `)
      .eq('id', req.params.id)
      .eq('org_id', req.orgId!)
      .single();
    if (error || !data) return res.status(404).json({ error: 'Not found' });
    res.json({ data });
  } catch (err) { next(err); }
});

router.post('/', ...auth, requireRole('project_manager'), validateBody(CreateSchema), auditLog('create', 'projects'), async (req: AuthenticatedRequest, res, next) => {
  try {
    const body = req.body;
    const dbRow: Record<string, unknown> = {
      org_id: req.orgId,
      property_id: body.propertyId,
      name: body.name,
      description: body.description ?? null,
      status: body.status ?? 'planning',
      project_type: body.projectType,
      initial_budget: body.initialBudget,
      current_budget: body.currentBudget ?? body.initialBudget,
      has_construction_loan: body.hasConstructionLoan ?? false,
      loan_amount: body.loanAmount ?? null,
      lender_name: body.lenderName ?? null,
      loan_interest_rate: body.loanInterestRate ?? null,
      start_date: body.startDate ?? null,
      target_completion: body.targetCompletion ?? null,
      project_manager_id: body.projectManagerId ?? null,
      primary_contractor_id: body.primaryContractorId ?? null,
      priority: body.priority ?? 'medium',
    };

    const { data, error } = await supabaseAdmin
      .from('projects')
      .insert(dbRow)
      .select()
      .single();

    if (error || !data) return res.status(500).json({ error: error?.message ?? 'Insert failed' });

    // Phase 3: Budget Lifecycle hook — project_created snapshot
    if (!body.skipPhase3Hook) {
      try {
        await recordBudgetSnapshot({
          projectId: data.id,
          orgId: req.orgId!,
          snapshotType: 'project_created',
          budgetTotal: data.current_budget ?? data.initial_budget,
          actualSpendAtSnapshot: 0,
          changeOrderTotalAtSnapshot: 0,
          lineItemsSnapshot: [],
          triggeredByEvent: 'project_created',
          triggeredByUser: req.userId,
          notes: `Project created: ${data.name}`,
          markCurrent: true,
        });

        // Phase 3: Budget Lifecycle hook — bank_declared snapshot when loan info provided
        if (data.has_construction_loan && data.loan_amount) {
          await recordBudgetSnapshot({
            projectId: data.id,
            orgId: req.orgId!,
            snapshotType: 'bank_declared',
            budgetTotal: data.current_budget ?? data.initial_budget,
            actualSpendAtSnapshot: 0,
            changeOrderTotalAtSnapshot: 0,
            lineItemsSnapshot: [],
            triggeredByEvent: 'loan_configured_at_creation',
            triggeredByUser: req.userId,
            notes: `Bank declared: ${data.lender_name ?? 'Lender'} — $${data.loan_amount.toLocaleString()}`,
            markCurrent: true,
          });
        }
      } catch (snapErr) {
        // Non-fatal: project was created successfully; log and continue
        console.error('[Phase 3] project_created snapshot failed:', snapErr);
      }
    }

    res.status(201).json({ data });
  } catch (err) { next(err); }
});

router.patch('/:id', ...auth, requireRole('project_manager'), validateBody(UpdateSchema), auditLog('update', 'projects'), async (req: AuthenticatedRequest, res, next) => {
  try {
    // Fetch current state before update so we can detect status transitions
    const { data: before, error: fetchError } = await supabaseAdmin
      .from('projects')
      .select('id, org_id, name, status, has_construction_loan, loan_amount, lender_name, current_budget, actual_spend')
      .eq('id', req.params.id)
      .eq('org_id', req.orgId!)
      .single();

    if (fetchError || !before) return res.status(404).json({ error: 'Not found' });

    const body = req.body;
    const dbRow: Record<string, unknown> = {};
    if (body.name !== undefined) dbRow.name = body.name;
    if (body.description !== undefined) dbRow.description = body.description;
    if (body.status !== undefined) {
      dbRow.status = body.status;
      // Phase 3: Budget Lifecycle hook — track when status changes
      if (body.status !== before.status) {
        dbRow.status_changed_at = new Date().toISOString();
      }
    }
    if (body.projectType !== undefined) dbRow.project_type = body.projectType;
    if (body.initialBudget !== undefined) dbRow.initial_budget = body.initialBudget;
    if (body.currentBudget !== undefined) dbRow.current_budget = body.currentBudget;
    if (body.hasConstructionLoan !== undefined) dbRow.has_construction_loan = body.hasConstructionLoan;
    if (body.loanAmount !== undefined) dbRow.loan_amount = body.loanAmount;
    if (body.lenderName !== undefined) dbRow.lender_name = body.lenderName;
    if (body.loanInterestRate !== undefined) dbRow.loan_interest_rate = body.loanInterestRate;
    if (body.startDate !== undefined) dbRow.start_date = body.startDate;
    if (body.targetCompletion !== undefined) dbRow.target_completion = body.targetCompletion;
    if (body.projectManagerId !== undefined) dbRow.project_manager_id = body.projectManagerId;
    if (body.primaryContractorId !== undefined) dbRow.primary_contractor_id = body.primaryContractorId;
    if (body.priority !== undefined) dbRow.priority = body.priority;
    if (body.propertyId !== undefined) dbRow.property_id = body.propertyId;

    const { data, error } = await supabaseAdmin
      .from('projects')
      .update(dbRow)
      .eq('id', req.params.id)
      .eq('org_id', req.orgId!)
      .select()
      .single();

    if (error || !data) return res.status(404).json({ error: error?.message ?? 'Not found' });

    // Phase 3: Budget Lifecycle hooks — evaluate which snapshot types apply
    const hooks: Array<() => Promise<void>> = [];

    // bank_declared: loan info was added or changed
    const loanChanged =
      (body.hasConstructionLoan !== undefined && body.hasConstructionLoan !== before.has_construction_loan) ||
      (body.loanAmount !== undefined && body.loanAmount !== before.loan_amount);
    if (loanChanged && data.has_construction_loan && data.loan_amount) {
      hooks.push(async () => {
        const [coTotal, lineItems] = await Promise.all([
          computeChangeOrderTotal(data.id),
          captureLineItemsSnapshot(data.id),
        ]);
        await recordBudgetSnapshot({
          projectId: data.id,
          orgId: req.orgId!,
          snapshotType: 'bank_declared',
          budgetTotal: data.current_budget ?? 0,
          actualSpendAtSnapshot: data.actual_spend ?? 0,
          changeOrderTotalAtSnapshot: coTotal,
          lineItemsSnapshot: lineItems,
          triggeredByEvent: 'loan_updated',
          triggeredByUser: req.userId,
          notes: `Bank declared: ${data.lender_name ?? 'Lender'} — $${(data.loan_amount ?? 0).toLocaleString()}`,
          markCurrent: true,
        });
      });
    }

    // break_ground: status transition to 'active'
    if (body.status === 'active' && before.status !== 'active') {
      hooks.push(async () => {
        const [coTotal, lineItems] = await Promise.all([
          computeChangeOrderTotal(data.id),
          captureLineItemsSnapshot(data.id),
        ]);
        await recordBudgetSnapshot({
          projectId: data.id,
          orgId: req.orgId!,
          snapshotType: 'break_ground',
          budgetTotal: data.current_budget ?? 0,
          actualSpendAtSnapshot: data.actual_spend ?? 0,
          changeOrderTotalAtSnapshot: coTotal,
          lineItemsSnapshot: lineItems,
          triggeredByEvent: 'status_active',
          triggeredByUser: req.userId,
          notes: `Break ground: ${data.name} moved to active`,
          markCurrent: true,
        });
      });
    }

    // completion: status transition to 'completed'
    if (body.status === 'completed' && before.status !== 'completed') {
      hooks.push(async () => {
        const [coTotal, lineItems] = await Promise.all([
          computeChangeOrderTotal(data.id),
          captureLineItemsSnapshot(data.id),
        ]);
        await recordBudgetSnapshot({
          projectId: data.id,
          orgId: req.orgId!,
          snapshotType: 'completion',
          budgetTotal: data.current_budget ?? 0,
          actualSpendAtSnapshot: data.actual_spend ?? 0,
          changeOrderTotalAtSnapshot: coTotal,
          lineItemsSnapshot: lineItems,
          triggeredByEvent: 'status_completed',
          triggeredByUser: req.userId,
          notes: `Completion: ${data.name} marked complete`,
          markCurrent: true,
        });
      });
    }

    // Run all hooks non-fatally
    for (const hook of hooks) {
      try {
        await hook();
      } catch (snapErr) {
        console.error('[Phase 3] PATCH snapshot hook failed:', snapErr);
      }
    }

    res.json({ data });
  } catch (err) { next(err); }
});

router.delete('/:id', ...auth, requireRole('admin'), auditLog('delete', 'projects'), deleteHandler('projects'));

export default router;
