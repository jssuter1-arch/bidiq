import { Router } from 'express';
import { z } from 'zod';
import { authenticateUser, loadOrgContext, requireRole, validateBody, auditLog } from '../middleware';
import { requireModuleAccess } from '../middleware/requireModuleAccess';
import { supabaseAdmin } from '../utils/supabase';
import { recordBudgetSnapshot } from '../services/budget-snapshot-service';
import { AuthenticatedRequest } from '../middleware/authenticateUser';

const router = Router();
const scenarioAccess = requireModuleAccess('scenario_modeling');
const readAccess = [authenticateUser, loadOrgContext, scenarioAccess];
const writeAccess = [authenticateUser, loadOrgContext, scenarioAccess, requireRole('project_manager')];
const adminAccess = [authenticateUser, loadOrgContext, scenarioAccess, requireRole('admin')];

const ComparisonSchema = z.object({
  comparisonName: z.string().min(1),
  scenarioIds: z.array(z.string().uuid()).min(2).max(4),
  propertyId: z.string().uuid().optional(),
  dealId: z.string().uuid().optional(),
}).refine((d) => d.propertyId || d.dealId, {
  message: 'Comparison must be attached to a property or deal.',
});

const PatchComparisonSchema = z.object({
  comparisonName: z.string().min(1).optional(),
  scenarioIds: z.array(z.string().uuid()).min(2).max(4).optional(),
});

const DecideSchema = z.object({
  selectedScenarioId: z.string().uuid(),
  decisionNotes: z.string().min(1),
  reasonCodes: z.array(z.string()).optional(),
});

const PromoteSchema = z.object({
  projectName: z.string().min(1),
  projectType: z.enum(['renovation', 'new_construction', 'repair', 'capital_improvement', 'unit_turn']).default('renovation'),
  initialBudget: z.number().nonnegative(),
  hasConstructionLoan: z.boolean().default(false),
  constructionLoanAmount: z.number().optional(),
  status: z.enum(['planning', 'active', 'on_hold', 'completed', 'cancelled']).default('planning'),
  propertyId: z.string().uuid(),
});

// GET /api/v1/scenario-comparisons
router.get('/', ...readAccess, async (req: AuthenticatedRequest, res, next) => {
  try {
    const { propertyId, dealId, decisionStatus } = req.query as Record<string, string>;

    let q = supabaseAdmin
      .from('scenario_path_comparisons')
      .select('*')
      .eq('org_id', req.orgId!);

    if (propertyId) q = q.eq('property_id', propertyId);
    if (dealId) q = q.eq('deal_id', dealId);
    if (decisionStatus === 'decided') q = q.not('selected_scenario_id', 'is', null);
    if (decisionStatus === 'open') q = q.is('selected_scenario_id', null);

    const { data, error } = await q.order('created_at', { ascending: false });
    if (error) return res.status(500).json({ error: error.message });
    res.json({ data: data ?? [] });
  } catch (err) { next(err); }
});

// POST /api/v1/scenario-comparisons
router.post('/', ...writeAccess, validateBody(ComparisonSchema), auditLog('create', 'scenario_path_comparisons'),
  async (req: AuthenticatedRequest, res, next) => {
    try {
      const b = req.body;

      // Verify all scenario IDs belong to this org
      const { data: scenarios, error: verifyErr } = await supabaseAdmin
        .from('scenario_models')
        .select('id')
        .eq('org_id', req.orgId!)
        .in('id', b.scenarioIds);

      if (verifyErr || (scenarios ?? []).length !== b.scenarioIds.length) {
        return res.status(400).json({ error: 'One or more scenario IDs are invalid.' });
      }

      const { data, error } = await supabaseAdmin
        .from('scenario_path_comparisons')
        .insert({
          org_id: req.orgId!,
          comparison_name: b.comparisonName,
          scenario_ids: b.scenarioIds,
          property_id: b.propertyId ?? null,
          deal_id: b.dealId ?? null,
          created_by: req.userId,
        })
        .select()
        .single();

      if (error || !data) return res.status(400).json({ error: error?.message });
      res.status(201).json({ data });
    } catch (err) { next(err); }
  },
);

