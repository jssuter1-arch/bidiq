import { Router } from 'express';
import { z } from 'zod';
import { authenticateUser, loadOrgContext, requireRole, validateBody, auditLog } from '../middleware';
import { requireModuleAccess } from '../middleware/requireModuleAccess';
import { supabaseAdmin } from '../utils/supabase';
import { computeScenario, computeScenarioSensitivity } from '../services/scenario-calc-service';
import { computeUnderwriting } from '../services/underwriting-calc-service';
import { AuthenticatedRequest } from '../middleware/authenticateUser';

const router = Router();
const scenarioAccess = requireModuleAccess('scenario_modeling');
const readAccess = [authenticateUser, loadOrgContext, scenarioAccess];
const writeAccess = [authenticateUser, loadOrgContext, scenarioAccess, requireRole('project_manager')];

const ScenarioSchema = z.object({
  scenarioName: z.string().min(1),
  description: z.string().optional(),
  propertyId: z.string().uuid().optional(),
  dealId: z.string().uuid().optional(),
  isBaseline: z.boolean().optional(),
  isRecommended: z.boolean().optional(),
  unitsAffected: z.number().int().positive().optional(),
  scopeSummary: z.string().optional(),
  triggeredConstraints: z.array(z.string().uuid()).optional(),
  estimatedRenovationCost: z.number().nonnegative().default(0),
  preScenarioRentMonthly: z.number().nonnegative().default(0),
  postScenarioRentMonthly: z.number().nonnegative().default(0),
  capRate: z.number().min(0.001).max(0.5).default(0.06),
  discountRate: z.number().min(0).max(1).default(0.10),
  holdPeriodMonths: z.number().int().min(1).max(120).default(36),
  notes: z.string().optional(),
}).refine((d) => d.propertyId || d.dealId, {
  message: 'A scenario must be attached to a property or deal.',
});

const PatchScenarioSchema = z.object({
  scenarioName: z.string().min(1).optional(),
  description: z.string().optional(),
  isBaseline: z.boolean().optional(),
  isRecommended: z.boolean().optional(),
  unitsAffected: z.number().int().positive().optional(),
  scopeSummary: z.string().optional(),
  triggeredConstraints: z.array(z.string().uuid()).optional(),
  estimatedRenovationCost: z.number().nonnegative().optional(),
  preScenarioRentMonthly: z.number().nonnegative().optional(),
  postScenarioRentMonthly: z.number().nonnegative().optional(),
  capRate: z.number().min(0.001).max(0.5).optional(),
  discountRate: z.number().min(0).max(1).optional(),
  holdPeriodMonths: z.number().int().min(1).max(120).optional(),
  notes: z.string().optional(),
});

async function calcAndPersist(scenarioId: string, orgId: string, overrides?: Record<string, unknown>) {
  const { data: scenario } = await supabaseAdmin
    .from('scenario_models')
    .select('*')
    .eq('id', scenarioId)
    .eq('org_id', orgId)
    .single();

  if (!scenario) throw new Error('Scenario not found');

  const row = overrides ? { ...scenario, ...overrides } : scenario;
  const constraintIds: string[] = row.triggered_constraints ?? [];

  let activeConstraints: { id: string; triggered_cost_estimate: number | null; is_active: boolean }[] = [];
  if (constraintIds.length > 0) {
    const { data: cs } = await supabaseAdmin
      .from('regulatory_constraints')
      .select('id, triggered_cost_estimate, is_active')
      .in('id', constraintIds);
    activeConstraints = cs ?? [];
  }

  const results = computeScenario({
    estimated_renovation_cost: Number(row.estimated_renovation_cost ?? 0),
    pre_scenario_rent_monthly: Number(row.pre_scenario_rent_monthly ?? 0),
    post_scenario_rent_monthly: Number(row.post_scenario_rent_monthly ?? 0),
    cap_rate: Number(row.cap_rate ?? 0.06),
    discount_rate: Number(row.discount_rate ?? 0.10),
    hold_period_months: Number(row.hold_period_months ?? 36),
    triggered_constraints: constraintIds,
    active_constraints: activeConstraints,
  });

  const { data: updated, error } = await supabaseAdmin
    .from('scenario_models')
    .update({
      triggered_constraint_costs: results.triggered_constraint_costs,
      total_capital_required: results.total_capital_required,
      monthly_income_delta: results.monthly_income_delta,
      annual_income_delta: results.annual_income_delta,
      value_created: results.value_created,
      npv: results.npv,
      irr: results.irr,
      payback_months: results.payback_months,
      meets_hurdle: results.meets_hurdle,
      updated_at: new Date().toISOString(),
    })
    .eq('id', scenarioId)
    .select()
    .single();

  if (error) throw new Error(error.message);
  return updated;
}

