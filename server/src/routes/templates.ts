import { Router } from 'express';
import { z } from 'zod';
import { authenticateUser, loadOrgContext, requireRole, validateBody, auditLog } from '../middleware';
import { supabaseAdmin } from '../utils/supabase';
import { requireModuleAccess } from '../middleware/requireModuleAccess';
import { AuthenticatedRequest } from '../middleware/authenticateUser';
import { applyTemplate } from '../services/template-application-service';

const router = Router();
const auth = [authenticateUser, loadOrgContext, requireModuleAccess('cost_intelligence_extended')];

const TemplateSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  property_type: z.string().optional(),
  renovation_scope: z.enum(['light', 'moderate', 'heavy', 'gut_rehab']).optional(),
  is_active: z.boolean().optional(),
});

const TemplateItemSchema = z.object({
  category: z.string().min(1),
  subcategory: z.string().optional(),
  description: z.string().optional(),
  unit_basis: z.enum(['per_unit', 'per_sqft', 'flat', 'per_linear_ft']),
  unit_cost: z.number().nonnegative(),
  notes: z.string().optional(),
  sort_order: z.number().int().optional(),
});

const ApplyTemplateSchema = z.object({
  propertyId: z.string().uuid(),
  useOrgBenchmarks: z.boolean().optional().default(false),
  unitScopes: z.array(z.object({
    unitId: z.string().uuid(),
    categories: z.array(z.string()),
    overrides: z.record(z.number()).optional().default({}),
  })).optional().default([]),
  propertyLevelScopes: z.array(z.object({
    category: z.string(),
    sqft: z.number().nonnegative().optional(),
    notes: z.string().optional(),
  })).optional().default([]),
  usedInProjectId: z.string().uuid().optional(),
  usedInScenarioId: z.string().uuid().optional(),
});

// List templates
router.get('/', ...auth, async (req: AuthenticatedRequest, res, next) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('pricing_templates')
      .select('*, pricing_template_items(count)')
      .eq('org_id', req.orgId!)
      .order('name');
    if (error) return res.status(400).json({ error: error.message });
    res.json({ data });
  } catch (err) { next(err); }
});

// Get single template with items
router.get('/:id', ...auth, async (req: AuthenticatedRequest, res, next) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('pricing_templates')
      .select('*, pricing_template_items(*), pricing_template_uses(count)')
      .eq('id', req.params.id)
      .eq('org_id', req.orgId!)
      .single();
    if (error || !data) return res.status(404).json({ error: 'Not found' });

    // Attach benchmark comparison
    const { data: benchmarks } = await supabaseAdmin
      .from('cost_benchmarks')
      .select('category, avg_cost, p25_cost, p75_cost, sample_count')
      .eq('org_id', req.orgId!);

    const benchmarkMap = new Map((benchmarks ?? []).map((b: any) => [b.category, b]));
    const itemsWithComparison = ((data as any).pricing_template_items ?? []).map((item: any) => ({
      ...item,
      benchmark: benchmarkMap.get(item.category) ?? null,
    }));

    res.json({ data: { ...(data as any), pricing_template_items: itemsWithComparison } });
  } catch (err) { next(err); }
});

// Create template
router.post('/', ...auth, requireRole('project_manager'), validateBody(TemplateSchema), auditLog('create', 'pricing_templates'), async (req: AuthenticatedRequest, res, next) => {
  try {
    const body = req.body;
    const { data, error } = await supabaseAdmin
      .from('pricing_templates')
      .insert({ ...body, org_id: req.orgId!, created_by: req.userId })
      .select()
      .single();
    if (error) return res.status(400).json({ error: error.message });
    res.status(201).json({ data });
  } catch (err) { next(err); }
});

// Update template
router.patch('/:id', ...auth, requireRole('project_manager'), validateBody(TemplateSchema.partial()), auditLog('update', 'pricing_templates'), async (req: AuthenticatedRequest, res, next) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('pricing_templates')
      .update({ ...req.body, updated_at: new Date().toISOString() })
      .eq('id', req.params.id)
      .eq('org_id', req.orgId!)
      .select()
      .single();
    if (error || !data) return res.status(404).json({ error: 'Not found' });
    res.json({ data });
  } catch (err) { next(err); }
});

// Delete template
router.delete('/:id', ...auth, requireRole('admin'), auditLog('delete', 'pricing_templates'), async (req: AuthenticatedRequest, res, next) => {
  try {
    const { error } = await supabaseAdmin
      .from('pricing_templates')
      .delete()
      .eq('id', req.params.id)
      .eq('org_id', req.orgId!);
    if (error) return res.status(400).json({ error: error.message });
    res.status(204).end();
  } catch (err) { next(err); }
});

