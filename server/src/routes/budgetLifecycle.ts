import { Router } from 'express';
import { z } from 'zod';
import { authenticateUser, loadOrgContext, requireRole, validateBody } from '../middleware';
import { supabaseAdmin } from '../utils/supabase';
import { AuthenticatedRequest } from '../middleware/authenticateUser';
import { recordBudgetSnapshot } from '../services/budget-snapshot-service';
import { computeChangeOrderTotal, captureLineItemsSnapshot } from '../services/budget-snapshot-helpers';
import { requireModuleAccess } from '../middleware/requireModuleAccess';

const router = Router();
const auth = [authenticateUser, loadOrgContext];
const budgetAccess = requireModuleAccess('budget_lifecycle');

// ─── Manual Snapshot ──────────────────────────────────────────────────────────

const ManualSnapshotSchema = z.object({
  notes: z.string().min(1),
  budgetTotal: z.number().nonnegative().optional(),
});

router.post(
  '/projects/:projectId/snapshots',
  ...auth,
  budgetAccess,
  requireRole('project_manager'),
  validateBody(ManualSnapshotSchema),
  async (req: AuthenticatedRequest, res, next) => {
    try {
      const { projectId } = req.params;

      const { data: project, error: fetchError } = await supabaseAdmin
        .from('projects')
        .select('id, org_id, name, current_budget, actual_spend')
        .eq('id', projectId)
        .eq('org_id', req.orgId!)
        .single();

      if (fetchError || !project) return res.status(404).json({ error: 'Project not found' });

      const [coTotal, lineItems] = await Promise.all([
        computeChangeOrderTotal(projectId),
        captureLineItemsSnapshot(projectId),
      ]);

      const { snapshotId } = await recordBudgetSnapshot({
        projectId,
        orgId: req.orgId!,
        snapshotType: 'manual',
        budgetTotal: req.body.budgetTotal ?? project.current_budget ?? 0,
        actualSpendAtSnapshot: project.actual_spend ?? 0,
        changeOrderTotalAtSnapshot: coTotal,
        lineItemsSnapshot: lineItems,
        triggeredByEvent: 'manual',
        triggeredByUser: req.userId,
        notes: req.body.notes,
        markCurrent: true,
      });

      res.status(201).json({ data: { snapshotId } });
    } catch (err) { next(err); }
  },
);

// ─── Snapshot List ─────────────────────────────────────────────────────────────

router.get(
  '/projects/:projectId/snapshots',
  ...auth,
  budgetAccess,
  async (req: AuthenticatedRequest, res, next) => {
    try {
      const { projectId } = req.params;

      const { data: project } = await supabaseAdmin
        .from('projects')
        .select('id')
        .eq('id', projectId)
        .eq('org_id', req.orgId!)
        .single();

      if (!project) return res.status(404).json({ error: 'Project not found' });

      const { data, error } = await supabaseAdmin
        .from('project_budget_snapshots')
        .select('*')
        .eq('project_id', projectId)
        .eq('org_id', req.orgId!)
        .order('effective_date', { ascending: true })
        .order('created_at', { ascending: true });

      if (error) return res.status(500).json({ error: error.message });
      res.json({ data: data ?? [] });
    } catch (err) { next(err); }
  },
);

// ─── Single Snapshot ───────────────────────────────────────────────────────────

router.get(
  '/projects/:projectId/snapshots/:snapshotId',
  ...auth,
  budgetAccess,
  async (req: AuthenticatedRequest, res, next) => {
    try {
      const { data, error } = await supabaseAdmin
        .from('project_budget_snapshots')
        .select('*')
        .eq('id', req.params.snapshotId)
        .eq('project_id', req.params.projectId)
        .eq('org_id', req.orgId!)
        .single();

      if (error || !data) return res.status(404).json({ error: 'Snapshot not found' });
      res.json({ data });
    } catch (err) { next(err); }
  },
);

// ─── Budget Timeline ───────────────────────────────────────────────────────────
// Returns ordered snapshots shaped for chart rendering.

