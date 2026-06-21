-- AlterTable
ALTER TABLE "Income" ADD COLUMN     "linkedTransactionId" INTEGER,
ADD COLUMN     "type" TEXT NOT NULL DEFAULT 'salary';

-- CreateTable
CREATE TABLE "Loan" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "lenderName" TEXT,
    "loanType" TEXT NOT NULL,
    "principalAmount" DOUBLE PRECISION NOT NULL,
    "interestRatePct" DOUBLE PRECISION NOT NULL,
    "tenureMonths" INTEGER NOT NULL,
    "emiAmount" DOUBLE PRECISION NOT NULL,
    "loanStartDate" TIMESTAMP(3) NOT NULL,
    "firstEmiDate" TIMESTAMP(3) NOT NULL,
    "outstandingPrincipal" DOUBLE PRECISION,
    "status" TEXT NOT NULL DEFAULT 'active',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Loan_pkey" PRIMARY KEY ("id")
);
