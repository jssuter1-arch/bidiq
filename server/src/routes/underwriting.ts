import { Router } from 'express';
import { z } from 'zod';
import {
  authenticateUser, loadOrgContext, requireRole,
  requireModuleAccess, validateBody, auditLog,
} from '../middleware';
import { supabaseAdmin } from '../utils/supabase';
import { computeUnderwriting, computeSensitivity } from '../services/underwriting-calc-service';
import { AuthenticatedRequest } from '../middleware/authenticateUser';

const router = Router({ mergeParams: true });
const dealAccess = [authenticateUser, loadOrgContext, requireModuleAccess('deal_intelligence')];
const writeAccess = [authenticateUser, loadOrgContext, requireModuleAccess('deal_intelligence'), requireRole('project_manager')];

const UWSchema = z.object({
  modelName:                    z.string().optional(),
  proposedPurchasePrice:        z.number().nonnegative(),
  downPaymentPct:               z.number().min(0).max(1),
  seniorDebtRate:               z.number().optional(),
  seniorDebtTermMonths:         z.number().int().optional(),
  seniorDebtAmortizationMonths: z.number().int().optional(),
  hasConstructionLoan:          z.boolean().optional(),
  constructionLoanAmount:       z.number().optional(),
  constructionLoanRate:         z.number().optional(),
  constructionLoanTermMonths:   z.number().int().optional(),
  estimatedRenovationCost:      z.number().nonnegative().optional(),
  estimatedClosingCosts:        z.number().nonnegative().optional(),
  estimatedCarryCosts:          z.number().nonnegative().optional(),
  currentRentRollMonthly:       z.number().nonnegative().optional(),
  projectedPostRenoRentMonthly: z.number().nonnegative().optional(),
  currentOtherIncomeMonthly:    z.number().nonnegative().optional(),
  projectedOtherIncomeMonthly:  z.number().nonnegative().optional(),
  currentOperatingExpensesMonthly:   z.number().nonnegative().optional(),
  projectedOperatingExpensesMonthly: z.number().nonnegative().optional(),
  vacancyFactorPct:             z.number().min(0).max(1).optional(),
  exitCapRate:                  z.number().min(0.01).max(0.5).optional(),
  holdPeriodMonths:             z.number().int().min(1).max(120).optional(),
  hurdleRate:                   z.number().min(0).max(1).optional(),
  discountRate:                 z.number().min(0).max(1).optional(),
  notes:                        z.string().optional(),
});

function toCalcInputs(b: Record<string, any>) {
  return {
    proposed_purchase_price:          b.proposedPurchasePrice,
    down_payment_pct:                 b.downPaymentPct,
    senior_debt_rate:                 b.seniorDebtRate,
    senior_debt_term_months:          b.seniorDebtTermMonths,
    senior_debt_amortization_months:  b.seniorDebtAmortizationMonths ?? 360,
    has_construction_loan:            b.hasConstructionLoan,
    construction_loan_amount:         b.constructionLoanAmount,
    construction_loan_rate:           b.constructionLoanRate,
    construction_loan_term_months:    b.constructionLoanTermMonths,
    estimated_renovation_cost:        b.estimatedRenovationCost,
    estimated_closing_costs:          b.estimatedClosingCosts,
    estimated_carry_costs:            b.estimatedCarryCosts,
    current_rent_roll_monthly:        b.currentRentRollMonthly,
    projected_post_reno_rent_monthly: b.projectedPostRenoRentMonthly,
    current_other_income_monthly:     b.currentOtherIncomeMonthly,
    projected_other_income_monthly:   b.projectedOtherIncomeMonthly,
    current_operating_expenses_monthly:   b.currentOperatingExpensesMonthly,
    projected_operating_expenses_monthly: b.projectedOperatingExpensesMonthly,
    vacancy_factor_pct:               b.vacancyFactorPct,
    exit_cap_rate:                    b.exitCapRate,
    hold_period_months:               b.holdPeriodMonths,
    hurdle_rate:                      b.hurdleRate,
    discount_rate:                    b.discountRate,
  };
}

