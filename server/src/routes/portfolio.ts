import { Router, Response, NextFunction } from 'express';
import { z } from 'zod';
import { authenticateUser, loadOrgContext, requireModuleAccess, requireRole, auditLog } from '../middleware';
import { supabaseAdmin } from '../utils/supabase';
import { getSavingsYTD, getSavingsTrend } from '../services/savings-calc-service';
import { getCapitalTimeline } from '../services/capital-timeline-service';
import { getExecutiveSentence } from '../services/executive-sentence-service';
import { AuthenticatedRequest } from '../middleware/authenticateUser';

const router = Router();
const auth = [authenticateUser, loadOrgContext, requireModuleAccess('portfolio_intelligence')];
const adminAuth = [authenticateUser, loadOrgContext, requireModuleAccess('portfolio_intelligence'), requireRole('admin')];

// GET /api/v1/portfolio/summary — full dashboard data
router.get('/summary', auth, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const orgId = req.orgId!;

    const [
      savingsResult,
      sentenceResult,
      projectsResult,
      dealsResult,
      propertiesResult,
      cashResult,
    ] = await Promise.all([
      getSavingsYTD(orgId).catch(() => null),
      getExecutiveSentence({ orgId }).catch(() => ({ sentence: 'Welcome to your portfolio overview.', tier: 5 as const })),
      supabaseAdmin
        .from('projects')
        .select('id, name, status, current_budget, actual_spend, start_date, projected_end_date, properties(name)')
        .eq('org_id', orgId),
      supabaseAdmin
        .from('acquisition_deals')
        .select('id, deal_name, status, purchase_price')
        .eq('org_id', orgId),
      supabaseAdmin
        .from('properties')
        .select('id, name, purchase_price')
        .eq('org_id', orgId),
      supabaseAdmin.from('cash_accounts').select('current_balance').eq('org_id', orgId),
    ]);

    const projects = projectsResult.data || [];
    const activeProjects = projects.filter((p: any) => ['active', 'permitting'].includes(p.status));
    const deals = dealsResult.data || [];

    const totalPortfolioValue = (propertiesResult.data || [])
      .reduce((s: number, p: any) => s + (p.purchase_price || 0), 0);
    const activeCapital = activeProjects.reduce((s: number, p: any) => s + (p.actual_spend || 0), 0);
    const dealsInFlight = deals.filter((d: any) => !['closed_won', 'closed_lost', 'passed'].includes(d.status)).length;

    const statusGroups = deals.reduce((acc: any, d: any) => {
      acc[d.status] = (acc[d.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    res.json({
      data: {
        executive_sentence: sentenceResult.sentence,
        kpis: {
          total_portfolio_value: totalPortfolioValue,
          active_capital_deployed: activeCapital,
          bidiq_savings_ytd: savingsResult?.total_ytd || 0,
          deals_in_flight: dealsInFlight,
        },
        active_projects: activeProjects,
        all_projects: projects,
        pipeline_by_status: statusGroups,
        savings: savingsResult,
      },
    });
  } catch (err) { next(err); }
});

// GET /api/v1/portfolio/savings — YTD savings detail
router.get('/savings', auth, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const orgId = req.orgId!;
    const [ytd, trend] = await Promise.all([getSavingsYTD(orgId), getSavingsTrend(orgId)]);
    res.json({ data: { ytd, trend } });
  } catch (err) { next(err); }
});

// GET /api/v1/portfolio/capital-timeline
const TimelineSchema = z.object({
  horizonMonths: z.coerce.number().int().min(3).max(48).default(24),
  granularity: z.enum(['monthly', 'quarterly']).default('quarterly'),
});

router.get('/capital-timeline', auth, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { horizonMonths, granularity } = TimelineSchema.parse(req.query);
    const result = await getCapitalTimeline(req.orgId!, horizonMonths, granularity);
    res.json({ data: result });
  } catch (err) { next(err); }
});

// GET /api/v1/portfolio/benchmarks — cross-tenant aggregate data for this org
router.get('/benchmarks', auth, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const orgId = req.orgId!;

    // Participation status
    const { data: participation } = await supabaseAdmin
      .from('cross_tenant_participation')
      .select('is_participating, toggled_at, consent_version')
      .eq('org_id', orgId)
      .maybeSingle();

    // All aggregates (no org-scoped filter — aggregates table has no identifiable data)
    const { data: aggregates } = await supabaseAdmin
      .from('cross_tenant_aggregates')
      .select('*')
      .gte('sample_org_count', 5); // enforce k-anonymity at read time too

    // Org's own cost data for comparison
    const { data: orgInvoices } = await supabaseAdmin
      .from('contractor_invoices')
      .select('id, total_amount, is_change_order, invoice_date')
      .eq('org_id', orgId)
      .in('status', ['approved', 'paid'])
      .gte('invoice_date', new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10));

    const { data: orgLineItems } = await supabaseAdmin
      .from('budget_line_items')
      .select('invoice_id, category, unit_cost, quantity')
      .eq('org_id', orgId);

    const lineByInvoice = new Map<string, any[]>();
    for (const li of orgLineItems || []) {
      if (!li.invoice_id) continue;
      if (!lineByInvoice.has(li.invoice_id)) lineByInvoice.set(li.invoice_id, []);
      lineByInvoice.get(li.invoice_id)!.push(li);
    }

    // Build org cost-per-unit averages by category
    const categoryTotals = new Map<string, { total: number; count: number }>();
    for (const inv of orgInvoices || []) {
      for (const li of lineByInvoice.get(inv.id) || []) {
        if (!li.category || !li.unit_cost) continue;
        const total = (li.unit_cost || 0) * (li.quantity || 1);
        if (!categoryTotals.has(li.category)) categoryTotals.set(li.category, { total: 0, count: 0 });
        const c = categoryTotals.get(li.category)!;
        c.total += total;
        c.count += 1;
      }
    }

    res.json({
      data: {
        participation: participation || { is_participating: false },
        aggregates: aggregates || [],
        org_category_averages: Object.fromEntries(
          Array.from(categoryTotals.entries()).map(([cat, v]) => [cat, Math.round((v.total / v.count) * 100) / 100])
        ),
      },
    });
  } catch (err) { next(err); }
});

// POST /api/v1/portfolio/export-summary — stub (PDF generation is client-side via react-pdf)
router.post('/export-summary', adminAuth, auditLog('export', 'portfolio'), async (_req: AuthenticatedRequest, res: Response) => {
  res.json({ data: { message: 'PDF export is generated client-side via the browser.' } });
});

export default router;
