import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock supabaseAdmin to avoid real DB calls
vi.mock('../utils/supabase', () => ({
  supabaseAdmin: {
    from: vi.fn(),
  },
}));

import { supabaseAdmin } from '../utils/supabase';

// Helper to build a chainable Supabase mock that resolves to { data, error }
function mockQuery(data: any, error: any = null) {
  const chain: any = {
    select: () => chain,
    eq: () => chain,
    in: () => chain,
    gte: () => chain,
    is: () => chain,
    like: () => chain,
    limit: () => chain,
    maybeSingle: () => Promise.resolve({ data, error }),
    then: (resolve: any) => Promise.resolve({ data, error }).then(resolve),
  };
  return chain;
}

describe('savings-calc-service (fixture-based)', () => {
  beforeEach(() => { vi.resetAllMocks(); });

  it('renovation_under_budget: sums bank_declared minus completion for eligible projects', async () => {
    const fromMock = vi.mocked(supabaseAdmin.from);

    // Completion snapshots (one project, completed this year)
    const completionSnaps = [
      { project_id: 'proj-1', budget_total: 0, actual_spend_at_snapshot: 300_000, effective_date: `${new Date().getFullYear()}-03-01` },
    ];
    // Bank-declared snapshot for same project
    const bankSnaps = [
      { project_id: 'proj-1', budget_total: 350_000 },
    ];
    // No flagged invoices
    const flaggedInvoices: any[] = [];
    // No cross-tenant benchmark
    const aggRow = null;

    let callCount = 0;
    fromMock.mockImplementation((table: string) => {
      if (table === 'project_budget_snapshots') {
        callCount++;
        if (callCount === 1) return mockQuery(completionSnaps) as any;   // completion snaps
        if (callCount === 2) return mockQuery(bankSnaps) as any;          // bank-declared snaps
      }
      if (table === 'contractor_invoices') return mockQuery(flaggedInvoices) as any;
      if (table === 'cross_tenant_aggregates') return mockQuery(aggRow) as any;
      return mockQuery([]) as any;
    });

    const { getSavingsYTD } = await import('../services/savings-calc-service');
    const result = await getSavingsYTD('org-test');

    expect(result.components.renovation_under_budget).toBeCloseTo(50_000, 0);
    expect(result.components.overpay_caught).toBe(0);
    expect(result.components.change_order_discipline).toBe(0);
    expect(result.total_ytd).toBeCloseTo(50_000, 0);
    expect(result.methodology_version).toBe('v1');
  });

  it('overpay_caught: counts rejected invoice amount', async () => {
    const fromMock = vi.mocked(supabaseAdmin.from);
    fromMock.mockImplementation((table: string) => {
      if (table === 'project_budget_snapshots') return mockQuery([]) as any;
      if (table === 'contractor_invoices') return mockQuery([
        { id: 'inv-1', total_amount: 10_000, original_amount: 15_000, status: 'rejected' },
      ]) as any;
      if (table === 'cross_tenant_aggregates') return mockQuery(null) as any;
      return mockQuery([]) as any;
    });

    const { getSavingsYTD } = await import('../services/savings-calc-service');
    const result = await getSavingsYTD('org-test');

    expect(result.components.overpay_caught).toBeCloseTo(15_000, 0);
  });

  it('overpay_caught: counts renegotiated amount (original > total)', async () => {
    const fromMock = vi.mocked(supabaseAdmin.from);
    fromMock.mockImplementation((table: string) => {
      if (table === 'project_budget_snapshots') return mockQuery([]) as any;
      if (table === 'contractor_invoices') return mockQuery([
        { id: 'inv-2', total_amount: 8_000, original_amount: 12_000, status: 'approved' },
      ]) as any;
      if (table === 'cross_tenant_aggregates') return mockQuery(null) as any;
      return mockQuery([]) as any;
    });

    const { getSavingsYTD } = await import('../services/savings-calc-service');
    const result = await getSavingsYTD('org-test');

    expect(result.components.overpay_caught).toBeCloseTo(4_000, 0);
  });

  it('change_order_discipline: zero when org rate >= industry rate', async () => {
    const fromMock = vi.mocked(supabaseAdmin.from);
    fromMock.mockImplementation((table: string) => {
      if (table === 'project_budget_snapshots') return mockQuery([]) as any;
      if (table === 'contractor_invoices') {
        // All invoices are COs — org CO rate = 100%
        return mockQuery([
          { total_amount: 100_000, is_change_order: true },
        ]) as any;
      }
      if (table === 'cross_tenant_aggregates') return mockQuery({ value_p50: '0.10' }) as any; // industry 10%
      return mockQuery([]) as any;
    });

    const { getSavingsYTD } = await import('../services/savings-calc-service');
    const result = await getSavingsYTD('org-test');
    expect(result.components.change_order_discipline).toBe(0);
  });

  it('change_order_discipline: credits 50% of outperformance when org CO rate < industry', async () => {
    const fromMock = vi.mocked(supabaseAdmin.from);
    fromMock.mockImplementation((table: string) => {
      if (table === 'project_budget_snapshots') return mockQuery([]) as any;
      if (table === 'contractor_invoices') {
        return mockQuery([
          { total_amount: 80_000, is_change_order: false },
          { total_amount: 20_000, is_change_order: false },
        ]) as any; // no COs → org rate 0
      }
      if (table === 'cross_tenant_aggregates') return mockQuery({ value_p50: '0.10' }) as any; // industry 10%
      return mockQuery([]) as any;
    });

    const { getSavingsYTD } = await import('../services/savings-calc-service');
    const result = await getSavingsYTD('org-test');
    // Gap = 0.10 - 0.00 = 0.10; total spend = 100K; 0.5 multiplier → 5K
    expect(result.components.change_order_discipline).toBeCloseTo(5_000, 0);
  });
});
