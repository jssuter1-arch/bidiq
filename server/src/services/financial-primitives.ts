// financial-primitives.ts
// Shared financial math primitives used by both the underwriting calc service
// and the scenario calc service. Extracting here prevents IRR/NPV drift between tools.

// ─── Internal helpers ────────────────────────────────────────────────────────

function _monthlyPayment(principal: number, monthlyRate: number, amortMonths: number): number {
  if (principal <= 0 || amortMonths <= 0) return 0;
  if (monthlyRate === 0) return principal / amortMonths;
  const factor = Math.pow(1 + monthlyRate, amortMonths);
  return principal * (monthlyRate * factor) / (factor - 1);
}

function _remainingBalance(
  principal: number,
  monthlyRate: number,
  monthlyPmt: number,
  monthsPaid: number,
): number {
  if (principal <= 0 || monthsPaid <= 0) return 0;
  if (monthlyRate === 0) return Math.max(0, principal - monthlyPmt * monthsPaid);
  const factor = Math.pow(1 + monthlyRate, monthsPaid);
  return principal * factor - monthlyPmt * (factor - 1) / monthlyRate;
}

// ─── Exports ─────────────────────────────────────────────────────────────────

export function computeMonthlyDebtPayment(
  principal: number,
  annualRate: number,
  amortMonths: number,
): number {
  return _monthlyPayment(principal, annualRate / 12, amortMonths);
}

export function computeRemainingBalance(
  principal: number,
  annualRate: number,
  amortMonths: number,
  monthsPaid: number,
): number {
  const mr = annualRate / 12;
  const pmt = _monthlyPayment(principal, mr, amortMonths);
  return _remainingBalance(principal, mr, pmt, monthsPaid);
}

// Newton-Raphson IRR — returns the periodic (monthly) rate.
// Cash flows must contain at least one sign change.
// Returns null if non-convergent or no real solution exists.
export function computeIRR(cashFlows: number[], initialGuess = 0.01): number | null {
  const hasPositive = cashFlows.some((c) => c > 0);
  const hasNegative = cashFlows.some((c) => c < 0);
  if (!hasPositive || !hasNegative) return null;

  let r = initialGuess;
  for (let iter = 0; iter < 100; iter++) {
    let npv = 0;
    let dnpv = 0;
    for (let t = 0; t < cashFlows.length; t++) {
      if (r <= -1) { r = 0.001; break; }
      const disc = Math.pow(1 + r, t);
      npv += cashFlows[t] / disc;
      if (t > 0) dnpv -= (t * cashFlows[t]) / (disc * (1 + r));
    }
    if (Math.abs(dnpv) < 1e-12) break;
    const dr = npv / dnpv;
    r -= dr;
    if (Math.abs(dr) < 1e-7) break;
  }
  if (!isFinite(r) || isNaN(r) || r <= -1 || r > 10) return null;
  return r; // monthly (periodic) rate
}

// Discounts monthly cash flows at the given annual rate.
export function computeNPV(cashFlows: number[], annualDiscountRate: number): number {
  const discMonthly = Math.pow(1 + annualDiscountRate, 1 / 12) - 1;
  let npv = 0;
  for (let t = 0; t < cashFlows.length; t++) {
    npv += cashFlows[t] / Math.pow(1 + discMonthly, t);
  }
  return npv;
}

export function annualizeMonthlyRate(monthlyRate: number): number {
  return Math.pow(1 + monthlyRate, 12) - 1;
}

export function deannualizeRate(annualRate: number): number {
  return Math.pow(1 + annualRate, 1 / 12) - 1;
}
