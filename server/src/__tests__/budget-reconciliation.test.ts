// Integration tests for the budget reconciliation job.
// Test 4 from Phase 1 Quality Requirements:
// "The reconciliation job, run against a database where flat columns have been manually
//  corrupted, detects the drift and corrects it."

import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../utils/supabase', () => {
  return { supabaseAdmin: { from: vi.fn() } };
});

import { runBudgetReconciliation } from '../jobs/budget-reconciliation';
import { supabaseAdmin } from '../utils/supabase';

const mockFrom = supabaseAdmin.from as ReturnType<typeof vi.fn>;

function makeChain(result: unknown) {
  const c: Record<string, unknown> = {};
  const methods = ['select', 'update', 'insert', 'delete', 'eq', 'in', 'lt', 'limit'];
  for (const m of methods) c[m] = vi.fn(() => c);
  (c.single as any) = vi.fn().mockResolvedValue(result);
  // Make awaiting the chain resolve like a resolved promise
  (c as any).then = undefined; // disable auto-then — awaiting returns the chain object itself
  return c;
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('runBudgetReconciliation', () => {
  it('test 4a: returns 0 drift when flat columns match snapshot', async () => {
    const projectsData = [
      { id: 'p1', org_id: 'org1', name: 'Project A', current_budget: 100000, actual_spend: 50000 },
    ];
    const snapshotsData = [
      { project_id: 'p1', budget_total: 100000, actual_spend_at_snapshot: 50000 },
    ];

    let callCount = 0;
    mockFrom.mockImplementation((table: string) => {
      callCount++;
      const c = makeChain(null);
      if (table === 'projects') {
        // .select().resolves with array data
        (c.select as any).mockResolvedValue({ data: projectsData, error: null });
      } else if (table === 'project_budget_snapshots') {
        // .select().in().eq() resolves with snapshot data
        (c.in as any).mockReturnValue({
          eq: vi.fn().mockResolvedValue({ data: snapshotsData, error: null }),
        });
      } else if (table === 'budget_reconciliation_log') {
        (c.insert as any).mockResolvedValue({ error: null });
      }
      return c as any;
    });

    const result = await runBudgetReconciliation();
    expect(result.checked).toBe(1);
    expect(result.drifted).toBe(0);
    expect(result.corrected).toBe(0);
  });

  it('test 4b: detects drift and auto-corrects when flat columns differ from snapshot', async () => {
    // Flat columns corrupted: current_budget=99000 but snapshot says 100000
    const projectsData = [
      { id: 'p1', org_id: 'org1', name: 'Project A', current_budget: 99000, actual_spend: 50000 },
    ];
    const snapshotsData = [
      { project_id: 'p1', budget_total: 100000, actual_spend_at_snapshot: 50000 },
    ];

    const updateMock = vi.fn().mockReturnValue({
      eq: vi.fn().mockResolvedValue({ error: null }),
    });
    const insertMock = vi.fn().mockResolvedValue({ error: null });
    const adminSingleMock = vi.fn().mockResolvedValue({ data: { id: 'admin-user-1' }, error: null });

    mockFrom.mockImplementation((table: string) => {
      if (table === 'projects') {
        return {
          select: vi.fn().mockResolvedValue({ data: projectsData, error: null }),
          update: updateMock,
        } as any;
      }
      if (table === 'project_budget_snapshots') {
        return {
          select: vi.fn().mockReturnValue({
            in: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({ data: snapshotsData, error: null }),
            }),
          }),
        } as any;
      }
      if (table === 'budget_reconciliation_log') {
        const deleteChain: any = { eq: vi.fn(), lt: vi.fn() };
        deleteChain.eq.mockReturnValue(deleteChain);
        deleteChain.lt.mockReturnValue(deleteChain);
        return { insert: insertMock, delete: vi.fn(() => deleteChain) } as any;
      }
      if (table === 'users') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                limit: vi.fn().mockReturnValue({
                  single: adminSingleMock,
                }),
              }),
            }),
          }),
        } as any;
      }
      if (table === 'notifications') {
        return { insert: insertMock } as any;
      }
      return { insert: insertMock } as any;
    });

    const result = await runBudgetReconciliation();
    expect(result.checked).toBe(1);
    expect(result.drifted).toBe(1);
    expect(result.corrected).toBe(1);
    // The update (correction) must have been called
    expect(updateMock).toHaveBeenCalledWith(
      expect.objectContaining({ current_budget: 100000, actual_spend: 50000 }),
    );
  });

  it('test 4c: returns 0 checked when no projects exist', async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === 'projects') {
        return { select: vi.fn().mockResolvedValue({ data: [], error: null }) } as any;
      }
      // budget_reconciliation_log pruning delete must be chainable
      const deleteChain: any = { eq: vi.fn(), lt: vi.fn() };
      deleteChain.eq.mockReturnValue(deleteChain);
      deleteChain.lt.mockReturnValue(deleteChain);
      return { delete: vi.fn(() => deleteChain) } as any;
    });

    const result = await runBudgetReconciliation();
    expect(result).toEqual({ checked: 0, drifted: 0, corrected: 0 });
  });
});
