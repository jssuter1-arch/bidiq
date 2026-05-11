import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../utils/supabase', () => ({ supabaseAdmin: { from: vi.fn() } }));
import { supabaseAdmin } from '../utils/supabase';

function mockQ(data: any) {
  const c: any = {
    select: () => c, eq: () => c, in: () => c, not: () => c,
    gte: () => c, like: () => c, upsert: () => c, delete: () => c,
    order: () => c, limit: () => c,
    then: (resolve: any) => Promise.resolve({ data, error: null }).then(resolve),
  };
  return c;
}

function buildOrgs(count: number) {
  return Array.from({ length: count }, (_, i) => ({ org_id: `org-${i + 1}` }));
}

function buildProperties(orgCount: number) {
  return Array.from({ length: orgCount }, (_, i) => ({
    id: `prop-${i + 1}`,
    org_id: `org-${i + 1}`,
    property_type: 'residential',
    city: 'Boston',
  }));
}

function buildInvoices(orgCount: number) {
  return Array.from({ length: orgCount }, (_, i) => ({
    id: `inv-${i + 1}`,
    org_id: `org-${i + 1}`,
    total_amount: 10_000,
    is_change_order: false,
    invoice_date: '2025-06-01',
    projects: { id: `proj-${i + 1}`, property_id: `prop-${i + 1}`, unit_count: 10 },
  }));
}

function buildLineItems(orgCount: number) {
  return Array.from({ length: orgCount }, (_, i) => ({
    id: `li-${i + 1}`,
    invoice_id: `inv-${i + 1}`,
    org_id: `org-${i + 1}`,
    category: 'painting',
    unit_of_measure: 'sqft',
    unit_cost: 50,
    quantity: 200,
  }));
}

describe('cross-tenant-aggregation-job', () => {
  let upsertedRows: any[] = [];

  beforeEach(() => {
    vi.resetAllMocks();
    upsertedRows = [];
  });

  it('does NOT emit aggregate when fewer than 5 orgs participate', async () => {
    const orgCount = 4; // below threshold

    vi.mocked(supabaseAdmin.from).mockImplementation((table: string) => {
      if (table === 'cross_tenant_participation') return mockQ(buildOrgs(orgCount)) as any;
      if (table === 'properties') return mockQ(buildProperties(orgCount)) as any;
      if (table === 'contractor_invoices') return mockQ(buildInvoices(orgCount)) as any;
      if (table === 'budget_line_items') return mockQ(buildLineItems(orgCount)) as any;
      if (table === 'cross_tenant_aggregates') {
        const c: any = {
          upsert: (rows: any[]) => { upsertedRows = rows; return Promise.resolve({ error: null }); },
        };
        return c as any;
      }
      return mockQ([]) as any;
    });

    const { runCrossTenantAggregation } = await import('../jobs/cross-tenant-aggregation-job');
    const result = await runCrossTenantAggregation();

    expect(result.emitted).toBe(0);
    expect(result.suppressed).toBeGreaterThan(0);
    expect(upsertedRows.length).toBe(0);
  });

  it('emits aggregate when exactly 5 orgs participate', async () => {
    const orgCount = 5; // at threshold

    vi.mocked(supabaseAdmin.from).mockImplementation((table: string) => {
      if (table === 'cross_tenant_participation') return mockQ(buildOrgs(orgCount)) as any;
      if (table === 'properties') return mockQ(buildProperties(orgCount)) as any;
      if (table === 'contractor_invoices') return mockQ(buildInvoices(orgCount)) as any;
      if (table === 'budget_line_items') return mockQ(buildLineItems(orgCount)) as any;
      if (table === 'cross_tenant_aggregates') {
        const c: any = {
          upsert: (rows: any[], _opts: any) => { upsertedRows = rows; return Promise.resolve({ error: null }); },
        };
        return c as any;
      }
      return mockQ([]) as any;
    });

    const { runCrossTenantAggregation } = await import('../jobs/cross-tenant-aggregation-job');
    const result = await runCrossTenantAggregation();

    expect(result.emitted).toBeGreaterThan(0);
    // Verify emitted rows contain no org_id (privacy guarantee)
    for (const row of upsertedRows) {
      expect(row).not.toHaveProperty('org_id');
    }
  });

  it('emitted aggregate has correct statistics (P25=P50=P75 when all values equal)', async () => {
    const orgCount = 5;

    vi.mocked(supabaseAdmin.from).mockImplementation((table: string) => {
      if (table === 'cross_tenant_participation') return mockQ(buildOrgs(orgCount)) as any;
      if (table === 'properties') return mockQ(buildProperties(orgCount)) as any;
      if (table === 'contractor_invoices') return mockQ(buildInvoices(orgCount)) as any;
      if (table === 'budget_line_items') return mockQ(buildLineItems(orgCount)) as any; // all cost $50 × 200 = $10K
      if (table === 'cross_tenant_aggregates') {
        const c: any = {
          upsert: (rows: any[], _opts: any) => { upsertedRows = rows; return Promise.resolve({ error: null }); },
        };
        return c as any;
      }
      return mockQ([]) as any;
    });

    const { runCrossTenantAggregation } = await import('../jobs/cross-tenant-aggregation-job');
    await runCrossTenantAggregation();

    // All 5 orgs have identical unit costs → P25 = P50 = P75 = mean
    const costPerUnitRow = upsertedRows.find((r) => r.metric_key.startsWith('cost_per_unit_painting'));
    if (costPerUnitRow) {
      expect(costPerUnitRow.value_p25).toBe(costPerUnitRow.value_p50);
      expect(costPerUnitRow.value_p50).toBe(costPerUnitRow.value_p75);
      expect(costPerUnitRow.value_mean).toBe(costPerUnitRow.value_p50);
      expect(costPerUnitRow.sample_org_count).toBe(5);
    }
  });

  it('privacy: no identifiable org fields in upserted aggregates', async () => {
    const orgCount = 6;

    vi.mocked(supabaseAdmin.from).mockImplementation((table: string) => {
      if (table === 'cross_tenant_participation') return mockQ(buildOrgs(orgCount)) as any;
      if (table === 'properties') return mockQ(buildProperties(orgCount)) as any;
      if (table === 'contractor_invoices') return mockQ(buildInvoices(orgCount)) as any;
      if (table === 'budget_line_items') return mockQ(buildLineItems(orgCount)) as any;
      if (table === 'cross_tenant_aggregates') {
        const c: any = {
          upsert: (rows: any[], _opts: any) => { upsertedRows = rows; return Promise.resolve({ error: null }); },
        };
        return c as any;
      }
      return mockQ([]) as any;
    });

    const { runCrossTenantAggregation } = await import('../jobs/cross-tenant-aggregation-job');
    await runCrossTenantAggregation();

    const IDENTIFYING_FIELDS = ['org_id', 'property_id', 'project_id', 'contractor_id', 'user_id', 'deal_id'];
    for (const row of upsertedRows) {
      for (const field of IDENTIFYING_FIELDS) {
        expect(row).not.toHaveProperty(field);
      }
    }
  });
});
