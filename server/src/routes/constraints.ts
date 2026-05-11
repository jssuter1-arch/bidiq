import { Router } from 'express';
import { z } from 'zod';
import { authenticateUser, loadOrgContext, requireRole, validateBody, auditLog } from '../middleware';
import { requireModuleAccess } from '../middleware/requireModuleAccess';
import { supabaseAdmin } from '../utils/supabase';
import { AuthenticatedRequest } from '../middleware/authenticateUser';

const router = Router();
const auth = [authenticateUser, loadOrgContext];
const scenarioAccess = requireModuleAccess('scenario_modeling');
const writeAccess = [authenticateUser, loadOrgContext, scenarioAccess, requireRole('project_manager')];
const readAccess = [authenticateUser, loadOrgContext, scenarioAccess];

const CONSTRAINT_TYPES = [
  'zoning_use', 'unit_count_cap', 'bedroom_count_cap', 'fire_code_trigger',
  'historic_district', 'parking_minimum', 'height_limit', 'setback', 'other',
] as const;

const ConstraintSchema = z.object({
  constraintType: z.enum(CONSTRAINT_TYPES),
  description: z.string().min(1),
  triggerThreshold: z.string().optional(),
  triggeredCostEstimate: z.number().nonnegative().optional(),
  source: z.string().optional(),
  sourceDate: z.string().optional(),
  propertyId: z.string().uuid().optional(),
  dealId: z.string().uuid().optional(),
  notes: z.string().optional(),
  isActive: z.boolean().optional(),
}).refine((d) => d.propertyId || d.dealId, {
  message: 'A constraint must be attached to a property or deal.',
});

// GET /api/v1/constraints
router.get('/', ...readAccess, async (req: AuthenticatedRequest, res, next) => {
  try {
    const { propertyId, dealId, type, isActive } = req.query as Record<string, string>;

    let q = supabaseAdmin
      .from('regulatory_constraints')
      .select('*')
      .eq('org_id', req.orgId!);

    if (propertyId) q = q.eq('property_id', propertyId);
    if (dealId) q = q.eq('deal_id', dealId);
    if (type) q = q.eq('constraint_type', type);
    if (isActive !== undefined) q = q.eq('is_active', isActive === 'true');

    const { data, error } = await q.order('created_at', { ascending: false });
    if (error) return res.status(500).json({ error: error.message });
    res.json({ data: data ?? [] });
  } catch (err) { next(err); }
});

// POST /api/v1/constraints
router.post('/', ...writeAccess, validateBody(ConstraintSchema), auditLog('create', 'regulatory_constraints'),
  async (req: AuthenticatedRequest, res, next) => {
    try {
      const b = req.body;
      const { data, error } = await supabaseAdmin
        .from('regulatory_constraints')
        .insert({
          org_id: req.orgId!,
          property_id: b.propertyId ?? null,
          deal_id: b.dealId ?? null,
          constraint_type: b.constraintType,
          description: b.description,
          trigger_threshold: b.triggerThreshold ?? null,
          triggered_cost_estimate: b.triggeredCostEstimate ?? null,
          source: b.source ?? null,
          source_date: b.sourceDate ?? null,
          notes: b.notes ?? null,
          is_active: b.isActive ?? true,
          created_by: req.userId,
        })
        .select()
        .single();

      if (error) return res.status(400).json({ error: error.message });
      res.status(201).json({ data });
    } catch (err) { next(err); }
  },
);

// GET /api/v1/constraints/:id
router.get('/:id', ...readAccess, async (req: AuthenticatedRequest, res, next) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('regulatory_constraints')
      .select('*')
      .eq('id', req.params.id)
      .eq('org_id', req.orgId!)
      .single();

    if (error || !data) return res.status(404).json({ error: 'Constraint not found' });
    res.json({ data });
  } catch (err) { next(err); }
});

const PatchConstraintSchema = z.object({
  constraintType: z.enum(CONSTRAINT_TYPES).optional(),
  description: z.string().min(1).optional(),
  triggerThreshold: z.string().optional(),
  triggeredCostEstimate: z.number().nonnegative().nullable().optional(),
  source: z.string().optional(),
  sourceDate: z.string().optional(),
  notes: z.string().optional(),
  isActive: z.boolean().optional(),
});

