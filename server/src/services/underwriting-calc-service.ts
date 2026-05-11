// underwriting-calc-service.ts
// Pure function: no database access, no side effects.
// Implements all real estate underwriting formulas for Phase 2 Deal Intelligence.
// Called synchronously by deal_underwriting_models POST/PATCH controllers.

import {
  computeMonthlyDebtPayment,
  computeRemainingBalance,
  computeIRR,
  computeNPV,
  annualizeMonthlyRate,
} from './financial-primitives';

export interface UnderwritingInputs {
  proposed_purchase_price: number;
  down_payment_pct: number;
  senior_debt_rate?: number | null;
  senior_debt_term_months?: number | null;
  senior_debt_amortization_months?: number | null;
  has_construction_loan?: boolean | null;
  construction_loan_amount?: number | null;
  construction_loan_rate?: number | null;
  construction_loan_term_months?: number | null;
  estimated_renovation_cost?: number | null;
  estimated_closing_costs?: number | null;
  estimated_carry_costs?: number | null;
  current_rent_roll_monthly?: number | null;
  projected_post_reno_rent_monthly?: number | null;
  current_other_income_monthly?: number | null;
  projected_other_income_monthly?: number | null;
  current_operating_expenses_monthly?: number | null;
  projected_operating_expenses_monthly?: number | null;
  vacancy_factor_pct?: number | null;
  exit_cap_rate?: number | null;
  hold_period_months?: number | null;
  hurdle_rate?: number | null;
  discount_rate?: number | null;
}

export interface UnderwritingResults {
  total_capital_required: number;
  projected_noi_year_1: number;
  projected_noi_stabilized: number;
  projected_exit_value: number;
  projected_equity_at_exit: number;
  equity_multiple: number;
  irr: number | null;         // annualized decimal (0.183 = 18.3%)
  npv: number;
  cash_on_cash_year_1: number;
  recommended_max_bid: number;
  meets_hurdle: boolean;
}

export interface SensitivityResult {
  purchase_price: Array<{ price: number; irr: number | null }>;
  exit_cap_rate: Array<{ cap: number; irr: number | null }>;
  renovation_cost: Array<{ reno: number; irr: number | null }>;
}

const STABILIZATION_MONTHS = 12; // Phase 2 fixed stabilization

// ─── Core helpers ───────────────────────────────────────────────────────────

function safeNum(v: number | null | undefined, fallback = 0): number {
  return v != null && isFinite(v) ? v : fallback;
}

function buildCashFlows(
  totalCapital: number,
  noiYear1: number,
  noiStabilized: number,
  holdMonths: number,
  monthlyPmt: number,
  equityAtExit: number,
): number[] {
  const cf = new Array(holdMonths + 1).fill(0);
  cf[0] = -totalCapital;
  const monthlyY1 = noiYear1 / 12;
  const monthlyStab = noiStabilized / 12;
  for (let t = 1; t <= holdMonths; t++) {
    const opIncome = t <= STABILIZATION_MONTHS ? monthlyY1 : monthlyStab;
    cf[t] = opIncome - monthlyPmt;
  }
  cf[holdMonths] += equityAtExit;
  return cf;
}

// ─── Main calculation ────────────────────────────────────────────────────────

export function computeUnderwriting(inputs: UnderwritingInputs): UnderwritingResults {
  return _computeForPrice(safeNum(inputs.proposed_purchase_price), inputs);
}