router.get(
  '/projects/:projectId/budget-timeline',
  ...auth,
  budgetAccess,
  async (req: AuthenticatedRequest, res, next) => {
    try {
      const { projectId } = req.params;

      const { data: project, error: projErr } = await supabaseAdmin
        .from('projects')
        .select('id, name, current_budget, actual_spend, status, status_changed_at')
        .eq('id', projectId)
        .eq('org_id', req.orgId!)
        .single();

      if (projErr || !project) return res.status(404).json({ error: 'Project not found' });

      const { data: snapshots, error: snapErr } = await supabaseAdmin
        .from('project_budget_snapshots')
        .select('id, snapshot_type, effective_date, budget_total, actual_spend_at_snapshot, change_order_total_at_snapshot, is_current, notes')
        .eq('project_id', projectId)
        .eq('org_id', req.orgId!)
        .order('effective_date', { ascending: true })
        .order('created_at', { ascending: true });

      if (snapErr) return res.status(500).json({ error: snapErr.message });

      res.json({
        data: {
          project: {
            id: project.id,
            name: project.name,
            currentBudget: project.current_budget,
            actualSpend: project.actual_spend,
            status: project.status,
            statusChangedAt: project.status_changed_at,
          },
          timeline: (snapshots ?? []).map((s) => ({
            id: s.id,
            snapshotType: s.snapshot_type,
            effectiveDate: s.effective_date,
            budgetTotal: s.budget_total,
            actualSpend: s.actual_spend_at_snapshot,
            changeOrderTotal: s.change_order_total_at_snapshot,
            isCurrent: s.is_current,
            notes: s.notes,
          })),
        },
      });
    } catch (err) { next(err); }
  },
);

// ─── Bank Reconciliation ───────────────────────────────────────────────────────
// Compares the most recent bank_declared snapshot against current live totals.

