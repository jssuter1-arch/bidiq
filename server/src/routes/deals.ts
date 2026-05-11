import { Router } from 'express';
import { z } from 'zod';
import {
  authenticateUser, loadOrgContext, requireRole,
  requireModuleAccess, validateBody, auditLog,
} from '../middleware';
import { supabaseAdmin } from '../utils/supabase';
import { recordBudgetSnapshot } from '../services/budget-snapshot-service';
import { AuthenticatedRequest } from '../middleware/authenticateUser';

const router = Router();
const auth = [authenticateUser, loadOrgContext];
const dealAccess = [authenticateUser, loadOrgContext, requireModuleAccess('deal_intelligence')];
const writeAccess = [authenticateUser, loadOrgContext, requireModuleAccess('deal_intelligence'), requireRole('project_manager')];

const VALID_STATUSES = ['prospecting','underwriting','loi_submitted','under_negotiation','due_diligence','closed_won','closed_lost','passed'] as const;
const VALID_TRANSITIONS: Record<string, string[]> = {
  prospecting:       ['underwriting','passed'],
  underwriting:      ['prospecting','loi_submitted','passed'],
  loi_submitted:     ['under_negotiation','passed'],
  under_negotiation: ['due_diligence','closed_lost','passed'],
  due_diligence:     ['closed_won','closed_lost'],
  closed_won:        [],
  closed_lost:       [],
  passed:            ['prospecting'],
};

const DealSchema = z.object({
  dealName:          z.string().min(1),
  source:            z.enum(['broker_om','off_market','referral','public_listing','other']).optional(),
  sourceContactName: z.string().optional(),
  sourceContactEmail:z.string().optional(),
  sourceContactPhone:z.string().optional(),
  streetAddress:     z.string().optional(),
  city:              z.string().optional(),
  state:             z.string().optional(),
  zip:               z.string().optional(),
  propertyType:      z.enum(['residential','commercial','mixed_use']).optional(),
  totalUnits:        z.number().int().positive().optional(),
  totalSqft:         z.number().positive().optional(),
  askingPrice:       z.number().nonnegative().optional(),
  expectedCloseDate: z.string().optional(),
  notes:             z.string().optional(),
});

const StatusSchema = z.object({
  to:               z.enum(VALID_STATUSES),
  closed_lost_reason: z.string().optional(),
});

const PromoteSchema = z.object({
  propertyName:          z.string().min(1),
  propertyStatus:        z.string().default('active'),
  createInitialProject:  z.boolean().default(false),
  projectName:           z.string().optional(),
  projectType:           z.string().optional(),
  initialBudget:         z.number().nonnegative().optional(),
  hasConstructionLoan:   z.boolean().optional(),
  constructionLoanAmount:z.number().optional(),
});

// GET /api/v1/deals
router.get('/', ...dealAccess, async (req: AuthenticatedRequest, res, next) => {
  try {
    const { status, source, search, from, to, page = '1', limit = '50' } = req.query as Record<string, string>;
    const pageNum = Math.max(1, parseInt(page));
    const pageSize = Math.min(100, parseInt(limit));
    const offset = (pageNum - 1) * pageSize;

    let q = supabaseAdmin
      .from('acquisition_deals')
      .select(`
        *,
        active_model:deal_underwriting_models!inner(
          id, version, model_name, is_active_version, irr, npv, equity_multiple,
          recommended_max_bid, meets_hurdle, proposed_purchase_price
        )
      `, { count: 'exact' })
      .eq('org_id', req.orgId!)
      .eq('deal_underwriting_models.is_active_version', true);

    if (status) q = q.eq('status', status);
    if (source) q = q.eq('source', source);
    if (search) q = q.or(`deal_name.ilike.%${search}%,street_address.ilike.%${search}%`);
    if (from) q = q.gte('created_at', from);
    if (to) q = q.lte('created_at', to);

    const { data, error, count } = await q.order('created_at', { ascending: false }).range(offset, offset + pageSize - 1);
    if (error) return res.status(400).json({ error: error.message });
    res.json({ data, meta: { page: pageNum, limit: pageSize, total: count } });
  } catch (err) { next(err); }
});

// GET /api/v1/deals/:id
router.get('/:id', ...dealAccess, async (req: AuthenticatedRequest, res, next) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('acquisition_deals')
      .select(`
        *,
        deal_underwriting_models(*),
        regulatory_constraints(*),
        property_documents(*)
      `)
      .eq('id', req.params.id)
      .eq('org_id', req.orgId!)
      .single();
    if (error || !data) return res.status(404).json({ error: 'Deal not found' });
    res.json({ data });
  } catch (err) { next(err); }
});