// GET /api/v1/scenario-comparisons/:id
router.get('/:id', ...readAccess, async (req: AuthenticatedRequest, res, next) => {
  try {
    const { data: comp, error } = await supabaseAdmin
      .from('scenario_path_comparisons')
      .select('*')
      .eq('id', req.params.id)
      .eq('org_id', req.orgId!)
      .single();

    if (error || !comp) return res.status(404).json({ error: 'Comparison not found' });

    // Embed the member scenarios
    const { data: scenarios } = await supabaseAdmin
      .from('scenario_models')
      .select('*')
      .in('id', comp.scenario_ids ?? []);

    res.json({ data: { ...comp, scenarios: scenarios ?? [] } });
  } catch (err) { next(err); }
});

// PATCH /api/v1/scenario-comparisons/:id
router.patch('/:id', ...writeAccess, validateBody(PatchComparisonSchema), auditLog('update', 'scenario_path_comparisons'),
  async (req: AuthenticatedRequest, res, next) => {
    try {
      const { data: comp } = await supabaseAdmin
        .from('scenario_path_comparisons')
        .select('id, selected_scenario_id')
        .eq('id', req.params.id)
        .eq('org_id', req.orgId!)
        .single();

      if (!comp) return res.status(404).json({ error: 'Comparison not found' });
      if (comp.selected_scenario_id) {
        return res.status(400).json({ error: 'Cannot modify a comparison with a captured decision.' });
      }

      const b = req.body;
      const updates: Record<string, unknown> = {};
      if (b.comparisonName) updates.comparison_name = b.comparisonName;
      if (b.scenarioIds) updates.scenario_ids = b.scenarioIds;

      const { data, error } = await supabaseAdmin
        .from('scenario_path_comparisons')
        .update(updates)
        .eq('id', req.params.id)
        .select()
        .single();

      if (error) return res.status(400).json({ error: error.message });
      res.json({ data });
    } catch (err) { next(err); }
  },
);

// DELETE /api/v1/scenario-comparisons/:id
router.delete('/:id', ...writeAccess, auditLog('delete', 'scenario_path_comparisons'),
  async (req: AuthenticatedRequest, res, next) => {
    try {
      const { data: comp } = await supabaseAdmin
        .from('scenario_path_comparisons')
        .select('id')
        .eq('id', req.params.id)
        .eq('org_id', req.orgId!)
        .single();

      if (!comp) return res.status(404).json({ error: 'Comparison not found' });

      await supabaseAdmin
        .from('scenario_path_comparisons')
        .delete()
        .eq('id', req.params.id);

      res.status(204).send();
    } catch (err) { next(err); }
  },
);

// POST /api/v1/scenario-comparisons/:id/decide
router.post('/:id/decide', ...writeAccess, validateBody(DecideSchema), auditLog('approve', 'scenario_path_comparisons'),
  async (req: AuthenticatedRequest, res, next) => {
    try {
      const { data: comp } = await supabaseAdmin
        .from('scenario_path_comparisons')
        .select('id, scenario_ids, selected_scenario_id')
        .eq('id', req.params.id)
        .eq('org_id', req.orgId!)
        .single();

      if (!comp) return res.status(404).json({ error: 'Comparison not found' });
      if (comp.selected_scenario_id) {
        return res.status(400).json({ error: 'A decision has already been captured. Reopen the comparison first.' });
      }

      const { selectedScenarioId, decisionNotes, reasonCodes } = req.body;

      if (!(comp.scenario_ids ?? []).includes(selectedScenarioId)) {
        return res.status(400).json({ error: 'The selected scenario is not part of this comparison.' });
      }

      const { data, error } = await supabaseAdmin
        .from('scenario_path_comparisons')
        .update({
          selected_scenario_id: selectedScenarioId,
          decision_made_at: new Date().toISOString(),
          decision_made_by: req.userId,
          decision_notes: decisionNotes,
        })
        .eq('id', req.params.id)
        .select()
        .single();

      if (error) return res.status(400).json({ error: error.message });

      // Store reason codes in audit log (they're not in the schema, so we use notes)
      // They're captured as part of the decision_notes payload on the client side.

      res.json({ data });
    } catch (err) { next(err); }
  },
);