function _computeForPrice(price: number, inputs: UnderwritingInputs): UnderwritingResults {
  const downPct = safeNum(inputs.down_payment_pct, 0.25);
  const seniorDebtRate = safeNum(inputs.senior_debt_rate, 0.07);
  const amortMonths = safeNum(inputs.senior_debt_amortization_months, 360);
  const hasConstLoan = inputs.has_construction_loan === true;
  const reno = safeNum(inputs.estimated_renovation_cost);
  const closing = safeNum(inputs.estimated_closing_costs);
  const carry = safeNum(inputs.estimated_carry_costs);
  const curRent = safeNum(inputs.current_rent_roll_monthly);
  const curOther = safeNum(inputs.current_other_income_monthly);
  const curOpex = safeNum(inputs.current_operating_expenses_monthly);
  const projRent = safeNum(inputs.projected_post_reno_rent_monthly);
  const projOther = safeNum(inputs.projected_other_income_monthly);
  const projOpex = safeNum(inputs.projected_operating_expenses_monthly);
  const vacancyPct = safeNum(inputs.vacancy_factor_pct, 0.05);
  const exitCapRate = safeNum(inputs.exit_cap_rate, 0.06);
  const holdMonths = Math.max(1, Math.round(safeNum(inputs.hold_period_months, 36)));
  const hurdleRate = safeNum(inputs.hurdle_rate, 0.15);
  const discountRate = safeNum(inputs.discount_rate, 0.10);

  // Capital stack
  const equityIn = price * downPct;
  const seniorDebt = price * (1 - downPct);
  const totalCapital = equityIn + closing + carry + (hasConstLoan ? 0 : reno);

  // Debt service
  const pmt = computeMonthlyDebtPayment(seniorDebt, seniorDebtRate, amortMonths);
  const debtBalance = computeRemainingBalance(seniorDebt, seniorDebtRate, amortMonths, holdMonths);

  // NOI
  const egiY1 = (curRent + curOther) * 12 * (1 - vacancyPct);
  const noiY1 = egiY1 - curOpex * 12;
  const egiStab = (projRent + projOther) * 12 * (1 - vacancyPct);
  const noiStab = egiStab - projOpex * 12;

  // Exit
  const exitValue = exitCapRate > 0 ? noiStab / exitCapRate : 0;
  const sellingCosts = exitValue * 0.04;
  const equityAtExit = exitValue - debtBalance - sellingCosts;

  // Cash flows
  const cf = buildCashFlows(totalCapital, noiY1, noiStab, holdMonths, pmt, equityAtExit);

  // IRR
  const monthlyIRR = computeIRR(cf);
  const irrAnnual = monthlyIRR !== null ? annualizeMonthlyRate(monthlyIRR) : null;

  // NPV
  const npv = computeNPV(cf, discountRate);

  // Equity multiple
  const totalReturn = cf.slice(1).reduce((s, v) => s + v, 0);
  const equityMultiple = totalCapital > 0 ? totalReturn / totalCapital : 0;

  // Cash-on-cash year 1
  const year1Flows = cf.slice(1, Math.min(13, cf.length));
  const coc = totalCapital > 0 ? year1Flows.reduce((s, v) => s + v, 0) / totalCapital : 0;

  // Meets hurdle
  const meetsHurdle = irrAnnual !== null && irrAnnual >= hurdleRate;

  // Recommended max bid (computed only for the real entry point, not for recursive calls)
  const recommendedMaxBid = computeRecommendedMaxBid(price, inputs, hurdleRate);

  return {
    total_capital_required: totalCapital,
    projected_noi_year_1: noiY1,
    projected_noi_stabilized: noiStab,
    projected_exit_value: exitValue,
    projected_equity_at_exit: equityAtExit,
    equity_multiple: equityMultiple,
    irr: irrAnnual,
    npv,
    cash_on_cash_year_1: coc,
    recommended_max_bid: recommendedMaxBid,
    meets_hurdle: meetsHurdle,
  };
}

// ─── Recommended Max Bid ─────────────────────────────────────────────────────

function _irrForPrice(price: number, inputs: UnderwritingInputs): number | null {
  return _computeForPriceIRROnly(price, inputs);
}