router.get(
  '/projects/:projectId/bank-reconciliation',
  ...auth,
  budgetAccess,
  async (req: AuthenticatedRequest, res, next) => {
    try {
      const { projectId } = req.params;

      const { data: project, error: projErr } = await supabaseAdmin
        .from('projects')
        .select('id, name, current_budget, actual_spend, loan_amount, lender_name, has_construction_loan')
        .eq('id', projectId)
        .eq('org_id', req.orgId!)
        .single();

      if (projErr || !project) return res.status(404).json({ error: 'Project not found' });

      // Most recent bank_declared snapshot
      const { data: bankSnap } = await supabaseAdmin
        .from('project_budget_snapshots')
        .select('*')
        .eq('project_id', projectId)
        .eq('org_id', req.orgId!)
        .eq('snapshot_type', 'bank_declared')
        .order('effective_date', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      const liveBudget = project.current_budget ?? 0;
      const liveSpend = project.actual_spend ?? 0;
      const declaredBudget = bankSnap?.budget_total ?? 0;
      const declaredSpend = bankSnap?.actual_spend_at_snapshot ?? 0;

      res.json({
        data: {
          projectId,
          projectName: project.name,
          hasConstructionLoan: project.has_construction_loan,
          loanAmount: project.loan_amount,
          lenderName: project.lender_name,
          bankDeclaredSnapshot: bankSnap ?? null,
          liveBudget,
          liveSpend,
          declaredBudget,
          declaredSpend,
          budgetDrift: liveBudget - declaredBudget,
          spendDrift: liveSpend - declaredSpend,
          isInSync: Math.abs(liveBudget - declaredBudget) < 1 && Math.abs(liveSpend - declaredSpend) < 1,
        },
      });
    } catch (err) { next(err); }
  },
);

// ─── Lender Dossier ────────────────────────────────────────────────────────────
// Portfolio-level summary for lender presentations.

router.get(
  '/lender-dossier',
  ...auth,
  budgetAccess,
  async (req: AuthenticatedRequest, res, next) => {
    try {
      const { data: projects, error: projErr } = await supabaseAdmin
        .from('projects')
        .select('id, name, status, project_type, current_budget, actual_spend, initial_budget, has_construction_loan, loan_amount, lender_name, start_date, target_completion, status_changed_at, properties(name, address, city, state)')
        .eq('org_id', req.orgId!)
        .order('created_at', { ascending: false });

      if (projErr) return res.status(500).json({ error: projErr.message });

      const rows = projects ?? [];

      // For each project, fetch its most recent bank_declared snapshot
      const projectIds = rows.map((p) => p.id);
      const { data: bankSnaps } = await supabaseAdmin
        .from('project_budget_snapshots')
        .select('project_id, budget_total, effective_date, change_order_total_at_snapshot')
        .in('project_id', projectIds)
        .eq('snapshot_type', 'bank_declared')
        .order('effective_date', { ascending: false });

      // Keep only the most recent bank_declared per project
      const bankSnapByProject = new Map<string, typeof bankSnaps extends (infer T)[] | null ? T : never>();
      for (const snap of bankSnaps ?? []) {
        if (!bankSnapByProject.has(snap.project_id)) {
          bankSnapByProject.set(snap.project_id, snap);
        }
      }

      // Aggregate KPIs
      const totalBudget = rows.reduce((s, p) => s + (p.current_budget ?? 0), 0);
      const totalSpend = rows.reduce((s, p) => s + (p.actual_spend ?? 0), 0);
      const totalLoanExposure = rows
        .filter((p) => p.has_construction_loan)
        .reduce((s, p) => s + (p.loan_amount ?? 0), 0);
      const completedProjects = rows.filter((p) => p.status === 'completed');
      const completedUnderBudget = completedProjects.filter(
        (p) => (p.actual_spend ?? 0) <= (p.current_budget ?? 0),
      ).length;

      const projectSummaries = rows.map((p) => {
        const bankSnap = bankSnapByProject.get(p.id) ?? null;
        const variancePct =
          (p.current_budget ?? 0) > 0
            ? (((p.actual_spend ?? 0) - (p.current_budget ?? 0)) / (p.current_budget ?? 0)) * 100
            : 0;
        return {
          id: p.id,
          name: p.name,
          status: p.status,
          projectType: p.project_type,
          property: p.properties,
          currentBudget: p.current_budget,
          actualSpend: p.actual_spend,
          initialBudget: p.initial_budget,
          variancePct: Math.round(variancePct * 10) / 10,
          hasConstructionLoan: p.has_construction_loan,
          loanAmount: p.loan_amount,
          lenderName: p.lender_name,
          startDate: p.start_date,
          targetCompletion: p.target_completion,
          statusChangedAt: p.status_changed_at,
          bankDeclaredBudget: bankSnap?.budget_total ?? null,
          bankDeclaredDate: bankSnap?.effective_date ?? null,
          changeOrderTotal: bankSnap?.change_order_total_at_snapshot ?? null,
        };
      });

      const ltvPct =
        totalBudget > 0 ? Math.round((totalLoanExposure / totalBudget) * 100 * 10) / 10 : 0;

      res.json({
        data: {
          kpis: {
            totalProjects: rows.length,
            activeProjects: rows.filter((p) => p.status === 'active').length,
            completedProjects: completedProjects.length,
            completedUnderBudget,
            totalBudget,
            totalSpend,
            totalLoanExposure,
            ltvPct,
            portfolioVariancePct:
              totalBudget > 0
                ? Math.round(((totalSpend - totalBudget) / totalBudget) * 100 * 10) / 10
                : 0,
          },
          projects: projectSummaries,
        },
      });
    } catch (err) { next(err); }
  },
);

// ─── Lender Dossier PDF Export ─────────────────────────────────────────────────
// Returns structured data for client-side PDF generation (no binary on server).

router.post(
  '/lender-dossier/export',
  ...auth,
  budgetAccess,
  requireRole('admin'),
  async (req: AuthenticatedRequest, res, next) => {
    try {
      // Re-use the GET lender-dossier logic by forwarding internally
      const { data: projects } = await supabaseAdmin
        .from('projects')
        .select('id, name, status, project_type, current_budget, actual_spend, initial_budget, has_construction_loan, loan_amount, lender_name, start_date, target_completion, status_changed_at, properties(name, address, city, state)')
        .eq('org_id', req.orgId!)
        .order('created_at', { ascending: false });

      const rows = projects ?? [];
      const projectIds = rows.map((p) => p.id);

      const { data: bankSnaps } = await supabaseAdmin
        .from('project_budget_snapshots')
        .select('project_id, budget_total, effective_date, change_order_total_at_snapshot')
        .in('project_id', projectIds)
        .eq('snapshot_type', 'bank_declared')
        .order('effective_date', { ascending: false });

      const bankSnapByProject = new Map<string, (typeof bankSnaps extends (infer T)[] | null ? T : never)>();
      for (const snap of bankSnaps ?? []) {
        if (!bankSnapByProject.has(snap.project_id)) bankSnapByProject.set(snap.project_id, snap);
      }

      const { data: org } = await supabaseAdmin
        .from('organizations')
        .select('name, logo_url')
        .eq('id', req.orgId!)
        .single();

      res.json({
        data: {
          exportedAt: new Date().toISOString(),
          organization: org ?? { name: 'Unknown', logo_url: null },
          projects: rows.map((p) => {
            const bankSnap = bankSnapByProject.get(p.id) ?? null;
            return {
              id: p.id,
              name: p.name,
              status: p.status,
              projectType: p.project_type,
              property: p.properties,
              currentBudget: p.current_budget,
              actualSpend: p.actual_spend,
              initialBudget: p.initial_budget,
              hasConstructionLoan: p.has_construction_loan,
              loanAmount: p.loan_amount,
              lenderName: p.lender_name,
              startDate: p.start_date,
              targetCompletion: p.target_completion,
              statusChangedAt: p.status_changed_at,
              bankDeclaredBudget: bankSnap?.budget_total ?? null,
              bankDeclaredDate: bankSnap?.effective_date ?? null,
              changeOrderTotal: bankSnap?.change_order_total_at_snapshot ?? null,
            };
          }),
        },
      });
    } catch (err) { next(err); }
  },
);

export default router;
