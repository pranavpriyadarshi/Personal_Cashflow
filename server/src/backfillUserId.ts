// One-time script: after registering the first account, assigns all pre-existing
// (pre-auth) rows to that user. Run once: `npx ts-node src/backfillUserId.ts`
import "dotenv/config";
import { prisma } from "./prisma";

async function main() {
  const user = await prisma.user.findFirst({ orderBy: { id: "asc" } });
  if (!user) {
    console.error("No user found — register an account first.");
    process.exit(1);
  }

  const where = { userId: null };
  const results = await Promise.all([
    prisma.income.updateMany({ where, data: { userId: user.id } }),
    prisma.loan.updateMany({ where, data: { userId: user.id } }),
    prisma.subscription.updateMany({ where, data: { userId: user.id } }),
    prisma.transaction.updateMany({ where, data: { userId: user.id } }),
    prisma.creditCard.updateMany({ where, data: { userId: user.id } }),
    prisma.investmentInstrument.updateMany({ where, data: { userId: user.id } }),
    prisma.goal.updateMany({ where, data: { userId: user.id } }),
    prisma.importedTransaction.updateMany({ where, data: { userId: user.id } }),
    prisma.emailAccount.updateMany({ where, data: { userId: user.id } }),
    prisma.budgetEstimate.updateMany({ where, data: { userId: user.id } }),
  ]);

  const labels = [
    "income",
    "loans",
    "subscriptions",
    "transactions",
    "creditCards",
    "investmentInstruments",
    "goals",
    "importedTransactions",
    "emailAccounts",
    "budgetEstimates",
  ];
  results.forEach((r, i) => console.log(`${labels[i]}: ${r.count} rows assigned to user #${user.id} (${user.email})`));
}

main().finally(() => prisma.$disconnect());
