import { Router } from "express";
import { prisma } from "../prisma";
import { costRatio, necessityBreakdown, netExpenseAmount, goalProjection } from "../advisor";
import { currentMonth, monthsBetween } from "../dateUtils";
import type { Income, Transaction, Category, InvestmentInstrument, InvestmentContribution } from "../generated/prisma/client";

type TransactionWithCategory = Transaction & { category: Category };
type InstrumentWithContributions = InvestmentInstrument & { contributions: InvestmentContribution[] };

export const dashboardRouter = Router();

dashboardRouter.get("/", async (req, res) => {
  const month = (req.query.month as string) || currentMonth();

  const incomeRows: Income[] = await prisma.income.findMany({ where: { month } });
  const transactions: TransactionWithCategory[] = await prisma.transaction.findMany({
    where: { month },
    include: { category: true },
  });
  const instruments: InstrumentWithContributions[] = await prisma.investmentInstrument.findMany({
    include: { contributions: true },
  });
  const goal = await prisma.goal.findFirst();

  const totalIncome = incomeRows.reduce((sum: number, i: Income) => sum + i.amount, 0);

  const expenseTransactions = transactions.filter((t: TransactionWithCategory) => t.category.group !== "investment");
  const netExpenses = expenseTransactions.reduce(
    (sum: number, t: TransactionWithCategory) => sum + netExpenseAmount(t),
    0
  );

  const necessity = necessityBreakdown(
    expenseTransactions.map((t: TransactionWithCategory) => ({
      amount: netExpenseAmount(t),
      necessity: t.necessity as "must_have" | "good_to_have" | "not_needed",
    }))
  );

  const ratio = costRatio(netExpenses, totalIncome);
  const savings = totalIncome - netExpenses;

  // Latest running value per instrument, to seed the goal projection's current total.
  let currentInvestedTotal = 0;
  let weightedReturnSum = 0;
  let thisMonthContribution = 0;
  for (const inst of instruments) {
    const sorted = [...inst.contributions].sort((a, b) => (a.month < b.month ? 1 : -1));
    const latest = sorted[0];
    const value = latest?.runningValue ?? 0;
    currentInvestedTotal += value;
    weightedReturnSum += value * inst.expectedAnnualReturnPct;
    thisMonthContribution += inst.contributions
      .filter((c: InvestmentContribution) => c.month === month)
      .reduce((sum: number, c: InvestmentContribution) => sum + c.amount, 0);
  }
  const blendedAnnualReturnPct =
    currentInvestedTotal > 0 ? weightedReturnSum / currentInvestedTotal : 0;

  let projection = null;
  if (goal) {
    const monthsRemaining = monthsBetween(new Date(), new Date(goal.targetDate));
    projection = goalProjection({
      currentTotal: currentInvestedTotal,
      monthlyContribution: thisMonthContribution,
      blendedAnnualReturnPct,
      monthsRemaining,
      targetAmount: goal.targetAmount,
    });
  }

  res.json({
    month,
    totalIncome,
    netExpenses,
    savings,
    costRatio: ratio,
    costRatioTargetMet: ratio <= 0.5,
    necessity,
    goal,
    goalProjection: projection,
  });
});
