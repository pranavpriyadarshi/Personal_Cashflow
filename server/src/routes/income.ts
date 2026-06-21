import { Router } from "express";
import { prisma } from "../prisma";

export const incomeRouter = Router();

incomeRouter.get("/", async (req, res) => {
  const income = await prisma.income.findMany({ where: { userId: req.userId }, orderBy: { month: "desc" } });
  res.json(income);
});

incomeRouter.post("/", async (req, res) => {
  const { month, source, amount, type, linkedTransactionId, isFamilyIncome } = req.body;
  const income = await prisma.income.create({
    data: {
      userId: req.userId,
      month,
      source,
      amount: Number(amount),
      type: type ?? "salary",
      isFamilyIncome: Boolean(isFamilyIncome),
      linkedTransactionId: linkedTransactionId ? Number(linkedTransactionId) : null,
    },
  });

  // Settling a reimbursement here also flips the original expense's status, so the
  // Reimbursement Tracker and this income entry never fall out of sync.
  if (type === "reimbursement" && linkedTransactionId) {
    await prisma.transaction.update({
      where: { id: Number(linkedTransactionId) },
      data: { reimbursementStatus: "received" },
    });
  }

  res.status(201).json(income);
});

incomeRouter.put("/:id", async (req, res) => {
  const { month, source, amount, type, linkedTransactionId, isFamilyIncome } = req.body;
  const income = await prisma.income.update({
    where: { id: Number(req.params.id) },
    data: {
      month,
      source,
      amount: amount !== undefined ? Number(amount) : undefined,
      type,
      isFamilyIncome,
      linkedTransactionId: linkedTransactionId ? Number(linkedTransactionId) : undefined,
    },
  });
  res.json(income);
});

incomeRouter.delete("/:id", async (req, res) => {
  await prisma.income.delete({ where: { id: Number(req.params.id) } });
  res.status(204).end();
});