// GET /api/v1/scenarios
router.get('/', ...readAccess, async (req: AuthenticatedRequest, res, next) => {
  try {
    const { propertyId, dealId, comparisonId, decisionStatus, search } = req.query as Record<string, string>;

    let q = supabaseAdmin
      .from('scenario_models')
      .select('*')
      .eq('org_id', req.orgId!);

    if (propertyId) q = q.eq('property_id', propertyId);
    if (dealId) q = q.eq('deal_id', dealId);
    if (search) q = q.ilike('scenario_name', `%${search}%`);

    // Filter by comparison membership via app-level join
    if (comparisonId) {
      const { data: comp } = await supabaseAdmin
        .from('scenario_path_comparisons')
        .select('scenario_ids')
        .eq('id', comparisonId)
        .eq('org_id', req.orgId!)
        .single();
      if (comp?.scenario_ids?.length) {
        q = q.in('id', comp.scenario_ids);
      } else {
        return res.json({ data: [] });
      }
    }

    const { data, error } = await q.order('created_at', { ascending: false });
    if (error) return res.status(500).json({ error: error.message });

    // Filter by decision status (linked to comparison decision state)
    let rows = data ?? [];
    if (decisionStatus) {
      // "decided" = scenario is in a comparison with selected_scenario_id
      // "open" = scenario is in a comparison without selected_scenario_id
      // Fetch comparisons for context
      const scenarioIds = rows.map((s) => s.id);
      if (scenarioIds.length > 0) {
        const { data: comps } = await supabaseAdmin
          .from('scenario_path_comparisons')
          .select('scenario_ids, selected_scenario_id')
          .eq('org_id', req.orgId!)
          .overlaps('scenario_ids', scenarioIds);

        const decidedIds = new Set<string>();
        const openIds = new Set<string>();
        for (const c of comps ?? []) {
          for (const sid of c.scenario_ids ?? []) {
            if (c.selected_scenario_id) decidedIds.add(sid);
            else openIds.add(sid);
          }
        }

        if (decisionStatus === 'decided') rows = rows.filter((s) => decidedIds.has(s.id));
        else if (decisionStatus === 'open') rows = rows.filter((s) => openIds.has(s.id));
        else if (decisionStatus === 'recommended') rows = rows.filter((s) => s.is_recommended);
      }
    }

    res.json({ data: rows });
  } catch (err) { next(err); }
});

// POST /api/v1/scenarios
router.post('/', ...writeAccess, validateBody(ScenarioSchema), auditLog('create', 'scenario_models'),
  async (req: AuthenticatedRequest, res, next) => {
    try {
      const b = req.body;

      // Enforce is_baseline uniqueness per attachment
      if (b.isBaseline) {
        await supabaseAdmin
          .from('scenario_models')
          .update({ is_baseline: false })
          .eq('org_id', req.orgId!)
          .match(b.propertyId ? { property_id: b.propertyId } : { deal_id: b.dealId })
          .eq('is_baseline', true);
      }

      if (b.isRecommended) {
        await supabaseAdmin
          .from('scenario_models')
          .update({ is_recommended: false })
          .eq('org_id', req.orgId!)
          .match(b.propertyId ? { property_id: b.propertyId } : { deal_id: b.dealId })
          .eq('is_recommended', true);
      }

      const { data: inserted, error: insertErr } = await supabaseAdmin
        .from('scenario_models')
        .insert({
          org_id: req.orgId!,
          property_id: b.propertyId ?? null,
          deal_id: b.dealId ?? null,
          scenario_name: b.scenarioName,
          description: b.description ?? null,
          is_baseline: b.isBaseline ?? false,
          is_recommended: b.isRecommended ?? false,
          units_affected: b.unitsAffected ?? null,
          scope_summary: b.scopeSummary ?? null,
          triggered_constraints: b.triggeredConstraints ?? [],
          estimated_renovation_cost: b.estimatedRenovationCost ?? 0,
          pre_scenario_rent_monthly: b.preScenarioRentMonthly ?? 0,
          post_scenario_rent_monthly: b.postScenarioRentMonthly ?? 0,
          cap_rate: b.capRate ?? 0.06,
          discount_rate: b.discountRate ?? 0.10,
          hold_period_months: b.holdPeriodMonths ?? 36,
          notes: b.notes ?? null,
          created_by: req.userId,
        })
        .select()
        .single();

      if (insertErr || !inserted) return res.status(400).json({ error: insertErr?.message });

      const full = await calcAndPersist(inserted.id, req.orgId!);
      res.status(201).json({ data: full });
    } catch (err) { next(err); }
  },
);

