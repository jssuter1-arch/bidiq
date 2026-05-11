import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../utils/supabase', () => ({ supabaseAdmin: { from: vi.fn() } }));
import { supabaseAdmin } from '../utils/supabase';

function mockQuery(data: any) {
  const chain: any = {
    select: () => chain,
    eq: () => chain,
    in: () => chain,
    not: () => chain,
    lte: () => chain,
    gte: () => chain,
    range: () => Promise.resolve({ data, error: null }),
    then: (resolve: any) => Promise.resolve({ data, error: null }).then(resolve),
  };
  return chain;
}

describe('capital-timeline-service (quarterly)', () => {
  beforeEach(() => { vi.resetAllMocks(); });

  it('returns correct number of quarters for 24-month horizon', async () => {
    vi.mocked(supabaseAdmin.from).mockImplementation(() => mockQuery([]) as any);

    const { getCapitalTimeline } = await import('../services/capital-timeline-service');
    const result = await getCapitalTimeline('org-1', 24, 'quarterly');

    // 24 months = 8 quarters
    expect(result.periods.length).toBe(8);
    expect(result.granularity).toBe('quarterly');
    expect(result.horizon_months).toBe(24);
  });

  it('returns correct number of months for 12-month monthly horizon', async () => {
    vi.mocked(supabaseAdmin.from).mockImplementation(() => mockQuery([]) as any);

    const { getCapitalTimeline } = await import('../services/capital-timeline-service');
    const result = await getCapitalTimeline('org-1', 12, 'monthly');

    expect(result.periods.length).toBe(12);
    expect(result.granularity).toBe('monthly');
  });

  it('allocates project spend linearly across periods', async () => {
    const now = new Date();
    const sixMonthsOut = new Date(now.getFullYear(), now.getMonth() + 6, 1);

    vi.mocked(supabaseAdmin.from).mockImplementation((table: string) => {
      if (table === 'cash_accounts') return mockQuery([{ current_balance: 500_000 }]) as any;
      if (table === 'projects') return mockQuery([{
        id: 'proj-1', name: 'Test Project', status: 'active',
        current_budget: 120_000, actual_spend: 0,
        start_date: now.toISOString().slice(0, 10),
        projected_end_date: sixMonthsOut.toISOString().slice(0, 10),
      }]) as any;
      return mockQuery([]) as any;
    });

    const { getCapitalTimeline } = await import('../services/capital-timeline-service');
    const result = await getCapitalTimeline('org-1', 24, 'quarterly');

    // Total capital required across all periods should roughly equal the remaining budget.
    // Allow up to 5% variance due to quarterly boundary snapping in linear allocation.
    const totalRequired = result.periods.reduce((s, p) => s + p.capital_required, 0);
    expect(totalRequired).toBeGreaterThan(100_000);
    expect(totalRequired).toBeLessThan(130_000);
  });

  it('health is red when cash_position_end is negative', async () => {
    vi.mocked(supabaseAdmin.from).mockImplementation((table: string) => {
      if (table === 'cash_accounts') return mockQuery([{ current_balance: 1_000 }]) as any;
      if (table === 'projects') return mockQuery([{
        id: 'proj-x', name: 'Big Project', status: 'active',
        current_budget: 10_000_000, actual_spend: 0,
        start_date: new Date().toISOString().slice(0, 10),
        projected_end_date: new Date(new Date().getFullYear() + 1, 0, 1).toISOString().slice(0, 10),
      }]) as any;
      return mockQuery([]) as any;
    });

    const { getCapitalTimeline } = await import('../services/capital-timeline-service');
    const result = await getCapitalTimeline('org-1', 8, 'quarterly');

    const redPeriods = result.periods.filter((p) => p.health === 'red');
    expect(redPeriods.length).toBeGreaterThan(0);
  });
});
