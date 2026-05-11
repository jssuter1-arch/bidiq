import { describe, it, expect } from 'vitest';
import { computeUnderwriting, computeSensitivity } from '../services/underwriting-calc-service';

// Standard residential deal used as baseline across tests.
// Priced at 750K so the deal clears the 15% hurdle for scenario 1.
const BASE = {
  proposed_purchase_price: 750_000,
  down_payment_pct: 0.25,
  senior_debt_rate: 0.065,
  senior_debt_amortization_months: 360,
  has_construction_loan: false as boolean,
  estimated_renovation_cost: 100_000,
  estimated_closing_costs: 30_000,
  estimated_carry_costs: 20_000,
  current_rent_roll_monthly: 6_000,
  projected_post_reno_rent_monthly: 9_000,
  current_other_income_monthly: 200,
  projected_other_income_monthly: 300,
  current_operating_expenses_monthly: 2_000,
  projected_operating_expenses_monthly: 2_500,
  vacancy_factor_pct: 0.05,
  exit_cap_rate: 0.065,
  hold_period_months: 36,
  hurdle_rate: 0.15,
  discount_rate: 0.10,
};

describe('computeUnderwriting', () => {
  // ─── Scenario 1: Typical deal that meets hurdle ───────────────────────────

  it('1. typical deal: positive IRR above hurdle, reasonable outputs', () => {
    const r = computeUnderwriting(BASE);

    // totalCapital = equityIn + closing + carry + reno (no construction loan)
    const expectedCapital = BASE.proposed_purchase_price * 0.25 + 30_000 + 20_000 + 100_000;
    expect(r.total_capital_required).toBeCloseTo(expectedCapital, 0);

    // NOI: (rent+other)*12*(1-vacancy) - opex*12
    const expectedNOI1 = (6_000 + 200) * 12 * 0.95 - 2_000 * 12;
    expect(r.projected_noi_year_1).toBeCloseTo(expectedNOI1, 0);
    expect(r.projected_noi_stabilized).toBeGreaterThan(r.projected_noi_year_1);

    expect(r.projected_exit_value).toBeGreaterThan(0);
    expect(r.irr).not.toBeNull();
    expect(r.irr!).toBeGreaterThan(0);
    expect(r.meets_hurdle).toBe(true);
    expect(r.equity_multiple).toBeGreaterThan(1);
    expect(r.recommended_max_bid).toBeGreaterThan(BASE.proposed_purchase_price);
  });

  // ─── Scenario 2: Deal that fails hurdle ───────────────────────────────────

  it('2. fails hurdle: 50% hurdle rate makes every realistic deal fail', () => {
    const r = computeUnderwriting({ ...BASE, hurdle_rate: 0.50 });
    expect(r.meets_hurdle).toBe(false);
    // IRR may still exist and be > 0; it just doesn't clear the bar
    if (r.irr !== null) {
      expect(r.irr).toBeLessThan(0.50);
    }
    // The max bid at 50% hurdle is the price where IRR = 50%,
    // which must be below the (already-too-expensive) proposed price.
    expect(r.recommended_max_bid).toBeLessThan(BASE.proposed_purchase_price);
  });

  // ─── Scenario 3: With construction loan vs. without ───────────────────────

  it('3. construction loan excludes reno from equity capital; IRR is higher with loan', () => {
    const withLoan = computeUnderwriting({ ...BASE, has_construction_loan: true });
    const withoutLoan = computeUnderwriting({ ...BASE, has_construction_loan: false });

    // With loan: totalCapital = equityIn + closing + carry (reno excluded)
    const capitalWithLoan = BASE.proposed_purchase_price * 0.25 + 30_000 + 20_000;
    expect(withLoan.total_capital_required).toBeCloseTo(capitalWithLoan, 0);

    // Without loan: totalCapital includes reno
    const capitalWithoutLoan = capitalWithLoan + 100_000;
    expect(withoutLoan.total_capital_required).toBeCloseTo(capitalWithoutLoan, 0);

    // Less equity deployed → higher IRR on equity
    expect(withLoan.irr).not.toBeNull();
    expect(withoutLoan.irr).not.toBeNull();
    expect(withLoan.irr!).toBeGreaterThan(withoutLoan.irr!);
  });

  // ─── Scenario 4: All-cash deal (down_payment_pct = 1.0) ──────────────────

  it('4. all-cash deal: no debt service, total capital equals purchase price (no extras)', () => {
    const price = 1_000_000;
    const r = computeUnderwriting({
      ...BASE,
      proposed_purchase_price: price,
      down_payment_pct: 1.0,
      estimated_renovation_cost: 0,
      estimated_closing_costs: 0,
      estimated_carry_costs: 0,
    });

    // All equity, no debt: totalCapital = price
    expect(r.total_capital_required).toBeCloseTo(price, 0);

    // No debt balance at exit; equity at exit ≈ exitValue - 4% selling costs
    const expectedEquityAtExit = r.projected_exit_value * 0.96;
    expect(r.projected_equity_at_exit).toBeCloseTo(expectedEquityAtExit, -2);

    // IRR still exists (income + exit proceeds)
    expect(r.irr).not.toBeNull();
    expect(r.irr!).toBeGreaterThan(0);
  });

  // ─── Scenario 5: Negative NOI year 1 ─────────────────────────────────────

  it('5. negative NOI year 1 when opex far exceeds current income', () => {
    const r = computeUnderwriting({
      ...BASE,
      current_rent_roll_monthly: 500,
      current_other_income_monthly: 0,
      current_operating_expenses_monthly: 8_000,
    });

    // Year-1 EGI = (500+0)*12*0.95 = 5700 < opex 96000 → negative NOI
    expect(r.projected_noi_year_1).toBeLessThan(0);
    // Stabilized NOI uses projected income and is still positive
    expect(r.projected_noi_stabilized).toBeGreaterThan(0);
  });

  // ─── Scenario 6: Very high cap rate ──────────────────────────────────────

  it('6. high exit cap rate reduces exit value and IRR vs base', () => {
    const base = computeUnderwriting(BASE);
    const highCap = computeUnderwriting({ ...BASE, exit_cap_rate: 0.12 });

    // exit_value = noi_stab / cap_rate → higher rate → lower value
    expect(highCap.projected_exit_value).toBeLessThan(base.projected_exit_value);
    expect(highCap.projected_exit_value).toBeCloseTo(
      base.projected_noi_stabilized / 0.12,
      -2,
    );

    // Lower exit proceeds → lower IRR
    if (base.irr !== null && highCap.irr !== null) {
      expect(highCap.irr).toBeLessThan(base.irr);
    }
  });

  // ─── Scenario 7: Maximum hold period (60 months) ─────────────────────────

  it('7. 60-month hold: stabilized NOI dominates; IRR is well-defined', () => {
    const r = computeUnderwriting({ ...BASE, hold_period_months: 60 });

    expect(r.irr).not.toBeNull();
    expect(r.projected_exit_value).toBeGreaterThan(0);
    // With 48 of 60 months in stabilized phase, equity multiple should be solid
    expect(r.equity_multiple).toBeGreaterThan(0);
    // More periods of stabilized income vs 36-month hold
    const base = computeUnderwriting(BASE);
    // equity multiple comparison depends on deal structure; at minimum IRR should be > 0
    expect(r.irr!).toBeGreaterThan(0);
  });

  // ─── Scenario 8: Minimum hold period (6 months) ──────────────────────────

  it('8. 6-month hold: all periods within year-1 NOI phase, exit at 6 months', () => {
    const r = computeUnderwriting({ ...BASE, hold_period_months: 6 });

    // Hold ≤ STABILIZATION_MONTHS (12), so every operating period uses year-1 NOI
    expect(r.irr).not.toBeNull();
    expect(r.projected_exit_value).toBeGreaterThan(0);
    expect(r.projected_equity_at_exit).toBeDefined();
  });

  // ─── Scenario 9: Zero renovation cost ────────────────────────────────────

  it('9. zero reno: totalCapital = equityIn + closing + carry only', () => {
    const closing = 30_000;
    const carry = 20_000;
    const r = computeUnderwriting({
      ...BASE,
      estimated_renovation_cost: 0,
      has_construction_loan: false,
    });

    const expected = BASE.proposed_purchase_price * 0.25 + closing + carry;
    expect(r.total_capital_required).toBeCloseTo(expected, 0);
  });

  // ─── Scenario 10: IRR fails to converge (null) ───────────────────────────

  it('10. IRR is null when all post-initial cash flows are non-positive (no sign change)', () => {
    // Zero income + exit_cap_rate 0 → exitValue = 0 → equityAtExit negative → all CFs ≤ 0
    const r = computeUnderwriting({
      ...BASE,
      current_rent_roll_monthly: 0,
      current_other_income_monthly: 0,
      projected_post_reno_rent_monthly: 0,
      projected_other_income_monthly: 0,
      current_operating_expenses_monthly: 0,
      projected_operating_expenses_monthly: 0,
      exit_cap_rate: 0, // exitValue = 0 per service: exitCapRate > 0 ? noi/cap : 0
    });

    expect(r.irr).toBeNull();
    expect(r.meets_hurdle).toBe(false);
    // Capital is still required (equity + costs)
    expect(r.total_capital_required).toBeGreaterThan(0);
  });
});