// GET /api/v1/scenarios/:id
router.get('/:id', ...readAccess, async (req: AuthenticatedRequest, res, next) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('scenario_models')
      .select('*')
      .eq('id', req.params.id)
      .eq('org_id', req.orgId!)
      .single();

    if (error || !data) return res.status(404).json({ error: 'Scenario not found' });
    res.json({ data });
  } catch (err) { next(err); }
});

// PATCH /api/v1/scenarios/:id
router.patch('/:id', ...writeAccess, validateBody(PatchScenarioSchema), auditLog('update', 'scenario_models'),
  async (req: AuthenticatedRequest, res, next) => {
    try {
      const { data: existing } = await supabaseAdmin
        .from('scenario_models')
        .select('id')
        .eq('id', req.params.id)
        .eq('org_id', req.orgId!)
        .single();

      if (!existing) return res.status(404).json({ error: 'Scenario not found' });

      // Check if scenario is locked (part of a decided comparison)
      const { data: decidedComp } = await supabaseAdmin
        .from('scenario_path_comparisons')
        .select('id, selected_scenario_id')
        .eq('org_id', req.orgId!)
        .contains('scenario_ids', [req.params.id])
        .not('selected_scenario_id', 'is', null)
        .limit(1)
        .maybeSingle();

      if (decidedComp) {
        return res.status(400).json({
          error: 'This scenario is locked — its comparison has a captured decision. Reopen the comparison first.',
        });
      }

      const b = req.body;
      const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
      if (b.scenarioName !== undefined) updates.scenario_name = b.scenarioName;
      if (b.description !== undefined) updates.description = b.description;
      if (b.isBaseline !== undefined) updates.is_baseline = b.isBaseline;
      if (b.isRecommended !== undefined) updates.is_recommended = b.isRecommended;
      if (b.unitsAffected !== undefined) updates.units_affected = b.unitsAffected;
      if (b.scopeSummary !== undefined) updates.scope_summary = b.scopeSummary;
      if (b.triggeredConstraints !== undefined) updates.triggered_constraints = b.triggeredConstraints;
      if (b.estimatedRenovationCost !== undefined) updates.estimated_renovation_cost = b.estimatedRenovationCost;
      if (b.preScenarioRentMonthly !== undefined) updates.pre_scenario_rent_monthly = b.preScenarioRentMonthly;
      if (b.postScenarioRentMonthly !== undefined) updates.post_scenario_rent_monthly = b.postScenarioRentMonthly;
      if (b.capRate !== undefined) updates.cap_rate = b.capRate;
      if (b.discountRate !== undefined) updates.discount_rate = b.discountRate;
      if (b.holdPeriodMonths !== undefined) updates.hold_period_months = b.holdPeriodMonths;
      if (b.notes !== undefined) updates.notes = b.notes;

      await supabaseAdmin
        .from('scenario_models')
        .update(updates)
        .eq('id', req.params.id);

      const full = await calcAndPersist(req.params.id, req.orgId!);
      res.json({ data: full });
    } catch (err) { next(err); }
  },
);