// Duplicate template
router.post('/:id/duplicate', ...auth, requireRole('project_manager'), auditLog('create', 'pricing_templates'), async (req: AuthenticatedRequest, res, next) => {
  try {
    const { data: source, error: srcErr } = await supabaseAdmin
      .from('pricing_templates')
      .select('*, pricing_template_items(*)')
      .eq('id', req.params.id)
      .eq('org_id', req.orgId!)
      .single();
    if (srcErr || !source) return res.status(404).json({ error: 'Not found' });

    const { data: copy, error: copyErr } = await supabaseAdmin
      .from('pricing_templates')
      .insert({
        org_id: req.orgId!,
        name: `${(source as any).name} (Copy)`,
        description: (source as any).description,
        property_type: (source as any).property_type,
        renovation_scope: (source as any).renovation_scope,
        is_active: true,
        created_by: req.userId,
      })
      .select()
      .single();
    if (copyErr || !copy) return res.status(400).json({ error: copyErr?.message ?? 'Duplicate failed' });

    const items = ((source as any).pricing_template_items ?? []).map((item: any) => ({
      org_id: req.orgId!,
      template_id: (copy as any).id,
      category: item.category,
      subcategory: item.subcategory,
      description: item.description,
      unit_basis: item.unit_basis,
      unit_cost: item.unit_cost,
      notes: item.notes,
      sort_order: item.sort_order,
    }));

    if (items.length > 0) {
      await supabaseAdmin.from('pricing_template_items').insert(items);
    }

    res.status(201).json({ data: copy });
  } catch (err) { next(err); }
});

// Apply template → returns draft line items (does NOT write to DB)
router.post('/:id/apply', ...auth, requireRole('analyst'), validateBody(ApplyTemplateSchema), async (req: AuthenticatedRequest, res, next) => {
  try {
    const body = req.body;
    const result = await applyTemplate({
      propertyId: body.propertyId,
      orgId: req.orgId!,
      templateId: req.params.id,
      useOrgBenchmarks: body.useOrgBenchmarks,
      unitScopes: body.unitScopes,
      propertyLevelScopes: body.propertyLevelScopes,
    });

    // Record usage if caller provided a project or scenario context
    if (body.usedInProjectId || body.usedInScenarioId) {
      await supabaseAdmin.from('pricing_template_uses').insert({
        org_id: req.orgId!,
        template_id: req.params.id,
        used_in_project_id: body.usedInProjectId ?? null,
        used_in_scenario_id: body.usedInScenarioId ?? null,
        used_by: req.userId,
      });
    }

    res.json(result);
  } catch (err) { next(err); }
});

// Template items CRUD
router.post('/:id/items', ...auth, requireRole('project_manager'), validateBody(TemplateItemSchema), auditLog('create', 'pricing_template_items'), async (req: AuthenticatedRequest, res, next) => {
  try {
    const { data: tmpl } = await supabaseAdmin
      .from('pricing_templates')
      .select('id')
      .eq('id', req.params.id)
      .eq('org_id', req.orgId!)
      .single();
    if (!tmpl) return res.status(404).json({ error: 'Template not found' });

    const { data, error } = await supabaseAdmin
      .from('pricing_template_items')
      .insert({ ...req.body, template_id: req.params.id, org_id: req.orgId! })
      .select()
      .single();
    if (error) return res.status(400).json({ error: error.message });
    res.status(201).json({ data });
  } catch (err) { next(err); }
});

router.patch('/:id/items/:itemId', ...auth, requireRole('project_manager'), validateBody(TemplateItemSchema.partial()), auditLog('update', 'pricing_template_items'), async (req: AuthenticatedRequest, res, next) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('pricing_template_items')
      .update(req.body)
      .eq('id', req.params.itemId)
      .eq('template_id', req.params.id)
      .eq('org_id', req.orgId!)
      .select()
      .single();
    if (error || !data) return res.status(404).json({ error: 'Not found' });
    res.json({ data });
  } catch (err) { next(err); }
});

router.delete('/:id/items/:itemId', ...auth, requireRole('project_manager'), auditLog('delete', 'pricing_template_items'), async (req: AuthenticatedRequest, res, next) => {
  try {
    const { error } = await supabaseAdmin
      .from('pricing_template_items')
      .delete()
      .eq('id', req.params.itemId)
      .eq('template_id', req.params.id)
      .eq('org_id', req.orgId!);
    if (error) return res.status(400).json({ error: error.message });
    res.status(204).end();
  } catch (err) { next(err); }
});

export default router;