// PATCH /api/v1/constraints/:id
router.patch('/:id', ...writeAccess, validateBody(PatchConstraintSchema), auditLog('update', 'regulatory_constraints'),
  async (req: AuthenticatedRequest, res, next) => {
    try {
      const b = req.body;

      const { data: existing, error: fetchErr } = await supabaseAdmin
        .from('regulatory_constraints')
        .select('id, triggered_cost_estimate, is_active')
        .eq('id', req.params.id)
        .eq('org_id', req.orgId!)
        .single();

      if (fetchErr || !existing) return res.status(404).json({ error: 'Constraint not found' });

      const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
      if (b.constraintType !== undefined) updates.constraint_type = b.constraintType;
      if (b.description !== undefined) updates.description = b.description;
      if (b.triggerThreshold !== undefined) updates.trigger_threshold = b.triggerThreshold;
      if (b.triggeredCostEstimate !== undefined) updates.triggered_cost_estimate = b.triggeredCostEstimate;
      if (b.source !== undefined) updates.source = b.source;
      if (b.sourceDate !== undefined) updates.source_date = b.sourceDate;
      if (b.notes !== undefined) updates.notes = b.notes;
      if (b.isActive !== undefined) updates.is_active = b.isActive;

      const { data, error } = await supabaseAdmin
        .from('regulatory_constraints')
        .update(updates)
        .eq('id', req.params.id)
        .eq('org_id', req.orgId!)
        .select()
        .single();

      if (error) return res.status(400).json({ error: error.message });

      // If cost or active status changed, enqueue recalculation for dependent scenarios.
      const costChanged = b.triggeredCostEstimate !== undefined &&
        Number(b.triggeredCostEstimate) !== Number(existing.triggered_cost_estimate);
      const activeChanged = b.isActive !== undefined && b.isActive !== existing.is_active;

      if (costChanged || activeChanged) {
        await enqueueScenarioRecalc(req.params.id, req.orgId!);
      }

      res.json({ data });
    } catch (err) { next(err); }
  },
);

// DELETE /api/v1/constraints/:id (soft delete via is_active = false)
router.delete('/:id', ...writeAccess, auditLog('delete', 'regulatory_constraints'),
  async (req: AuthenticatedRequest, res, next) => {
    try {
      const { data: existing } = await supabaseAdmin
        .from('regulatory_constraints')
        .select('id')
        .eq('id', req.params.id)
        .eq('org_id', req.orgId!)
        .single();

      if (!existing) return res.status(404).json({ error: 'Constraint not found' });

      await supabaseAdmin
        .from('regulatory_constraints')
        .update({ is_active: false, updated_at: new Date().toISOString() })
        .eq('id', req.params.id);

      // Enqueue recalc for dependent scenarios since they may reference this constraint.
      await enqueueScenarioRecalc(req.params.id, req.orgId!);

      res.status(204).send();
    } catch (err) { next(err); }
  },
);

// Enqueue recalc rows for every scenario that references this constraint.
async function enqueueScenarioRecalc(constraintId: string, orgId: string) {
  try {
    // Find scenarios that include this constraint in their triggered_constraints array.
    const { data: scenarios } = await supabaseAdmin
      .from('scenario_models')
      .select('id')
      .eq('org_id', orgId)
      .contains('triggered_constraints', [constraintId]);

    if (!scenarios || scenarios.length === 0) return;

    const rows = scenarios.map((s) => ({
      org_id: orgId,
      scenario_id: s.id,
      triggered_by_constraint_id: constraintId,
      status: 'pending',
    }));

    // Upsert — UNIQUE constraint on (scenario_id, constraint_id, status) prevents duplicates.
    await supabaseAdmin
      .from('scenario_recalc_queue')
      .upsert(rows, { onConflict: 'scenario_id,triggered_by_constraint_id,status', ignoreDuplicates: true });
  } catch (err) {
    console.error('[constraints] Failed to enqueue scenario recalc:', err);
  }
}

export { enqueueScenarioRecalc };
export default router;