// POST /api/v1/deals
router.post('/', ...writeAccess, validateBody(DealSchema), auditLog('create', 'acquisition_deals'), async (req: AuthenticatedRequest, res, next) => {
  try {
    const b = req.body;
    const { data, error } = await supabaseAdmin
      .from('acquisition_deals')
      .insert({
        org_id: req.orgId,
        deal_name: b.dealName,
        source: b.source,
        source_contact_name: b.sourceContactName,
        source_contact_email: b.sourceContactEmail,
        source_contact_phone: b.sourceContactPhone,
        street_address: b.streetAddress,
        city: b.city,
        state: b.state,
        zip: b.zip,
        property_type: b.propertyType,
        total_units: b.totalUnits,
        total_sqft: b.totalSqft,
        asking_price: b.askingPrice,
        expected_close_date: b.expectedCloseDate,
        notes: b.notes,
        created_by: req.userId,
      })
      .select().single();
    if (error) return res.status(400).json({ error: error.message });
    res.status(201).json({ data });
  } catch (err) { next(err); }
});

// PATCH /api/v1/deals/:id
router.patch('/:id', ...writeAccess, validateBody(DealSchema.partial()), auditLog('update', 'acquisition_deals'), async (req: AuthenticatedRequest, res, next) => {
  try {
    const b = req.body;
    const patch: Record<string, unknown> = {};
    if (b.dealName !== undefined) patch.deal_name = b.dealName;
    if (b.source !== undefined) patch.source = b.source;
    if (b.sourceContactName !== undefined) patch.source_contact_name = b.sourceContactName;
    if (b.sourceContactEmail !== undefined) patch.source_contact_email = b.sourceContactEmail;
    if (b.sourceContactPhone !== undefined) patch.source_contact_phone = b.sourceContactPhone;
    if (b.streetAddress !== undefined) patch.street_address = b.streetAddress;
    if (b.city !== undefined) patch.city = b.city;
    if (b.state !== undefined) patch.state = b.state;
    if (b.zip !== undefined) patch.zip = b.zip;
    if (b.propertyType !== undefined) patch.property_type = b.propertyType;
    if (b.totalUnits !== undefined) patch.total_units = b.totalUnits;
    if (b.totalSqft !== undefined) patch.total_sqft = b.totalSqft;
    if (b.askingPrice !== undefined) patch.asking_price = b.askingPrice;
    if (b.expectedCloseDate !== undefined) patch.expected_close_date = b.expectedCloseDate;
    if (b.notes !== undefined) patch.notes = b.notes;
    patch.updated_at = new Date().toISOString();

    const { data, error } = await supabaseAdmin
      .from('acquisition_deals')
      .update(patch)
      .eq('id', req.params.id)
      .eq('org_id', req.orgId!)
      .select().single();
    if (error || !data) return res.status(404).json({ error: error?.message || 'Not found' });
    res.json({ data });
  } catch (err) { next(err); }
});

// DELETE /api/v1/deals/:id
router.delete('/:id', ...writeAccess, requireRole('admin'), auditLog('delete', 'acquisition_deals'), async (req: AuthenticatedRequest, res, next) => {
  try {
    const { error } = await supabaseAdmin
      .from('acquisition_deals')
      .delete()
      .eq('id', req.params.id)
      .eq('org_id', req.orgId!);
    if (error) return res.status(400).json({ error: error.message });
    res.json({ data: { deleted: true } });
  } catch (err) { next(err); }
});

