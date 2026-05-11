// scenario-calc-service.ts
// Pure function: no database access, no side effects.
// Implements scenario NPV/IRR/payback formulas for Phase 4 Scenario Modeling.
// Called synchronously by scenario POST/PATCH controllers.
// Shares core primitives with underwriting-calc-service via financial-primitives.ts.

import { computeIRR, computeNPV, annualizeMonthlyRate } from './financial-primitives';

export interface ActiveConstraint {
  id: string;
  triggered_cost_estimate: number | null;
  is_active: boolean;
}

export interface ScenarioInputs {
  estimated_renovation_cost: number;
  pre_scenario_rent_monthly: number;
  post_scenario_rent_monthly: number;
  cap_rate: number;          // e.g. 0.06
  discount_rate: number;     // e.g. 0.10
  hold_period_months: number;
  triggered_constraints: string[];       // UUIDs of constraints in scope
  active_constraints: ActiveConstraint[]; // full rows, fetched from DB by caller
  hurdle_rate?: number;                   // org default; falls back to 0.15
}

export interface ScenarioResults {
  triggered_constraint_costs: number;
  total_capital_required: number;
  monthly_income_delta: number;
  annual_income_delta: number;
  value_created: number;
  npv: number;
  irr: number | null;           // annualized decimal
  payback_months: number | null;
  meets_hurdle: boolean;
}

export interface ScenarioSensitivity {
  renovation_cost: Array<{ reno: number; npv: number }>;
  post_rent: Array<{ rent: number; npv: number }>;
  cap_rate: Array<{ cap: number; npv: number }>;
}

function safeNum(v: number | null | undefined, fallback = 0): number {
  return v != null && isFinite(v) ? v : fallback;
}

function buildScenarioCashFlows(
  totalCapital: number,
  monthlyIncomeDelta: number,
  valueCreated: number,
  holdMonths: number,
): number[] {
  const hold = Math.max(1, Math.round(holdMonths));
  const cf = new Array(hold + 1).fill(0);
  cf[0] = -totalCapital;
  for (let t = 1; t < hold; t++) {
    cf[t] = monthlyIncomeDelta;
  }
  cf[hold] = monthlyIncomeDelta + valueCreated;
  return cf;
}

export function computeScenario(inputs: ScenarioInputs): ScenarioResults {
  const reno = safeNum(inputs.estimated_renovation_cost);
  const preRent = safeNum(inputs.pre_scenario_rent_monthly);
  const postRent = safeNum(inputs.post_scenario_rent_monthly);
  const capRate = safeNum(inputs.cap_rate, 0.06);
  const discountRate = safeNum(inputs.discount_rate, 0.10);
  const holdMonths = Math.max(1, Math.round(safeNum(inputs.hold_period_months, 36)));
  const hurdleRate = safeNum(inputs.hurdle_rate, 0.15);

  // Triggered constraint costs: sum active constraints whose ID is in triggered list
  const triggeredSet = new Set(inputs.triggered_constraints ?? []);
  const triggered_constraint_costs = (inputs.active_constraints ?? [])
    .filter((c) => c.is_active && triggeredSet.has(c.id))
    .reduce((sum, c) => sum + safeNum(c.triggered_cost_estimate), 0);

  const total_capital_required = reno + triggered_constraint_costs;
  const monthly_income_delta = postRent - preRent;
  const annual_income_delta = monthly_income_delta * 12;

  // Simple equity created at exit = annual income delta / cap rate
  const value_created = capRate > 0 ? annual_income_delta / capRate : 0;

  // Cash flow series
  const cf = buildScenarioCashFlows(total_capital_required, monthly_income_delta, value_created, holdMonths);

  // NPV
  const npv = computeNPV(cf, discountRate);

  // IRR — monthly rate, then annualized
  const monthlyIRR = computeIRR(cf, 0.01);
  const irr = monthlyIRR !== null ? annualizeMonthlyRate(monthlyIRR) : null;

  // Payback
  const payback_months = monthly_income_delta > 0
    ? total_capital_required / monthly_income_delta
    : null;

  const meets_hurdle = irr !== null && irr >= hurdleRate;

  return {
    triggered_constraint_costs,
    total_capital_required,
    monthly_income_delta,
    annual_income_delta,
    value_created,
    npv,
    irr,
    payback_months,
    meets_hurdle,
  };
}

// Sensitivity: NPV across input perturbations, without persisting.
export function computeScenarioSensitivity(inputs: ScenarioInputs): ScenarioSensitivity {
  const baseReno = safeNum(inputs.estimated_renovation_cost);
  const basePostRent = safeNum(inputs.post_scenario_rent_monthly);
  const baseCap = safeNum(inputs.cap_rate, 0.06);

  // Renovation cost ± 10%, ± 20%, ± 30%
  const renoDeltas = [-0.30, -0.20, -0.10, 0, 0.10, 0.20, 0.30];
  const renovation_cost = renoDeltas.map((d) => {
    const reno = baseReno * (1 + d);
    return { reno, npv: computeScenario({ ...inputs, estimated_renovation_cost: reno }).npv };
  });

  // Post-reno rent ± $50, ± $100, ± $200/mo
  const rentDeltas = [-200, -100, -50, 0, 50, 100, 200];
  const post_rent = rentDeltas.map((d) => {
    const rent = basePostRent + d;
    return { rent, npv: computeScenario({ ...inputs, post_scenario_rent_monthly: rent }).npv };
  });

  // Cap rate ± 50bps, ± 100bps
  const capDeltas = [-0.01, -0.005, 0, 0.005, 0.01];
  const cap_rate = capDeltas.map((d) => {
    const cap = Math.max(0.001, baseCap + d);
    return { cap, npv: computeScenario({ ...inputs, cap_rate: cap }).npv };
  });

  return { renovation_cost, post_rent, cap_rate };
}