function _computeForPriceIRROnly(price: number, inputs: UnderwritingInputs): number | null {
  if (price <= 0) return null;
  const downPct = safeNum(inputs.down_payment_pct, 0.25);
  const seniorDebtRate = safeNum(inputs.senior_debt_rate, 0.07);
  const amortMonths = safeNum(inputs.senior_debt_amortization_months, 360);
  const hasConstLoan = inputs.has_construction_loan === true;
  const reno = safeNum(inputs.estimated_renovation_cost);
  const closing = safeNum(inputs.estimated_closing_costs);
  const carry = safeNum(inputs.estimated_carry_costs);
  const curRent = safeNum(inputs.current_rent_roll_monthly);
  const curOther = safeNum(inputs.current_other_income_monthly);
  const curOpex = safeNum(inputs.current_operating_expenses_monthly);
  const projRent = safeNum(inputs.projected_post_reno_rent_monthly);
  const projOther = safeNum(inputs.projected_other_income_monthly);
  const projOpex = safeNum(inputs.projected_operating_expenses_monthly);
  const vacancyPct = safeNum(inputs.vacancy_factor_pct, 0.05);
  const exitCapRate = safeNum(inputs.exit_cap_rate, 0.06);
  const holdMonths = Math.max(1, Math.round(safeNum(inputs.hold_period_months, 36)));

  const equityIn = price * downPct;
  const seniorDebt = price * (1 - downPct);
  const totalCapital = equityIn + closing + carry + (hasConstLoan ? 0 : reno);
  if (totalCapital <= 0) return null;

  const pmt = computeMonthlyDebtPayment(seniorDebt, seniorDebtRate, amortMonths);
  const debtBalance = computeRemainingBalance(seniorDebt, seniorDebtRate, amortMonths, holdMonths);

  const egiY1 = (curRent + curOther) * 12 * (1 - vacancyPct);
  const noiY1 = egiY1 - curOpex * 12;
  const egiStab = (projRent + projOther) * 12 * (1 - vacancyPct);
  const noiStab = egiStab - projOpex * 12;

  const exitValue = exitCapRate > 0 ? noiStab / exitCapRate : 0;
  const sellingCosts = exitValue * 0.04;
  const equityAtExit = exitValue - debtBalance - sellingCosts;

  const cf = buildCashFlows(totalCapital, noiY1, noiStab, holdMonths, pmt, equityAtExit);
  const mIRR = computeIRR(cf);
  return mIRR !== null ? annualizeMonthlyRate(mIRR) : null;
}

function computeRecommendedMaxBid(
  proposedPrice: number,
  inputs: UnderwritingInputs,
  hurdleRate: number,
): number {
  // IRR at $1 — if it doesn't clear the hurdle even at near-zero price, return 0
  const irrAtMin = _irrForPrice(1, inputs);
  if (irrAtMin === null || irrAtMin < hurdleRate) return 0;

  const hi = Math.max(proposedPrice * 2, 1_000_000);
  const irrAtHi = _irrForPrice(hi, inputs);

  // If even the upper bound clears hurdle, return the upper bound (rare)
  if (irrAtHi !== null && irrAtHi >= hurdleRate) return hi;

  // Bisect: find the highest price where IRR >= hurdle (IRR decreases as price increases)
  let lo = 1;
  let upper = hi;
  for (let i = 0; i < 50; i++) {
    const mid = (lo + upper) / 2;
    const irr = _irrForPrice(mid, inputs);
    if (irr !== null && irr >= hurdleRate) {
      lo = mid;
    } else {
      upper = mid;
    }
    if (upper - lo < 1000) break;
  }
  return Math.round(lo / 1000) * 1000; // round to nearest $1K
}

// ─── Sensitivity ─────────────────────────────────────────────────────────────

export function computeSensitivity(inputs: UnderwritingInputs): SensitivityResult {
  const basePrice = safeNum(inputs.proposed_purchase_price);
  const baseReno = safeNum(inputs.estimated_renovation_cost);
  const baseCap = safeNum(inputs.exit_cap_rate, 0.06);

  // Purchase price sensitivity: ±5%, ±10%
  const pricePoints = [-0.10, -0.05, 0, 0.05, 0.10].map((d) => {
    const price = basePrice * (1 + d);
    return { price, irr: _irrForPrice(price, inputs) };
  });

  // Exit cap rate sensitivity: ±50bps, ±100bps
  const capPoints = [-0.01, -0.005, 0, 0.005, 0.01].map((d) => {
    const cap = Math.max(0.001, baseCap + d);
    const modInputs = { ...inputs, exit_cap_rate: cap };
    return { cap, irr: _irrForPrice(basePrice, modInputs) };
  });

  // Renovation cost sensitivity: +10%, +20%, +30%
  const renoPoints = [0, 0.10, 0.20, 0.30].map((d) => {
    const reno = baseReno * (1 + d);
    const modInputs = { ...inputs, estimated_renovation_cost: reno };
    return { reno, irr: _irrForPrice(basePrice, modInputs) };
  });

  return {
    purchase_price: pricePoints,
    exit_cap_rate: capPoints,
    renovation_cost: renoPoints,
  };
}