// DELETE /api/v1/scenarios/:id
router.delete('/:id', ...writeAccess, auditLog('delete', 'scenario_models'),
  async (req: AuthenticatedRequest, res, next) => {
    try {
      const { data: existing } = await supabaseAdmin
        .from('scenario_models')
        .select('id')
        .eq('id', req.params.id)
        .eq('org_id', req.orgId!)
        .single();

      if (!existing) return res.status(404).json({ error: 'Scenario not found' });

      // Remove from any comparison scenario_ids arrays
      const { data: comps } = await supabaseAdmin
        .from('scenario_path_comparisons')
        .select('id, scenario_ids')
        .eq('org_id', req.orgId!)
        .contains('scenario_ids', [req.params.id]);

      for (const comp of comps ?? []) {
        const newIds = (comp.scenario_ids ?? []).filter((id: string) => id !== req.params.id);
        await supabaseAdmin
          .from('scenario_path_comparisons')
          .update({ scenario_ids: newIds })
          .eq('id', comp.id);
      }

      await supabaseAdmin
        .from('scenario_models')
        .delete()
        .eq('id', req.params.id);

      res.status(204).send();
    } catch (err) { next(err); }
  },
);

// POST /api/v1/scenarios/:id/duplicate
router.post('/:id/duplicate', ...writeAccess,
  async (req: AuthenticatedRequest, res, next) => {
    try {
      const { data: src } = await supabaseAdmin
        .from('scenario_models')
        .select('*')
        .eq('id', req.params.id)
        .eq('org_id', req.orgId!)
        .single();

      if (!src) return res.status(404).json({ error: 'Scenario not found' });

      const { data: dup, error } = await supabaseAdmin
        .from('scenario_models')
        .insert({
          ...src,
          id: undefined,
          scenario_name: `${src.scenario_name} (Copy)`,
          is_baseline: false,
          is_recommended: false,
          created_by: req.userId,
          created_at: undefined,
          updated_at: undefined,
        })
        .select()
        .single();

      if (error || !dup) return res.status(400).json({ error: error?.message });
      const full = await calcAndPersist(dup.id, req.orgId!);
      res.status(201).json({ data: full });
    } catch (err) { next(err); }
  },
);

// POST /api/v1/scenarios/:id/sensitivity
router.post('/:id/sensitivity', ...readAccess, async (req: AuthenticatedRequest, res, next) => {
  try {
    const { data: scenario } = await supabaseAdmin
      .from('scenario_models')
      .select('*')
      .eq('id', req.params.id)
      .eq('org_id', req.orgId!)
      .single();

    if (!scenario) return res.status(404).json({ error: 'Scenario not found' });

    const constraintIds: string[] = scenario.triggered_constraints ?? [];
    let activeConstraints: { id: string; triggered_cost_estimate: number | null; is_active: boolean }[] = [];
    if (constraintIds.length > 0) {
      const { data: cs } = await supabaseAdmin
        .from('regulatory_constraints')
        .select('id, triggered_cost_estimate, is_active')
        .in('id', constraintIds);
      activeConstraints = cs ?? [];
    }

    const sensitivity = computeScenarioSensitivity({
      estimated_renovation_cost: Number(scenario.estimated_renovation_cost ?? 0),
      pre_scenario_rent_monthly: Number(scenario.pre_scenario_rent_monthly ?? 0),
      post_scenario_rent_monthly: Number(scenario.post_scenario_rent_monthly ?? 0),
      cap_rate: Number(scenario.cap_rate ?? 0.06),
      discount_rate: Number(scenario.discount_rate ?? 0.10),
      hold_period_months: Number(scenario.hold_period_months ?? 36),
      triggered_constraints: constraintIds,
      active_constraints: activeConstraints,
    });

    res.json({ data: sensitivity });
  } catch (err) { next(err); }
});

