-- AlterTable
ALTER TABLE "CreditCard" ADD COLUMN     "userId" INTEGER;

-- AlterTable
ALTER TABLE "EmailAccount" ADD COLUMN     "userId" INTEGER;

-- AlterTable
ALTER TABLE "Goal" ADD COLUMN     "riskAppetite" TEXT,
ADD COLUMN     "userId" INTEGER;

-- AlterTable
ALTER TABLE "ImportedTransaction" ADD COLUMN     "userId" INTEGER;

-- AlterTable
ALTER TABLE "Income" ADD COLUMN     "isFamilyIncome" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "userId" INTEGER;

-- AlterTable
ALTER TABLE "InvestmentInstrument" ADD COLUMN     "userId" INTEGER;

-- AlterTable
ALTER TABLE "Loan" ADD COLUMN     "userId" INTEGER;

-- AlterTable
ALTER TABLE "Subscription" ADD COLUMN     "userId" INTEGER;

-- AlterTable
ALTER TABLE "Transaction" ADD COLUMN     "userId" INTEGER;

-- CreateTable
CREATE TABLE "User" (
    "id" SERIAL NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "dateOfBirth" TIMESTAMP(3) NOT NULL,
    "employmentType" TEXT NOT NULL,
    "monthlyIncomeEstimate" DOUBLE PRECISION NOT NULL,
    "phone" TEXT,
    "dependentsCount" INTEGER,
    "existingMonthlyEmi" DOUBLE PRECISION,
    "riskAppetite" TEXT,
    "cityTier" TEXT,
    "maritalStatus" TEXT,
    "lifeInsuranceCover" DOUBLE PRECISION,
    "healthInsuranceCover" DOUBLE PRECISION,
    "taxRegime" TEXT,
    "emergencyFundMonths" DOUBLE PRECISION,
    "existingSavingsAmount" DOUBLE PRECISION,
    "existingSavingsNotes" TEXT,
    "onboardingStep" TEXT NOT NULL DEFAULT 'profile',
    "onboardingCompletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BudgetEstimate" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER,
    "category" TEXT NOT NULL,
    "label" TEXT,
    "minAmount" DOUBLE PRECISION NOT NULL,
    "maxAmount" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BudgetEstimate_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- AddForeignKey
ALTER TABLE "Income" ADD CONSTRAINT "Income_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Loan" ADD CONSTRAINT "Loan_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BudgetEstimate" ADD CONSTRAINT "BudgetEstimate_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CreditCard" ADD CONSTRAINT "CreditCard_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvestmentInstrument" ADD CONSTRAINT "InvestmentInstrument_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Goal" ADD CONSTRAINT "Goal_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ImportedTransaction" ADD CONSTRAINT "ImportedTransaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmailAccount" ADD CONSTRAINT "EmailAccount_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