// ─── Sensitivity analysis ─────────────────────────────────────────────────────

describe('computeSensitivity', () => {
  it('returns 5 price points, 5 cap rate points, 4 reno points', () => {
    const s = computeSensitivity(BASE);
    expect(s.purchase_price).toHaveLength(5);
    expect(s.exit_cap_rate).toHaveLength(5);
    expect(s.renovation_cost).toHaveLength(4);
  });

  it('center price point (delta=0) matches base IRR', () => {
    const s = computeSensitivity(BASE);
    const baseIRR = computeUnderwriting(BASE).irr;
    expect(s.purchase_price[2].irr).not.toBeNull();
    expect(s.purchase_price[2].irr).toBeCloseTo(baseIRR!, 4);
  });

  it('purchase price IRR decreases monotonically as price increases', () => {
    const s = computeSensitivity(BASE);
    const irrs = s.purchase_price.map((p) => p.irr ?? -Infinity);
    for (let i = 0; i < irrs.length - 1; i++) {
      expect(irrs[i]).toBeGreaterThanOrEqual(irrs[i + 1]);
    }
  });

  it('higher exit cap rate reduces IRR (center reno point = base reno)', () => {
    const s = computeSensitivity(BASE);
    // cap rate points: -100bps, -50bps, 0, +50bps, +100bps
    // Lower cap → higher exit value → higher IRR
    const irrs = s.exit_cap_rate.map((p) => p.irr ?? -Infinity);
    expect(irrs[0]).toBeGreaterThanOrEqual(irrs[4]);
  });
});
