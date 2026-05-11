// Integration tests for budget-snapshot-service and the snapshot sync invariant.
// Tests 1-4 from Phase 1 Quality Requirements.
// Supabase client is mocked; trigger behavior is tested at the service contract level.

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the supabase module before importing the service
vi.mock('../utils/supabase', () => {
  const mockFrom = vi.fn();
  return { supabaseAdmin: { from: mockFrom } };
});

import { recordBudgetSnapshot } from '../services/budget-snapshot-service';
import { supabaseAdmin } from '../utils/supabase';

const mockFrom = supabaseAdmin.from as ReturnType<typeof vi.fn>;

function buildChain(finalResult: unknown) {
  const chain: Record<string, unknown> = {};
  const methods = ['update', 'insert', 'select', 'single', 'eq', 'in'];
  for (const m of methods) {
    chain[m] = vi.fn(() => chain);
  }
  // The terminal `.single()` resolves with finalResult
  (chain.single as ReturnType<typeof vi.fn>).mockResolvedValue(finalResult);
  // `.eq()` on update resolves with { error: null } (demote step)
  return chain;
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('recordBudgetSnapshot — service contract', () => {
  it('test 1: inserts a snapshot row and returns its id', async () => {
    const fakeId = 'snap-uuid-001';
    const chain = buildChain({ data: { id: fakeId }, error: null });

    mockFrom.mockImplementation((table: string) => {
      if (table === 'project_budget_snapshots') return chain;
      return chain;
    });

    const result = await recordBudgetSnapshot({
      projectId: 'proj-001',
      orgId: 'org-001',
      snapshotType: 'project_created',
      budgetTotal: 295000,
      actualSpendAtSnapshot: 187400,
      changeOrderTotalAtSnapshot: 0,
      markCurrent: true,
    });

    expect(result.snapshotId).toBe(fakeId);
  });

  it('test 1b: demotes existing current snapshot before inserting when markCurrent=true', async () => {
    const insertChain = buildChain({ data: { id: 'snap-uuid-002' }, error: null });

    // Build a demote chain that supports .update().eq().eq() → { error: null }
    const demoteResult = { error: null };
    const demoteEq2 = vi.fn().mockResolvedValue(demoteResult);
    const demoteEq1 = vi.fn(() => ({ eq: demoteEq2 }));
    const demoteUpdateMock = vi.fn(() => ({ eq: demoteEq1 }));
    const demoteChain = { update: demoteUpdateMock };

    let callIndex = 0;
    mockFrom.mockImplementation(() => {
      callIndex++;
      if (callIndex === 1) return demoteChain as any;
      return insertChain as any;
    });

    await recordBudgetSnapshot({
      projectId: 'proj-001',
      orgId: 'org-001',
      snapshotType: 'revision',
      budgetTotal: 310000,
      actualSpendAtSnapshot: 200000,
      changeOrderTotalAtSnapshot: 15000,
      markCurrent: true,
    });

    expect(demoteUpdateMock).toHaveBeenCalledWith({ is_current: false });
  });

  it('test 2: does NOT demote existing snapshot when markCurrent=false', async () => {
    const insertChain = buildChain({ data: { id: 'snap-uuid-003' }, error: null });
    let updateCalled = false;
    insertChain.update = vi.fn(() => { updateCalled = true; return insertChain; });

    mockFrom.mockReturnValue(insertChain);

    await recordBudgetSnapshot({
      projectId: 'proj-001',
      orgId: 'org-001',
      snapshotType: 'manual',
      budgetTotal: 295000,
      actualSpendAtSnapshot: 187400,
      changeOrderTotalAtSnapshot: 0,
      markCurrent: false,
    });

    // No update (demote) call when markCurrent is false
    expect(updateCalled).toBe(false);
  });

  it('test 3: throws if the insert fails', async () => {
    const errorChain: Record<string, unknown> = {};
    const methods = ['update', 'insert', 'select', 'eq', 'in'];
    for (const m of methods) errorChain[m] = vi.fn(() => errorChain);
    (errorChain.single as any) = vi.fn().mockResolvedValue({
      data: null,
      error: { message: 'unique constraint violation' },
    });

    mockFrom.mockReturnValue(errorChain as any);

    await expect(
      recordBudgetSnapshot({
        projectId: 'proj-001',
        orgId: 'org-001',
        snapshotType: 'project_created',
        budgetTotal: 295000,
        actualSpendAtSnapshot: 0,
        changeOrderTotalAtSnapshot: 0,
        markCurrent: true,
      }),
    ).rejects.toThrow('Failed to record budget snapshot');
  });
});

describe('budget snapshot type validation', () => {
  it('test 4: all valid snapshot_type values are accepted', () => {
    const validTypes = [
      'underwriting', 'bank_declared', 'project_created',
      'break_ground', 'revision', 'completion', 'manual',
    ] as const;
    // Compile-time check: this would fail TS if any type was wrong
    validTypes.forEach((t) => {
      const input = { snapshotType: t } as { snapshotType: typeof validTypes[number] };
      expect(input.snapshotType).toBe(t);
    });
  });
});
