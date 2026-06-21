// Standard reducing-balance amortization math, used to derive a loan's stage (EMIs paid,
// outstanding principal) without requiring the user to log every single EMI by hand.
import { addMonths, monthsBetween } from "./dateUtils";

function monthlyRate(annualRatePct: number) {
  return annualRatePct / 100 / 12;
}

// Remaining balance after `paymentsMade` EMIs of a standard amortizing loan.
export function outstandingAfterPayments(
  principal: number,
  annualRatePct: number,
  emiAmount: number,
  paymentsMade: number
): number {
  const r = monthlyRate(annualRatePct);
  if (paymentsMade <= 0) return principal;
  if (r === 0) return Math.max(0, principal - emiAmount * paymentsMade);
  const growth = Math.pow(1 + r, paymentsMade);
  return Math.max(0, principal * growth - (emiAmount * (growth - 1)) / r);
}

// Reverse-solves how many EMIs have been paid given a known current outstanding balance.
export function paymentsMadeFromOutstanding(
  principal: number,
  annualRatePct: number,
  tenureMonths: number,
  emiAmount: number,
  outstanding: number
): number {
  const r = monthlyRate(annualRatePct);
  if (r === 0) {
    return Math.max(0, Math.min(tenureMonths, Math.round((principal - outstanding) / emiAmount)));
  }
  const numerator = emiAmount - outstanding * r;
  const denominator = emiAmount - principal * r;
  if (numerator <= 0 || denominator <= 0) return 0;
  const k = Math.log(numerator / denominator) / Math.log(1 + r);
  return Math.max(0, Math.min(tenureMonths, Math.round(k)));
}

// Falls back to counting elapsed months since the first EMI when no outstanding balance is known.
export function paymentsMadeFromDates(firstEmiDate: Date, tenureMonths: number, asOf: Date = new Date()): number {
  const elapsed = monthsBetween(firstEmiDate, asOf) + 1; // first EMI month counts as payment 1
  return Math.max(0, Math.min(tenureMonths, elapsed));
}

export interface LoanStageInput {
  principalAmount: number;
  interestRatePct: number;
  tenureMonths: number;
  emiAmount: number;
  firstEmiDate: Date;
  outstandingPrincipal: number | null;
}

export interface LoanStage {
  emisPaid: number;
  emisRemaining: number;
  percentComplete: number;
  estimatedOutstanding: number;
  payoffDate: Date;
  isClosed: boolean;
}

export function computeLoanStage(loan: LoanStageInput): LoanStage {
  const emisPaid =
    loan.outstandingPrincipal != null
      ? paymentsMadeFromOutstanding(
          loan.principalAmount,
          loan.interestRatePct,
          loan.tenureMonths,
          loan.emiAmount,
          loan.outstandingPrincipal
        )
      : paymentsMadeFromDates(loan.firstEmiDate, loan.tenureMonths);

  const estimatedOutstanding =
    loan.outstandingPrincipal ??
    outstandingAfterPayments(loan.principalAmount, loan.interestRatePct, loan.emiAmount, emisPaid);

  return {
    emisPaid,
    emisRemaining: loan.tenureMonths - emisPaid,
    percentComplete: loan.tenureMonths > 0 ? emisPaid / loan.tenureMonths : 0,
    estimatedOutstanding,
    payoffDate: addMonths(loan.firstEmiDate, loan.tenureMonths - 1),
    isClosed: emisPaid >= loan.tenureMonths || estimatedOutstanding <= 0,
  };
}
