import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../utils/supabase', () => ({ supabaseAdmin: { from: vi.fn() } }));
import { supabaseAdmin } from '../utils/supabase';

function mockQ(data: any) {
  const c: any = {
    select: () => c, eq: () => c, is: () => c, in: () => c,
    not: () => c, lte: () => c, gte: () => c, limit: () => c,
    order: () => c, maybeSingle: () => Promise.resolve({ data: null, error: null }),
    then: (resolve: any) => Promise.resolve({ data, error: null }).then(resolve),
  };
  return c;
}

const now = new Date();
const daysAgo = (n: number) => new Date(now.getTime() - n * 86400_000).toISOString();

describe('decision-hub-service', () => {
  beforeEach(() => { vi.resetAllMocks(); });

  it('scenario comparisons without decision are included', async () => {
    vi.mocked(supabaseAdmin.from).mockImplementation((table: string) => {
      if (table === 'scenario_path_comparisons') return mockQ([
        { id: 'comp-1', name: 'Bowden St Compare', created_at: daysAgo(10), selected_scenario_id: null },
      ]) as any;
      return mockQ([]) as any;
    });

    const { getDecisionHubItems } = await import('../services/decision-hub-service');
    const result = await getDecisionHubItems('org-1');

    const item = result.items.find((i) => i.id === 'scenario-comp-1');
    expect(item).toBeDefined();
    expect(item?.type).toBe('scenario_decision');
    expect(item?.urgency).toBe('this_week'); // 10 days > 7
  });

  it('budget alert is today when project exceeds 100% of budget', async () => {
    vi.mocked(supabaseAdmin.from).mockImplementation((table: string) => {
      if (table === 'projects') return mockQ([
        { id: 'proj-over', name: 'Over Budget Project', current_budget: 100_000, actual_spend: 110_000 },
      ]) as any;
      return mockQ([]) as any;
    });

    const { getDecisionHubItems } = await import('../services/decision-hub-service');
    const result = await getDecisionHubItems('org-1');

    const item = result.items.find((i) => i.id === 'budget-proj-over');
    expect(item).toBeDefined();
    expect(item?.urgency).toBe('today');
  });

  it('budget alert is this_week when project is 85-100% of budget', async () => {
    vi.mocked(supabaseAdmin.from).mockImplementation((table: string) => {
      if (table === 'projects') return mockQ([
        { id: 'proj-near', name: 'Near Budget', current_budget: 100_000, actual_spend: 90_000 },
      ]) as any;
      return mockQ([]) as any;
    });

    const { getDecisionHubItems } = await import('../services/decision-hub-service');
    const result = await getDecisionHubItems('org-1');

    const item = result.items.find((i) => i.id === 'budget-proj-near');
    expect(item?.urgency).toBe('this_week');
  });

  it('items are sorted today first, then this_week, then background', async () => {
    vi.mocked(supabaseAdmin.from).mockImplementation((table: string) => {
      if (table === 'projects') return mockQ([
        { id: 'proj-a', name: 'Background project', current_budget: 100_000, actual_spend: 88_000 },
        { id: 'proj-b', name: 'Over budget project', current_budget: 100_000, actual_spend: 110_000 },
      ]) as any;
      if (table === 'scenario_path_comparisons') return mockQ([
        { id: 'comp-bg', name: 'Fresh compare', created_at: daysAgo(2), selected_scenario_id: null },
      ]) as any;
      return mockQ([]) as any;
    });

    const { getDecisionHubItems } = await import('../services/decision-hub-service');
    const result = await getDecisionHubItems('org-1');

    const urgencies = result.items.map((i) => i.urgency);
    const firstToday = urgencies.indexOf('today');
    const firstThisWeek = urgencies.indexOf('this_week');
    const firstBackground = urgencies.indexOf('background');

    if (firstToday >= 0 && firstThisWeek >= 0) expect(firstToday).toBeLessThan(firstThisWeek);
    if (firstThisWeek >= 0 && firstBackground >= 0) expect(firstThisWeek).toBeLessThan(firstBackground);
  });

  it('counts reflect correct urgency buckets', async () => {
    vi.mocked(supabaseAdmin.from).mockImplementation((table: string) => {
      if (table === 'projects') return mockQ([
        { id: 'p1', name: 'Over', current_budget: 100, actual_spend: 110 },  // today
        { id: 'p2', name: 'Near', current_budget: 100, actual_spend: 90 },   // this_week
      ]) as any;
      return mockQ([]) as any;
    });

    const { getDecisionHubItems } = await import('../services/decision-hub-service');
    const result = await getDecisionHubItems('org-1');

    expect(result.counts.today).toBeGreaterThanOrEqual(1);
    expect(result.counts.this_week).toBeGreaterThanOrEqual(1);
    expect(result.counts.total).toBe(result.items.length);
  });
});
