import { describe, it, expect } from 'vitest';
import { computeScenario, computeScenarioSensitivity, ScenarioInputs } from '../services/scenario-calc-service';

const NO_CONSTRAINTS: ScenarioInputs['active_constraints'] = [];

// Bowden Street Scenario B: cosmetic-only (the recommended path)
const COSMETIC_BASE: ScenarioInputs = {
  estimated_renovation_cost: 30_000,
  pre_scenario_rent_monthly: 12_800,
  post_scenario_rent_monthly: 14_400,
  cap_rate: 0.06,
  discount_rate: 0.10,
  hold_period_months: 60,
  triggered_constraints: [],
  active_constraints: NO_CONSTRAINTS,
  hurdle_rate: 0.15,
};

// Fire-code constraint for Scenario A
const FIRE_CODE_CONSTRAINT = {
  id: 'fire-code-id',
  triggered_cost_estimate: 150_000,
  is_active: true,
};

// Bowden Street Scenario A: re-sprinkler + add bedrooms
const RENO_WITH_CONSTRAINT: ScenarioInputs = {
  estimated_renovation_cost: 180_000,
  pre_scenario_rent_monthly: 12_800,
  post_scenario_rent_monthly: 16_800,
  cap_rate: 0.06,
  discount_rate: 0.10,
  hold_period_months: 60,
  triggered_constraints: ['fire-code-id'],
  active_constraints: [FIRE_CODE_CONSTRAINT],
  hurdle_rate: 0.15,
};

describe('computeScenario', () => {
  // ─── 1. Positive-NPV scenario that meets hurdle (cosmetic) ───────────────────
  it('1. cosmetic scenario: positive NPV, IRR exceeds 15% hurdle, meets_hurdle=true', () => {
    const r = computeScenario(COSMETIC_BASE);

    expect(r.triggered_constraint_costs).toBe(0);
    expect(r.total_capital_required).toBe(30_000);
    expect(r.monthly_income_delta).toBeCloseTo(1_600, 0);
    expect(r.annual_income_delta).toBeCloseTo(19_200, 0);
    // value_created = 19200 / 0.06 = 320_000
    expect(r.value_created).toBeCloseTo(320_000, 0);
    expect(r.npv).toBeGreaterThan(0);
    expect(r.irr).not.toBeNull();
    expect(r.irr!).toBeGreaterThan(0.15); // exceeds hurdle
    expect(r.meets_hurdle).toBe(true);
    expect(r.payback_months).toBeCloseTo(30_000 / 1_600, 0);
  });

  // ─── 2. Positive-NPV scenario below hurdle ───────────────────────────────────
  // $10K reno, $50/mo delta, 36-month hold, 6% cap → IRR ≈ 6% annualized.
  // NPV at 1% discount is positive; IRR < 15% hurdle so meets_hurdle = false.
  it('2. positive NPV but fails 15% hurdle (low-return scenario)', () => {
    const r = computeScenario({
      ...COSMETIC_BASE,
      estimated_renovation_cost: 10_000,
      pre_scenario_rent_monthly: 10_000,
      post_scenario_rent_monthly: 10_050, // $50/mo delta
      hold_period_months: 36,
      hurdle_rate: 0.15,
      discount_rate: 0.01, // low discount → NPV positive
    });
    expect(r.npv).toBeGreaterThan(0);
    expect(r.meets_hurdle).toBe(false);
    if (r.irr !== null) {
      expect(r.irr).toBeLessThan(0.15);
    }
  });

  // ─── 3. Negative-NPV scenario (capital cost outweighs returns) ───────────────
  it('3. negative NPV when capital is too high relative to income delta', () => {
    // Large reno cost, tiny income improvement, short hold → NPV < 0
    const r = computeScenario({
      ...COSMETIC_BASE,
      estimated_renovation_cost: 500_000,
      pre_scenario_rent_monthly: 10_000,
      post_scenario_rent_monthly: 10_050, // $50/mo delta
      hold_period_months: 12,
    });
    expect(r.npv).toBeLessThan(0);
    expect(r.meets_hurdle).toBe(false);
  });

  // ─── 4. Scenario with no triggered constraints ───────────────────────────────
  it('4. triggered_constraint_costs = 0 when constraint list is empty', () => {
    const r = computeScenario(COSMETIC_BASE);
    expect(r.triggered_constraint_costs).toBe(0);
    expect(r.total_capital_required).toBe(COSMETIC_BASE.estimated_renovation_cost);
  });

  // ─── 5. Scenario with multiple constraints summing to material cost ────────────
  it('5. total_capital_required includes all active triggered constraint costs', () => {
    const constraints = [
      { id: 'c1', triggered_cost_estimate: 150_000, is_active: true },
      { id: 'c2', triggered_cost_estimate: 25_000, is_active: true },
    ];
    const r = computeScenario({
      ...RENO_WITH_CONSTRAINT,
      triggered_constraints: ['c1', 'c2'],
      active_constraints: constraints,
    });
    expect(r.triggered_constraint_costs).toBe(175_000);
    expect(r.total_capital_required).toBe(180_000 + 175_000);
  });

  // ─── 6. Scenario with zero income delta — constraint cost, no rent upside ─────
  it('6. payback_months is null when monthly_income_delta is zero', () => {
    const r = computeScenario({
      ...COSMETIC_BASE,
      pre_scenario_rent_monthly: 12_800,
      post_scenario_rent_monthly: 12_800,
    });
    expect(r.monthly_income_delta).toBe(0);
    expect(r.annual_income_delta).toBe(0);
    expect(r.value_created).toBe(0);
    expect(r.payback_months).toBeNull();
  });

  // ─── 7. Long hold period (60 months) ─────────────────────────────────────────
  it('7. 60-month hold: IRR is well-defined and positive', () => {
    const r = computeScenario({ ...COSMETIC_BASE, hold_period_months: 60 });
    expect(r.irr).not.toBeNull();
    expect(r.irr!).toBeGreaterThan(0);
    expect(r.npv).toBeGreaterThan(0);
  });

  // ─── 8. Short hold period (12 months) ────────────────────────────────────────
  it('8. 12-month hold: IRR still computable, exit value dominates', () => {
    const r = computeScenario({ ...COSMETIC_BASE, hold_period_months: 12 });
    expect(r.irr).not.toBeNull();
    expect(r.total_capital_required).toBe(30_000);
  });

  // ─── 9. Deactivated constraint excluded from calculation ─────────────────────
  it('9. inactive constraint not included even if in triggered_constraints list', () => {
    const inactiveConstraint = { id: 'fire-code-id', triggered_cost_estimate: 150_000, is_active: false };
    const r = computeScenario({
      ...RENO_WITH_CONSTRAINT,
      active_constraints: [inactiveConstraint],
    });
    expect(r.triggered_constraint_costs).toBe(0);
    expect(r.total_capital_required).toBe(180_000); // reno only
  });

  // ─── 10. Monthly income delta is negative (scenario makes income worse) ───────
  it('10. negative income delta: payback_months is null, NPV is deeply negative', () => {
    const r = computeScenario({
      ...COSMETIC_BASE,
      pre_scenario_rent_monthly: 15_000,
      post_scenario_rent_monthly: 12_000,
    });
    expect(r.monthly_income_delta).toBeCloseTo(-3_000, 0);
    expect(r.annual_income_delta).toBeCloseTo(-36_000, 0);
    expect(r.payback_months).toBeNull();
    expect(r.npv).toBeLessThan(0);
  });

  // ─── 11. Very high cap rate → low value_created ──────────────────────────────
  it('11. high cap rate reduces value_created and NPV', () => {
    const base = computeScenario(COSMETIC_BASE);
    const highCap = computeScenario({ ...COSMETIC_BASE, cap_rate: 0.20 });
    // value_created = annual_delta / cap → higher cap → lower value
    expect(highCap.value_created).toBeLessThan(base.value_created);
    expect(highCap.npv).toBeLessThan(base.npv);
  });

  // ─── 12. IRR fails to converge (all cash flows same sign) ────────────────────
  it('12. IRR is null when cash flows have no sign change (zero capital)', () => {
    // If renovation cost = 0 and income delta = 0, cf[0] = 0 and all others = 0 → no sign change
    const r = computeScenario({
      ...COSMETIC_BASE,
      estimated_renovation_cost: 0,
      pre_scenario_rent_monthly: 12_800,
      post_scenario_rent_monthly: 12_800,
    });
    expect(r.irr).toBeNull();
    expect(r.meets_hurdle).toBe(false);
  });
});

