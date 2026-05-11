import { supabaseAdmin } from '../utils/supabase';

export interface ChangeOrderAnalyticsInput {
  orgId: string;
  /** Defaults to 365 */
  lookbackDays?: number;
}

export interface CategoryBreakdown {
  category: string;
  total_amount: number;
  invoice_count: number;
  avg_amount: number;
}

export interface ContractorBreakdown {
  contractor_id: string;
  company_name: string;
  total_amount: number;
  invoice_count: number;
}

export interface MonthlyTrendPoint {
  month: string; // YYYY-MM
  total_amount: number;
  invoice_count: number;
}

export interface OffendingProject {
  project_id: string;
  project_name: string;
  total_co_amount: number;
  co_count: number;
}

export interface ChangeOrderAnalyticsOutput {
  period_start: string;
  period_end: string;
  total_co_amount: number;
  total_co_count: number;
  uncategorized_count: number;
  by_category: CategoryBreakdown[];
  by_contractor: ContractorBreakdown[];
  monthly_trend: MonthlyTrendPoint[];
  top_offending_projects: OffendingProject[];
}

export async function getChangeOrderAnalytics(input: ChangeOrderAnalyticsInput): Promise<ChangeOrderAnalyticsOutput> {
  const { orgId, lookbackDays = 365 } = input;
  const periodEnd = new Date();
  const periodStart = new Date(periodEnd.getTime() - lookbackDays * 24 * 60 * 60 * 1000);
  const startDate = periodStart.toISOString().split('T')[0];
  const endDate = periodEnd.toISOString().split('T')[0];

  const { data: invoices } = await supabaseAdmin
    .from('contractor_invoices')
    .select(`
      id,
      total_amount,
      change_order_category,
      invoice_date,
      contractor_id,
      project_id,
      contractors (company_name),
      projects (name)
    `)
    .eq('org_id', orgId)
    .eq('is_change_order', true)
    .gte('invoice_date', startDate)
    .lte('invoice_date', endDate)
    .in('status', ['approved', 'paid']);

  const rows = invoices ?? [];

  const total_co_amount = rows.reduce((s: number, r: any) => s + (r.total_amount ?? 0), 0);
  const total_co_count = rows.length;
  const uncategorized_count = rows.filter((r: any) => !r.change_order_category).length;

  // By category
  const catMap = new Map<string, { total: number; count: number }>();
  for (const r of rows as any[]) {
    const cat = r.change_order_category ?? '__uncategorized__';
    const existing = catMap.get(cat) ?? { total: 0, count: 0 };
    existing.total += r.total_amount ?? 0;
    existing.count += 1;
    catMap.set(cat, existing);
  }
  const by_category: CategoryBreakdown[] = Array.from(catMap.entries())
    .map(([category, { total, count }]) => ({
      category,
      total_amount: Math.round(total * 100) / 100,
      invoice_count: count,
      avg_amount: Math.round((total / count) * 100) / 100,
    }))
    .sort((a, b) => b.total_amount - a.total_amount);

  // By contractor
  const contractorMap = new Map<string, { name: string; total: number; count: number }>();
  for (const r of rows as any[]) {
    const cId = r.contractor_id;
    const existing = contractorMap.get(cId) ?? { name: r.contractors?.company_name ?? cId, total: 0, count: 0 };
    existing.total += r.total_amount ?? 0;
    existing.count += 1;
    contractorMap.set(cId, existing);
  }
  const by_contractor: ContractorBreakdown[] = Array.from(contractorMap.entries())
    .map(([contractor_id, { name, total, count }]) => ({
      contractor_id,
      company_name: name,
      total_amount: Math.round(total * 100) / 100,
      invoice_count: count,
    }))
    .sort((a, b) => b.total_amount - a.total_amount);

  // Monthly trend
  const monthMap = new Map<string, { total: number; count: number }>();
  for (const r of rows as any[]) {
    const month = (r.invoice_date as string).slice(0, 7); // YYYY-MM
    const existing = monthMap.get(month) ?? { total: 0, count: 0 };
    existing.total += r.total_amount ?? 0;
    existing.count += 1;
    monthMap.set(month, existing);
  }
  const monthly_trend: MonthlyTrendPoint[] = Array.from(monthMap.entries())
    .map(([month, { total, count }]) => ({
      month,
      total_amount: Math.round(total * 100) / 100,
      invoice_count: count,
    }))
    .sort((a, b) => a.month.localeCompare(b.month));

  // Top offending projects
  const projectMap = new Map<string, { name: string; total: number; count: number }>();
  for (const r of rows as any[]) {
    const pId = r.project_id;
    const existing = projectMap.get(pId) ?? { name: r.projects?.name ?? pId, total: 0, count: 0 };
    existing.total += r.total_amount ?? 0;
    existing.count += 1;
    projectMap.set(pId, existing);
  }
  const top_offending_projects: OffendingProject[] = Array.from(projectMap.entries())
    .map(([project_id, { name, total, count }]) => ({
      project_id,
      project_name: name,
      total_co_amount: Math.round(total * 100) / 100,
      co_count: count,
    }))
    .sort((a, b) => b.total_co_amount - a.total_co_amount)
    .slice(0, 10);

  return {
    period_start: startDate,
    period_end: endDate,
    total_co_amount: Math.round(total_co_amount * 100) / 100,
    total_co_count,
    uncategorized_count,
    by_category,
    by_contractor,
    monthly_trend,
    top_offending_projects,
  };
}