function toDbRow(b: Record<string, any>) {
  return {
    model_name:                       b.modelName,
    proposed_purchase_price:          b.proposedPurchasePrice,
    down_payment_pct:                 b.downPaymentPct,
    senior_debt_rate:                 b.seniorDebtRate,
    senior_debt_term_months:          b.seniorDebtTermMonths,
    senior_debt_amortization_months:  b.seniorDebtAmortizationMonths,
    has_construction_loan:            b.hasConstructionLoan,
    construction_loan_amount:         b.constructionLoanAmount,
    construction_loan_rate:           b.constructionLoanRate,
    construction_loan_term_months:    b.constructionLoanTermMonths,
    estimated_renovation_cost:        b.estimatedRenovationCost,
    estimated_closing_costs:          b.estimatedClosingCosts,
    estimated_carry_costs:            b.estimatedCarryCosts,
    current_rent_roll_monthly:        b.currentRentRollMonthly,
    projected_post_reno_rent_monthly: b.projectedPostRenoRentMonthly,
    current_other_income_monthly:     b.currentOtherIncomeMonthly,
    projected_other_income_monthly:   b.projectedOtherIncomeMonthly,
    current_operating_expenses_monthly:   b.currentOperatingExpensesMonthly,
    projected_operating_expenses_monthly: b.projectedOperatingExpensesMonthly,
    vacancy_factor_pct:               b.vacancyFactorPct,
    exit_cap_rate:                    b.exitCapRate,
    hold_period_months:               b.holdPeriodMonths,
    hurdle_rate:                      b.hurdleRate,
    discount_rate:                    b.discountRate,
    notes:                            b.notes,
  };
}

// ── Nested under /api/v1/deals/:dealId/underwriting ─────────────────────────

// GET /api/v1/deals/:dealId/underwriting
router.get('/', ...dealAccess, async (req: AuthenticatedRequest, res, next) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('deal_underwriting_models')
      .select('*')
      .eq('deal_id', req.params.dealId)
      .eq('org_id', req.orgId!)
      .order('version', { ascending: true });
    if (error) return res.status(400).json({ error: error.message });
    res.json({ data });
  } catch (err) { next(err); }
});

// POST /api/v1/deals/:dealId/underwriting
router.post('/', ...writeAccess, validateBody(UWSchema), auditLog('create', 'deal_underwriting_models'), async (req: AuthenticatedRequest, res, next) => {
  try {
    // Determine next version number
    const { data: existing } = await supabaseAdmin
      .from('deal_underwriting_models')
      .select('version')
      .eq('deal_id', req.params.dealId)
      .order('version', { ascending: false })
      .limit(1);
    const nextVersion = ((existing?.[0]?.version ?? 0) + 1);

    const calcInputs = toCalcInputs(req.body);
    const results = computeUnderwriting(calcInputs);

    const { data, error } = await supabaseAdmin
      .from('deal_underwriting_models')
      .insert({
        deal_id: req.params.dealId,
        org_id: req.orgId,
        version: nextVersion,
        is_active_version: existing?.length === 0, // first version is auto-active
        ...toDbRow(req.body),
        ...results,
        created_by: req.userId,
      })
      .select().single();
    if (error) return res.status(400).json({ error: error.message });
    res.status(201).json({ data });
  } catch (err) { next(err); }
});

// ── Standalone underwriting routes (/api/v1/underwriting/:id) ────────────────

const standaloneRouter = Router();

// GET /api/v1/underwriting/:id
standaloneRouter.get('/:id', ...dealAccess, async (req: AuthenticatedRequest, res, next) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('deal_underwriting_models')
      .select('*')
      .eq('id', req.params.id)
      .eq('org_id', req.orgId!)
      .single();
    if (error || !data) return res.status(404).json({ error: 'Not found' });
    res.json({ data });
  } catch (err) { next(err); }
});