// ─── Scenario A: Re-sprinkler + Add Bedrooms (Bowden Street) ─────────────────
describe('Bowden Scenario A — re-sprinkler with fire-code constraint', () => {
  it('total capital = reno + constraint = 330_000, positive NPV, meets hurdle', () => {
    const r = computeScenario(RENO_WITH_CONSTRAINT);
    expect(r.triggered_constraint_costs).toBe(150_000);
    expect(r.total_capital_required).toBe(330_000);
    expect(r.monthly_income_delta).toBeCloseTo(4_000, 0);
    // value_created = 48000 / 0.06 = 800_000
    expect(r.value_created).toBeCloseTo(800_000, 0);
    expect(r.npv).toBeGreaterThan(0);
    expect(r.irr).not.toBeNull();
    expect(r.meets_hurdle).toBe(true);
  });

  it('cosmetic scenario has higher IRR than the re-sprinkler scenario (small capital advantage)', () => {
    const cosmetic = computeScenario(COSMETIC_BASE);
    const reSprinkler = computeScenario(RENO_WITH_CONSTRAINT);
    // Cosmetic has much smaller capital base → higher IRR despite lower absolute income delta
    expect(cosmetic.irr!).toBeGreaterThan(reSprinkler.irr!);
  });
});

// ─── Sensitivity ─────────────────────────────────────────────────────────────
describe('computeScenarioSensitivity', () => {
  it('returns renovation, rent, and cap_rate arrays', () => {
    const s = computeScenarioSensitivity(COSMETIC_BASE);
    expect(s.renovation_cost.length).toBeGreaterThan(0);
    expect(s.post_rent.length).toBeGreaterThan(0);
    expect(s.cap_rate.length).toBeGreaterThan(0);
  });

  it('higher renovation cost reduces NPV monotonically', () => {
    const s = computeScenarioSensitivity(COSMETIC_BASE);
    const npvs = s.renovation_cost.map((p) => p.npv);
    for (let i = 0; i < npvs.length - 1; i++) {
      expect(npvs[i]).toBeGreaterThanOrEqual(npvs[i + 1]);
    }
  });

  it('higher post-reno rent increases NPV monotonically', () => {
    const s = computeScenarioSensitivity(COSMETIC_BASE);
    const npvs = s.post_rent.map((p) => p.npv);
    for (let i = 0; i < npvs.length - 1; i++) {
      expect(npvs[i]).toBeLessThanOrEqual(npvs[i + 1]);
    }
  });
});