// POST /api/v1/scenarios/:id/apply-to-underwriting
router.post('/:id/apply-to-underwriting', ...writeAccess, requireRole('admin'),
  validateBody(z.object({
    dealId: z.string().uuid(),
    mode: z.enum(['new_version', 'update_active']),
  })),
  auditLog('update', 'deal_underwriting_models'),
  async (req: AuthenticatedRequest, res, next) => {
    try {
      const { data: scenario } = await supabaseAdmin
        .from('scenario_models')
        .select('*')
        .eq('id', req.params.id)
        .eq('org_id', req.orgId!)
        .single();

      if (!scenario) return res.status(404).json({ error: 'Scenario not found' });

      const { dealId, mode } = req.body;

      // Verify deal belongs to org
      const { data: deal } = await supabaseAdmin
        .from('acquisition_deals')
        .select('id, asking_price')
        .eq('id', dealId)
        .eq('org_id', req.orgId!)
        .single();

      if (!deal) return res.status(404).json({ error: 'Deal not found' });

      // Build underwriting inputs from scenario economics
      const uwInputs = {
        proposed_purchase_price: Number(deal.asking_price ?? 0),
        down_payment_pct: 0.25,
        estimated_renovation_cost: Number(scenario.total_capital_required ?? 0),
        projected_post_reno_rent_monthly: Number(scenario.post_scenario_rent_monthly ?? 0),
        current_rent_roll_monthly: Number(scenario.pre_scenario_rent_monthly ?? 0),
        exit_cap_rate: Number(scenario.cap_rate ?? 0.06),
        hold_period_months: Number(scenario.hold_period_months ?? 36),
        discount_rate: Number(scenario.discount_rate ?? 0.10),
      };
      const uwResults = computeUnderwriting(uwInputs);

      let uwId: string;

      if (mode === 'update_active') {
        // Update the active version
        const { data: active } = await supabaseAdmin
          .from('deal_underwriting_models')
          .select('id')
          .eq('deal_id', dealId)
          .eq('org_id', req.orgId!)
          .eq('is_active_version', true)
          .single();

        if (!active) return res.status(400).json({ error: 'No active underwriting model found for this deal.' });

        await supabaseAdmin
          .from('deal_underwriting_models')
          .update({
            estimated_renovation_cost: uwInputs.estimated_renovation_cost,
            projected_post_reno_rent_monthly: uwInputs.projected_post_reno_rent_monthly,
            exit_cap_rate: uwInputs.exit_cap_rate,
            hold_period_months: uwInputs.hold_period_months,
            discount_rate: uwInputs.discount_rate,
            irr: uwResults.irr,
            npv: uwResults.npv,
            equity_multiple: uwResults.equity_multiple,
            recommended_max_bid: uwResults.recommended_max_bid,
            meets_hurdle: uwResults.meets_hurdle,
            updated_at: new Date().toISOString(),
          })
          .eq('id', active.id);

        uwId = active.id;
      } else {
        // Create new version
        const { data: versions } = await supabaseAdmin
          .from('deal_underwriting_models')
          .select('version')
          .eq('deal_id', dealId)
          .eq('org_id', req.orgId!)
          .order('version', { ascending: false })
          .limit(1);

        const nextVersion = (versions?.[0]?.version ?? 0) + 1;

        // Demote current active
        await supabaseAdmin
          .from('deal_underwriting_models')
          .update({ is_active_version: false })
          .eq('deal_id', dealId)
          .eq('org_id', req.orgId!)
          .eq('is_active_version', true);

        const { data: newModel, error: newErr } = await supabaseAdmin
          .from('deal_underwriting_models')
          .insert({
            deal_id: dealId,
            org_id: req.orgId!,
            version: nextVersion,
            model_name: `Scenario: ${scenario.scenario_name}`,
            is_active_version: true,
            proposed_purchase_price: uwInputs.proposed_purchase_price,
            down_payment_pct: uwInputs.down_payment_pct,
            estimated_renovation_cost: uwInputs.estimated_renovation_cost,
            projected_post_reno_rent_monthly: uwInputs.projected_post_reno_rent_monthly,
            current_rent_roll_monthly: uwInputs.current_rent_roll_monthly,
            exit_cap_rate: uwInputs.exit_cap_rate,
            hold_period_months: uwInputs.hold_period_months,
            discount_rate: uwInputs.discount_rate,
            irr: uwResults.irr,
            npv: uwResults.npv,
            equity_multiple: uwResults.equity_multiple,
            recommended_max_bid: uwResults.recommended_max_bid,
            meets_hurdle: uwResults.meets_hurdle,
            created_by: req.userId,
          })
          .select('id')
          .single();

        if (newErr || !newModel) return res.status(400).json({ error: newErr?.message });
        uwId = newModel.id;
      }

      res.json({ data: { underwritingModelId: uwId } });
    } catch (err) { next(err); }
  },
);

export default router;