// PATCH /api/v1/underwriting/:id
standaloneRouter.patch('/:id', ...writeAccess, validateBody(UWSchema.partial()), auditLog('update', 'deal_underwriting_models'), async (req: AuthenticatedRequest, res, next) => {
  try {
    // Fetch current values to merge for recalculation
    const { data: current, error: fetchErr } = await supabaseAdmin
      .from('deal_underwriting_models')
      .select('*')
      .eq('id', req.params.id)
      .eq('org_id', req.orgId!)
      .single();
    if (fetchErr || !current) return res.status(404).json({ error: 'Not found' });

    const merged = { ...toCalcInputs(current), ...toCalcInputs(req.body) };
    const results = computeUnderwriting(merged as any);
    const patch = { ...toDbRow(req.body), ...results };
    // Remove undefined keys
    Object.keys(patch).forEach((k) => patch[k as keyof typeof patch] === undefined && delete patch[k as keyof typeof patch]);

    const { data, error } = await supabaseAdmin
      .from('deal_underwriting_models')
      .update(patch)
      .eq('id', req.params.id)
      .eq('org_id', req.orgId!)
      .select().single();
    if (error) return res.status(400).json({ error: error.message });
    res.json({ data });
  } catch (err) { next(err); }
});

// POST /api/v1/underwriting/:id/duplicate
standaloneRouter.post('/:id/duplicate', ...writeAccess, async (req: AuthenticatedRequest, res, next) => {
  try {
    const { data: source, error: fetchErr } = await supabaseAdmin
      .from('deal_underwriting_models')
      .select('*')
      .eq('id', req.params.id)
      .eq('org_id', req.orgId!)
      .single();
    if (fetchErr || !source) return res.status(404).json({ error: 'Not found' });

    const { data: existing } = await supabaseAdmin
      .from('deal_underwriting_models')
      .select('version')
      .eq('deal_id', source.deal_id)
      .order('version', { ascending: false })
      .limit(1);
    const nextVersion = ((existing?.[0]?.version ?? 0) + 1);

    const { id: _, created_at: __, is_active_version: ___, ...rest } = source;
    const { data, error } = await supabaseAdmin
      .from('deal_underwriting_models')
      .insert({ ...rest, version: nextVersion, is_active_version: false, model_name: `${source.model_name || 'v' + source.version} (copy)`, created_by: req.userId })
      .select().single();
    if (error) return res.status(400).json({ error: error.message });
    res.status(201).json({ data });
  } catch (err) { next(err); }
});

// POST /api/v1/underwriting/:id/activate
standaloneRouter.post('/:id/activate', ...writeAccess, async (req: AuthenticatedRequest, res, next) => {
  try {
    const { data: model, error: fetchErr } = await supabaseAdmin
      .from('deal_underwriting_models')
      .select('deal_id')
      .eq('id', req.params.id)
      .eq('org_id', req.orgId!)
      .single();
    if (fetchErr || !model) return res.status(404).json({ error: 'Not found' });

    // Demote all other versions for this deal
    await supabaseAdmin
      .from('deal_underwriting_models')
      .update({ is_active_version: false })
      .eq('deal_id', model.deal_id)
      .neq('id', req.params.id);

    const { data, error } = await supabaseAdmin
      .from('deal_underwriting_models')
      .update({ is_active_version: true })
      .eq('id', req.params.id)
      .select().single();
    if (error) return res.status(400).json({ error: error.message });
    res.json({ data });
  } catch (err) { next(err); }
});

// POST /api/v1/underwriting/:id/sensitivity
standaloneRouter.post('/:id/sensitivity', ...dealAccess, async (req: AuthenticatedRequest, res, next) => {
  try {
    const { data: model, error: fetchErr } = await supabaseAdmin
      .from('deal_underwriting_models')
      .select('*')
      .eq('id', req.params.id)
      .eq('org_id', req.orgId!)
      .single();
    if (fetchErr || !model) return res.status(404).json({ error: 'Not found' });
    const sensitivity = computeSensitivity(model);
    res.json({ data: sensitivity });
  } catch (err) { next(err); }
});

// POST /api/v1/underwriting/:id/report-pdf
standaloneRouter.post('/:id/report-pdf', ...dealAccess, async (req: AuthenticatedRequest, res, next) => {
  try {
    const { data: model, error: fetchErr } = await supabaseAdmin
      .from('deal_underwriting_models')
      .select('*, acquisition_deals(deal_name, street_address, city, state, total_units)')
      .eq('id', req.params.id)
      .eq('org_id', req.orgId!)
      .single();
    if (fetchErr || !model) return res.status(404).json({ error: 'Not found' });

    // Return model data for client-side PDF generation
    // Client uses @react-pdf/renderer with PDFDownloadLink (already installed)
    res.json({ data: model });
  } catch (err) { next(err); }
});

export { standaloneRouter as underwritingRouter };
export default router;