// POST /api/v1/scenario-comparisons/:id/reopen
router.post('/:id/reopen', ...adminAccess, auditLog('update', 'scenario_path_comparisons'),
  async (req: AuthenticatedRequest, res, next) => {
    try {
      const { data: comp } = await supabaseAdmin
        .from('scenario_path_comparisons')
        .select('id, selected_scenario_id, comparison_name')
        .eq('id', req.params.id)
        .eq('org_id', req.orgId!)
        .single();

      if (!comp) return res.status(404).json({ error: 'Comparison not found' });
      if (!comp.selected_scenario_id) {
        return res.status(400).json({ error: 'Comparison has no captured decision to reopen.' });
      }

      const { data, error } = await supabaseAdmin
        .from('scenario_path_comparisons')
        .update({
          selected_scenario_id: null,
          decision_made_at: null,
          decision_made_by: null,
          decision_notes: null,
        })
        .eq('id', req.params.id)
        .select()
        .single();

      if (error) return res.status(400).json({ error: error.message });
      res.json({ data });
    } catch (err) { next(err); }
  },
);

// POST /api/v1/scenario-comparisons/:id/promote-to-project
router.post('/:id/promote-to-project', ...adminAccess, validateBody(PromoteSchema),
  auditLog('create', 'projects'),
  async (req: AuthenticatedRequest, res, next) => {
    try {
      const { data: comp } = await supabaseAdmin
        .from('scenario_path_comparisons')
        .select('*')
        .eq('id', req.params.id)
        .eq('org_id', req.orgId!)
        .single();

      if (!comp) return res.status(404).json({ error: 'Comparison not found' });
      if (!comp.selected_scenario_id) {
        return res.status(400).json({ error: 'Comparison must have a captured decision before promotion.' });
      }

      const { data: scenario } = await supabaseAdmin
        .from('scenario_models')
        .select('*')
        .eq('id', comp.selected_scenario_id)
        .eq('org_id', req.orgId!)
        .single();

      if (!scenario) return res.status(404).json({ error: 'Selected scenario not found.' });

      const b = req.body;

      // Verify the property belongs to this org
      const { data: property } = await supabaseAdmin
        .from('properties')
        .select('id')
        .eq('id', b.propertyId)
        .eq('org_id', req.orgId!)
        .single();

      if (!property) return res.status(400).json({ error: 'Property not found.' });

      // Insert project — skipPhase3Hook prevents duplicate project_created snapshot
      const { data: project, error: projErr } = await supabaseAdmin
        .from('projects')
        .insert({
          org_id: req.orgId!,
          property_id: b.propertyId,
          name: b.projectName ?? `${scenario.scenario_name} — Decision`,
          status: b.status ?? 'planning',
          project_type: b.projectType ?? 'renovation',
          initial_budget: b.initialBudget,
          current_budget: b.initialBudget,
          has_construction_loan: b.hasConstructionLoan ?? false,
          loan_amount: b.constructionLoanAmount ?? null,
          created_by: req.userId,
        })
        .select()
        .single();

      if (projErr || !project) return res.status(400).json({ error: projErr?.message });

      // Seed the initial budget snapshot
      await recordBudgetSnapshot({
        projectId: project.id,
        orgId: req.orgId!,
        snapshotType: 'manual',
        budgetTotal: b.initialBudget,
        actualSpendAtSnapshot: 0,
        changeOrderTotalAtSnapshot: 0,
        triggeredByEvent: 'scenario_promotion',
        triggeredByUser: req.userId,
        notes: `Project budget seeded from scenario decision: ${comp.comparison_name} → ${scenario.scenario_name}.`,
        markCurrent: true,
      });

      res.status(201).json({ data: { projectId: project.id } });
    } catch (err) { next(err); }
  },
);

export default router;
