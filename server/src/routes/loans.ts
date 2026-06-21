import { Router } from "express";
import { prisma } from "../prisma";
import { computeLoanStage } from "../loanCalculator";
import { currentMonth } from "../dateUtils";
import type { Loan } from "../generated/prisma/client";

export const loansRouter = Router();

function withStage(loan: Loan) {
  const stage = computeLoanStage({
    principalAmount: loan.principalAmount,
    interestRatePct: loan.interestRatePct,
    tenureMonths: loan.tenureMonths,
    emiAmount: loan.emiAmount,
    firstEmiDate: loan.firstEmiDate,
    outstandingPrincipal: loan.outstandingPrincipal,
  });
  return { ...loan, stage };
}

loansRouter.get("/", async (_req, res) => {
  const loans: Loan[] = await prisma.loan.findMany({ orderBy: { createdAt: "asc" } });
  res.json(loans.map(withStage));
});

loansRouter.post("/", async (req, res) => {
  const { name, lenderName, loanType, principalAmount, interestRatePct, tenureMonths, emiAmount, loanStartDate, firstEmiDate, outstandingPrincipal } =
    req.body;
  const loan = await prisma.loan.create({
    data: {
      name,
      lenderName,
      loanType,
      principalAmount: Number(principalAmount),
      interestRatePct: Number(interestRatePct),
      tenureMonths: Number(tenureMonths),
      emiAmount: Number(emiAmount),
      loanStartDate: new Date(loanStartDate),
      firstEmiDate: new Date(firstEmiDate),
      outstandingPrincipal: outstandingPrincipal !== undefined && outstandingPrincipal !== "" ? Number(outstandingPrincipal) : null,
    },
  });
  res.status(201).json(withStage(loan));
});

loansRouter.put("/:id", async (req, res) => {
  const { name, lenderName, loanType, principalAmount, interestRatePct, tenureMonths, emiAmount, loanStartDate, firstEmiDate, outstandingPrincipal, status } =
    req.body;
  const loan = await prisma.loan.update({
    where: { id: Number(req.params.id) },
    data: {
      name,
      lenderName,
      loanType,
      principalAmount: principalAmount !== undefined ? Number(principalAmount) : undefined,
      interestRatePct: interestRatePct !== undefined ? Number(interestRatePct) : undefined,
      tenureMonths: tenureMonths !== undefined ? Number(tenureMonths) : undefined,
      emiAmount: emiAmount !== undefined ? Number(emiAmount) : undefined,
      loanStartDate: loanStartDate ? new Date(loanStartDate) : undefined,
      firstEmiDate: firstEmiDate ? new Date(firstEmiDate) : undefined,
      outstandingPrincipal:
        outstandingPrincipal === "" || outstandingPrincipal === null ? null : outstandingPrincipal !== undefined ? Number(outstandingPrincipal) : undefined,
      status,
    },
  });
  res.json(withStage(loan));
});

loansRouter.delete("/:id", async (req, res) => {
  await prisma.loan.delete({ where: { id: Number(req.params.id) } });
  res.status(204).end();
});

// Optional convenience: log this month's EMI as a real expense transaction against the "EMI/Loan" category,
// and optionally refresh the outstanding principal from the latest statement in the same call.
loansRouter.post("/:id/log-emi", async (req, res) => {
  const loan = await prisma.loan.findUnique({ where: { id: Number(req.params.id) } });
  if (!loan) return res.status(404).json({ error: "loan not found" });

  let category = await prisma.category.findFirst({ where: { name: "EMI/Loan" } });
  if (!category) {
    category = await prisma.category.create({ data: { name: "EMI/Loan", group: "expense" } });
  }

  const paidOn = new Date();
  const transaction = await prisma.transaction.create({
    data: {
      date: paidOn,
      categoryId: category.id,
      amount: loan.emiAmount,
      month: currentMonth(),
      necessity: "must_have",
      remarks: `EMI: ${loan.name}`,
    },
  });

  const { outstandingPrincipal } = req.body ?? {};
  const updated = await prisma.loan.update({
    where: { id: loan.id },
    data: {
      outstandingPrincipal:
        outstandingPrincipal !== undefined && outstandingPrincipal !== "" ? Number(outstandingPrincipal) : loan.outstandingPrincipal,
    },
  });

  res.json({ loan: withStage(updated), transaction });
});
