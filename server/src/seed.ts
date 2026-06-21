// One-time migration of the original `monthly spend.xlsx` (Payment + Sheet1 tabs) into the new schema,
// so the switch to this app doesn't lose the existing month's data. Re-running is safe — it skips
// categories/instruments/cards that already exist by name.
import "dotenv/config";
import { prisma } from "./prisma";

const SOURCE_MONTH = "2023-07"; // Excel serial date 45139 in the original sheet

interface ExpenseRow {
  category: string;
  amount: number;
  necessity: "must_have" | "good_to_have" | "not_needed";
}

const EXPENSE_ROWS: ExpenseRow[] = [
  { category: "Rent", amount: 18000, necessity: "must_have" },
  { category: "Broadband", amount: 1720, necessity: "must_have" },
  { category: "Mobile Recharge - JIO", amount: 7635, necessity: "must_have" },
  { category: "Mobile Recharge - AIRTEL", amount: 3600, necessity: "must_have" },
  { category: "Grocery", amount: 10000, necessity: "must_have" },
  { category: "Milk", amount: 4800, necessity: "must_have" },
  { category: "Vegetable", amount: 3000, necessity: "must_have" },
];

interface InvestmentRow {
  name: string;
  amount: number;
  expectedAnnualReturnPct: number;
  lockInYears: number | null;
  necessity: "must_have" | "good_to_have" | "not_needed";
}

const INVESTMENT_ROWS: InvestmentRow[] = [
  { name: "Sukanya Samridhi", amount: 5500, expectedAnnualReturnPct: 8.2, lockInYears: 21, necessity: "must_have" },
  { name: "PPF", amount: 5500, expectedAnnualReturnPct: 7.1, lockInYears: 15, necessity: "must_have" },
  { name: "NPS", amount: 4200, expectedAnnualReturnPct: 10, lockInYears: 30, necessity: "must_have" },
  { name: "Mutual Fund", amount: 7000, expectedAnnualReturnPct: 12, lockInYears: 0, necessity: "good_to_have" },
  { name: "Tanishq (Gold)", amount: 7000, expectedAnnualReturnPct: 8, lockInYears: 0, necessity: "good_to_have" },
];

interface CardRow {
  name: string;
  payment: number;
}

const CARD_ROWS: CardRow[] = [
  { name: "SBI Credit card", payment: 5000 },
  { name: "AXIS BANK Credit card", payment: 0 },
  { name: "Kotak bank credit card", payment: 1793 },
];

async function findOrCreateCategory(name: string, group: "expense" | "investment" | "credit_card") {
  const existing = await prisma.category.findFirst({ where: { name } });
  if (existing) return existing;
  return prisma.category.create({ data: { name, group } });
}

async function seedExpenses() {
  for (const row of EXPENSE_ROWS) {
    const category = await findOrCreateCategory(row.category, "expense");
    const already = await prisma.transaction.findFirst({
      where: { categoryId: category.id, month: SOURCE_MONTH },
    });
    if (already) continue;
    await prisma.transaction.create({
      data: {
        date: new Date(`${SOURCE_MONTH}-01`),
        categoryId: category.id,
        amount: row.amount,
        month: SOURCE_MONTH,
        necessity: row.necessity,
        remarks: "Migrated from monthly spend.xlsx",
      },
    });
  }
}

async function seedInvestments() {
  for (const row of INVESTMENT_ROWS) {
    const category = await findOrCreateCategory(row.name, "investment");

    const existingTx = await prisma.transaction.findFirst({
      where: { categoryId: category.id, month: SOURCE_MONTH },
    });
    if (!existingTx) {
      await prisma.transaction.create({
        data: {
          date: new Date(`${SOURCE_MONTH}-01`),
          categoryId: category.id,
          amount: row.amount,
          month: SOURCE_MONTH,
          necessity: row.necessity,
          remarks: "Migrated from monthly spend.xlsx",
        },
      });
    }

    let instrument = await prisma.investmentInstrument.findFirst({ where: { name: row.name } });
    if (!instrument) {
      instrument = await prisma.investmentInstrument.create({
        data: {
          name: row.name,
          expectedAnnualReturnPct: row.expectedAnnualReturnPct,
          lockInYears: row.lockInYears,
        },
      });
    }
    const existingContribution = await prisma.investmentContribution.findFirst({
      where: { instrumentId: instrument.id, month: SOURCE_MONTH },
    });
    if (!existingContribution) {
      await prisma.investmentContribution.create({
        data: {
          instrumentId: instrument.id,
          month: SOURCE_MONTH,
          amount: row.amount,
          runningValue: row.amount,
        },
      });
    }
  }
}

async function seedCreditCards() {
  for (const row of CARD_ROWS) {
    await findOrCreateCategory(row.name, "credit_card");

    let card = await prisma.creditCard.findFirst({ where: { name: row.name } });
    if (!card) {
      card = await prisma.creditCard.create({
        data: { name: row.name, rewardProfile: { default: 1 } },
      });
    }
    if (row.payment > 0) {
      const existingPayment = await prisma.creditCardPayment.findFirst({
        where: { creditCardId: card.id, month: SOURCE_MONTH },
      });
      if (!existingPayment) {
        await prisma.creditCardPayment.create({
          data: {
            creditCardId: card.id,
            month: SOURCE_MONTH,
            amount: row.payment,
            estimatedRewardsEarned: row.payment * 0.01,
          },
        });
      }
    }
  }
}

async function seedIncomeAndGoal() {
  const existingIncome = await prisma.income.findFirst({ where: { month: SOURCE_MONTH } });
  if (!existingIncome) {
    await prisma.income.create({ data: { month: SOURCE_MONTH, source: "Salary", amount: 18000 } });
  }

  const existingGoal = await prisma.goal.findFirst();
  if (!existingGoal) {
    await prisma.goal.create({
      data: { name: "₹30L by Apr 2030", targetAmount: 3000000, targetDate: new Date("2030-04-01") },
    });
  }
}

async function main() {
  await seedExpenses();
  await seedInvestments();
  await seedCreditCards();
  await seedIncomeAndGoal();
  console.log(`Seed complete for month ${SOURCE_MONTH}.`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
