// Deterministic financial calculators — no ML, no external calls. Every number here
// should be reproducible by hand so the user can trust and tune the formulas.

export const COST_RATIO_TARGET = 0.5;

export function costRatio(totalExpenses: number, totalIncome: number): number {
  if (totalIncome <= 0) return 0;
  return totalExpenses / totalIncome;
}

export interface NecessityBucketed {
  amount: number;
  necessity: "must_have" | "good_to_have" | "not_needed";
}

export function necessityBreakdown(transactions: NecessityBucketed[]) {
  const totals = { must_have: 0, good_to_have: 0, not_needed: 0 };
  for (const t of transactions) totals[t.necessity] += t.amount;
  const total = totals.must_have + totals.good_to_have + totals.not_needed;
  return {
    ...totals,
    total,
    notNeededPct: total > 0 ? totals.not_needed / total : 0,
  };
}

export interface GoalProjectionInput {
  currentTotal: number;
  monthlyContribution: number;
  blendedAnnualReturnPct: number;
  monthsRemaining: number;
  targetAmount: number;
}

export function goalProjection({
  currentTotal,
  monthlyContribution,
  blendedAnnualReturnPct,
  monthsRemaining,
  targetAmount,
}: GoalProjectionInput) {
  const r = blendedAnnualReturnPct / 100 / 12;
  const n = monthsRemaining;
  const growthFactor = Math.pow(1 + r, n);
  const lumpSumFv = currentTotal * growthFactor;
  const annuityFactor = r === 0 ? n : (growthFactor - 1) / r;
  const projectedValue = lumpSumFv + monthlyContribution * annuityFactor;
  const shortfall = targetAmount - projectedValue;
  const requiredMonthlyContribution =
    annuityFactor > 0 ? Math.max(0, (targetAmount - lumpSumFv) / annuityFactor) : 0;

  return {
    projectedValue,
    shortfall,
    onTrack: shortfall <= 0,
    requiredMonthlyContribution,
  };
}

export interface InstrumentForComparison {
  id: number;
  name: string;
  expectedAnnualReturnPct: number;
  lockInYears: number | null;
}

const LOCK_IN_TIERS: Array<{ label: string; max: number }> = [
  { label: "liquid (<1y lock-in)", max: 1 },
  { label: "medium (1-5y lock-in)", max: 5 },
  { label: "long (5y+ lock-in)", max: Infinity },
];

function tierFor(lockInYears: number | null) {
  const years = lockInYears ?? 0;
  return LOCK_IN_TIERS.find((t) => years <= t.max)!.label;
}

// Flags instruments that are meaningfully behind the best option in their own liquidity tier.
export function reallocationSuggestions(
  instruments: InstrumentForComparison[],
  meaningfulGapPct = 1.5
) {
  const byTier = new Map<string, InstrumentForComparison[]>();
  for (const inst of instruments) {
    const tier = tierFor(inst.lockInYears);
    if (!byTier.has(tier)) byTier.set(tier, []);
    byTier.get(tier)!.push(inst);
  }

  const suggestions: Array<{
    tier: string;
    laggingInstrument: string;
    betterInstrument: string;
    returnGapPct: number;
  }> = [];

  for (const [tier, group] of byTier) {
    const best = group.reduce((a, b) => (b.expectedAnnualReturnPct > a.expectedAnnualReturnPct ? b : a));
    for (const inst of group) {
      const gap = best.expectedAnnualReturnPct - inst.expectedAnnualReturnPct;
      if (inst.id !== best.id && gap >= meaningfulGapPct) {
        suggestions.push({
          tier,
          laggingInstrument: inst.name,
          betterInstrument: best.name,
          returnGapPct: gap,
        });
      }
    }
  }
  return suggestions;
}

export interface CardRewardProfile {
  id: number;
  name: string;
  rewardProfile: Record<string, number>; // category -> reward rate %, "default" as fallback
}

export function bestCardForCategory(cards: CardRewardProfile[], category: string) {
  let best: { card: CardRewardProfile; rate: number } | null = null;
  for (const card of cards) {
    const rate = card.rewardProfile[category] ?? card.rewardProfile["default"] ?? 0;
    if (!best || rate > best.rate) best = { card, rate };
  }
  return best;
}

export function estimatedReward(amount: number, rewardRatePct: number) {
  return amount * (rewardRatePct / 100);
}

// Model asset-allocation buckets per risk appetite — a starting point the user can
// see and override, not a black-box recommendation.
export type RiskAppetite = "conservative" | "moderate" | "aggressive";

const RISK_MODELS: Record<RiskAppetite, { equity: number; debt: number; gold: number }> = {
  conservative: { equity: 20, debt: 65, gold: 15 },
  moderate: { equity: 50, debt: 35, gold: 15 },
  aggressive: { equity: 75, debt: 15, gold: 10 },
};

// Younger investors have a longer horizon to recover from volatility, so they default
// to a more growth-heavy bucket until they state a preference of their own.
export function defaultRiskAppetite(age: number): RiskAppetite {
  if (age < 35) return "aggressive";
  if (age < 50) return "moderate";
  return "conservative";
}

export interface AssetAllocationInput {
  riskAppetite: RiskAppetite;
  investableMonthlyAmount: number; // income minus fixed costs, recurring
  existingSavingsAmount: number; // lump sum already saved, to be deployed
  emergencyFundMonths: number; // months of expenses already set aside as cash
  monthlyExpenses: number; // used to size the emergency-fund target (6 months)
}

const EMERGENCY_FUND_TARGET_MONTHS = 6;

// Existing savings plug the emergency-fund gap first; only the remainder follows the
// risk-bucketed model. New monthly surplus always follows the risk model directly.
export function suggestAssetAllocation(input: AssetAllocationInput) {
  const model = RISK_MODELS[input.riskAppetite];
  const emergencyFundGapAmount = Math.max(
    0,
    (EMERGENCY_FUND_TARGET_MONTHS - input.emergencyFundMonths) * input.monthlyExpenses
  );

  const lumpForEmergency = Math.min(input.existingSavingsAmount, emergencyFundGapAmount);
  const lumpRemaining = input.existingSavingsAmount - lumpForEmergency;

  return {
    riskAppetite: input.riskAppetite,
    emergencyFundGapAmount,
    lumpSumAllocation: [
      { name: "Emergency fund (liquid)", pct: null, amount: lumpForEmergency },
      { name: "Equity", pct: model.equity, amount: (lumpRemaining * model.equity) / 100 },
      { name: "Debt", pct: model.debt, amount: (lumpRemaining * model.debt) / 100 },
      { name: "Gold", pct: model.gold, amount: (lumpRemaining * model.gold) / 100 },
    ],
    monthlyAllocation: [
      { name: "Equity", pct: model.equity, amount: (input.investableMonthlyAmount * model.equity) / 100 },
      { name: "Debt", pct: model.debt, amount: (input.investableMonthlyAmount * model.debt) / 100 },
      { name: "Gold", pct: model.gold, amount: (input.investableMonthlyAmount * model.gold) / 100 },
    ],
  };
}

// Transactions flagged reimbursable-and-pending are not the user's real spend yet —
// excluded entirely from expense totals until reimbursementStatus becomes "received".
export interface ReimbursableTransaction {
  amount: number;
  isReimbursable: boolean;
  reimbursementStatus: string | null;
}

export function netExpenseAmount(t: ReimbursableTransaction) {
  if (t.isReimbursable && t.reimbursementStatus !== "received") return 0;
  return t.amount;
}
