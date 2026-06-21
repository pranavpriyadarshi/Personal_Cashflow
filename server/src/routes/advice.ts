import { Router } from "express";
import { prisma } from "../prisma";
import { defaultRiskAppetite, suggestAssetAllocation, type RiskAppetite } from "../advisor";
import { currentMonth } from "../dateUtils";

export const adviceRouter = Router();

const CYCLE_MONTHS: Record<string, number> = { monthly: 1, quarterly: 3, yearly: 12 };

function ageInYears(dateOfBirth: Date) {
  const now = new Date();
  let age = now.getFullYear() - dateOfBirth.getFullYear();
  const hadBirthdayThisYear =
    now.getMonth() > dateOfBirth.getMonth() ||
    (now.getMonth() === dateOfBirth.getMonth() && now.getDate() >= dateOfBirth.getDate());
  if (!hadBirthdayThisYear) age -= 1;
  return age;
}

// Pulls together everything onboarded so far — income, fixed costs (rent/fees/EMIs/bills/
// travel/dining/shopping), risk appetite, and existing savings — into one allocation suggestion.
adviceRouter.get("/allocation", async (req, res) => {
  const userId = req.userId;
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return res.status(404).json({ error: "user not found" });

  const month = currentMonth();
  const [incomeRows, loans, subscriptions, budgetEstimates] = await Promise.all([
    prisma.income.findMany({ where: { userId, month } }),
    prisma.loan.findMany({ where: { userId, status: "active" } }),
    prisma.subscription.findMany({ where: { userId } }),
    prisma.budgetEstimate.findMany({ where: { userId } }),
  ]);

  const monthlyIncome =
    incomeRows.length > 0 ? incomeRows.reduce((sum, i) => sum + i.amount, 0) : user.monthlyIncomeEstimate ?? 0;

  const emiTotal = loans.reduce((sum, l) => sum + l.emiAmount, 0);
  const subscriptionTotal = subscriptions.reduce(
    (sum, s) => sum + s.amount / (CYCLE_MONTHS[s.billingCycle] ?? 1),
    0
  );
  const budgetTotal = budgetEstimates.reduce((sum, b) => sum + (b.minAmount + b.maxAmount) / 2, 0);

  const fixedCosts = emiTotal + subscriptionTotal + budgetTotal;
  const investableMonthlyAmount = Math.max(0, monthlyIncome - fixedCosts);

  const riskAppetite: RiskAppetite =
    (user.riskAppetite as RiskAppetite | null) ?? defaultRiskAppetite(user.dateOfBirth ? ageInYears(user.dateOfBirth) : 35);

  const allocation = suggestAssetAllocation({
    riskAppetite,
    investableMonthlyAmount,
    existingSavingsAmount: user.existingSavingsAmount ?? 0,
    emergencyFundMonths: user.emergencyFundMonths ?? 0,
    monthlyExpenses: fixedCosts,
  });

  res.json({
    monthlyIncome,
    fixedCosts: { emiTotal, subscriptionTotal, budgetTotal, total: fixedCosts },
    investableMonthlyAmount,
    riskAppetiteUsed: riskAppetite,
    riskAppetiteIsDefaulted: user.riskAppetite == null,
    ...allocation,
  });
});