// PATCH /api/v1/deals/:id/status
router.patch('/:id/status', ...writeAccess, validateBody(StatusSchema), auditLog('update', 'acquisition_deals'), async (req: AuthenticatedRequest, res, next) => {
  try {
    const { to, closed_lost_reason } = req.body;

    const { data: deal, error: fetchErr } = await supabaseAdmin
      .from('acquisition_deals')
      .select('status')
      .eq('id', req.params.id)
      .eq('org_id', req.orgId!)
      .single();
    if (fetchErr || !deal) return res.status(404).json({ error: 'Deal not found' });

    const allowed = VALID_TRANSITIONS[deal.status] ?? [];
    if (!allowed.includes(to)) {
      return res.status(400).json({
        error: true,
        code: 'INVALID_STATUS_TRANSITION',
        message: `Cannot move from '${deal.status}' to '${to}'.`,
      });
    }

    if (to === 'closed_lost' && !closed_lost_reason) {
      return res.status(400).json({ error: 'closed_lost_reason is required when marking a deal as lost.' });
    }

    const patch: Record<string, unknown> = {
      status: to,
      status_changed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    if (to === 'closed_lost') patch.closed_lost_reason = closed_lost_reason;
    if (to === 'closed_won') patch.actual_close_date = new Date().toISOString().slice(0, 10);

    const { data, error } = await supabaseAdmin
      .from('acquisition_deals')
      .update(patch)
      .eq('id', req.params.id)
      .select().single();
    if (error) return res.status(400).json({ error: error.message });
    res.json({ data });
  } catch (err) { next(err); }
});

// POST /api/v1/deals/:id/promote
router.post('/:id/promote', ...writeAccess, requireRole('admin'), validateBody(PromoteSchema), async (req: AuthenticatedRequest, res, next) => {
  try {
    const dealId = req.params.id;
    const b = req.body;

    // 1. Verify deal is closed_won and not already promoted
    const { data: deal, error: fetchErr } = await supabaseAdmin
      .from('acquisition_deals')
      .select('*, deal_underwriting_models(*)')
      .eq('id', dealId)
      .eq('org_id', req.orgId!)
      .single();
    if (fetchErr || !deal) return res.status(404).json({ error: 'Deal not found' });
    if (deal.status !== 'closed_won') return res.status(400).json({ error: 'Deal must be closed_won to promote.' });
    if (deal.promoted_to_property_id) return res.status(400).json({ error: 'Deal has already been promoted.' });

    const activeModel = (deal.deal_underwriting_models || []).find((m: any) => m.is_active_version);

    // 2. Create property
    const { data: property, error: propErr } = await supabaseAdmin
      .from('properties')
      .insert({
        org_id: req.orgId,
        name: b.propertyName,
        address: deal.street_address || '',
        city: deal.city || '',
        state: deal.state || '',
        zip: deal.zip || '',
        property_type: deal.property_type === 'residential' ? 'multi_family'
          : deal.property_type === 'commercial' ? 'commercial'
          : deal.property_type === 'mixed_use' ? 'mixed_use' : 'multi_family',
        status: 'active',
        unit_count: deal.total_units || 1,
        purchase_price: activeModel?.proposed_purchase_price ?? deal.asking_price,
        purchase_date: deal.actual_close_date || new Date().toISOString().slice(0, 10),
        created_by: req.userId,
      })
      .select().single();
    if (propErr || !property) return res.status(500).json({ error: propErr?.message || 'Failed to create property' });

    // 3. Optionally create project + initial budget snapshot
    let projectId: string | null = null;
    if (b.createInitialProject) {
      const { data: project, error: projErr } = await supabaseAdmin
        .from('projects')
        .insert({
          org_id: req.orgId,
          property_id: property.id,
          name: b.projectName || `${deal.deal_name} — Acquisition Renovation`,
          status: 'planning',
          project_type: b.projectType || 'acquisition_renovation',
          initial_budget: b.initialBudget ?? activeModel?.estimated_renovation_cost ?? 0,
          current_budget: b.initialBudget ?? activeModel?.estimated_renovation_cost ?? 0,
          actual_spend: 0,
          has_construction_loan: b.hasConstructionLoan ?? activeModel?.has_construction_loan ?? false,
          loan_amount: b.constructionLoanAmount ?? activeModel?.construction_loan_amount ?? null,
          created_by: req.userId,
        })
        .select('id').single();
      if (projErr || !project) return res.status(500).json({ error: projErr?.message || 'Failed to create project' });
      projectId = project.id;

      // 4. Create initial budget snapshot (Phase 1 invariant)
      await recordBudgetSnapshot({
        projectId: projectId!,
        orgId: req.orgId!,
        snapshotType: 'underwriting',
        budgetTotal: b.initialBudget ?? activeModel?.estimated_renovation_cost ?? 0,
        actualSpendAtSnapshot: 0,
        changeOrderTotalAtSnapshot: 0,
        triggeredByEvent: 'deal_promotion',
        triggeredByUser: req.userId,
        notes: `Initial underwriting budget from deal promotion (deal: ${dealId})`,
        markCurrent: true,
      });
    }

    // 5. Update deal with promotion info
    await supabaseAdmin
      .from('acquisition_deals')
      .update({
        promoted_to_property_id: property.id,
        promoted_at: new Date().toISOString(),
        promoted_by: req.userId,
        updated_at: new Date().toISOString(),
      })
      .eq('id', dealId);

    // 6. Bulk-update deal documents to set property_id
    await supabaseAdmin
      .from('property_documents')
      .update({ property_id: property.id })
      .eq('deal_id', dealId);

    res.status(201).json({ data: { property_id: property.id, project_id: projectId } });
  } catch (err) { next(err); }
});

export default router;
