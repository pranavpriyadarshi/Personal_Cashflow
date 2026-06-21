import { Router } from "express";
import { prisma } from "../prisma";
import { bestCardForCategory, type CardRewardProfile } from "../advisor";
import type { Transaction, Category, CreditCard } from "../generated/prisma/client";

type TransactionWithCategory = Transaction & { category: Category };

export const transactionsRouter = Router();

transactionsRouter.get("/", async (req, res) => {
  const { month } = req.query;
  const transactions = await prisma.transaction.findMany({
    where: { userId: req.userId, month: month ? String(month) : undefined },
    include: { category: true },
    orderBy: { date: "desc" },
  });
  res.json(transactions);
});

transactionsRouter.post("/", async (req, res) => {
  const {
    date,
    categoryId,
    amount,
    remarks,
    month,
    necessity,
    isReimbursable,
    reimbursementParty,
    reimbursementStatus,
  } = req.body;
  const transaction = await prisma.transaction.create({
    data: {
      userId: req.userId,
      date: new Date(date),
      categoryId,
      amount,
      remarks,
      month,
      necessity,
      isReimbursable: Boolean(isReimbursable),
      reimbursementParty: isReimbursable ? reimbursementParty : null,
      reimbursementStatus: isReimbursable ? reimbursementStatus ?? "pending" : null,
    },
  });
  res.status(201).json(transaction);
});

transactionsRouter.put("/:id", async (req, res) => {
  const {
    date,
    categoryId,
    amount,
    remarks,
    month,
    necessity,
    isReimbursable,
    reimbursementParty,
    reimbursementStatus,
  } = req.body;
  const transaction = await prisma.transaction.update({
    where: { id: Number(req.params.id) },
    data: {
      date: date ? new Date(date) : undefined,
      categoryId,
      amount,
      remarks,
      month,
      necessity,
      isReimbursable: Boolean(isReimbursable),
      reimbursementParty: isReimbursable ? reimbursementParty : null,
      reimbursementStatus: isReimbursable ? reimbursementStatus : null,
    },
  });
  res.json(transaction);
});

transactionsRouter.delete("/:id", async (req, res) => {
  await prisma.transaction.delete({ where: { id: Number(req.params.id) } });
  res.status(204).end();
});

// Reimbursement Tracker: every reimbursable transaction regardless of month, with pending total.
transactionsRouter.get("/reimbursements", async (req, res) => {
  const reimbursements: TransactionWithCategory[] = await prisma.transaction.findMany({
    where: { userId: req.userId, isReimbursable: true },
    include: { category: true },
    orderBy: { date: "desc" },
  });
  const pendingTotal = reimbursements
    .filter((t: TransactionWithCategory) => t.reimbursementStatus !== "received")
    .reduce((sum: number, t: TransactionWithCategory) => sum + t.amount, 0);
  res.json({ reimbursements, pendingTotal });
});

// Card routing suggestion at quick-add time: which configured card earns the best reward for a category.
transactionsRouter.get("/best-card", async (req, res) => {
  const { category } = req.query;
  if (!category) return res.status(400).json({ error: "category query param required" });
  const cards: CreditCard[] = await prisma.creditCard.findMany({ where: { userId: req.userId } });
  const cardProfiles: CardRewardProfile[] = cards.map((c: CreditCard) => ({
    id: c.id,
    name: c.name,
    rewardProfile: c.rewardProfile as Record<string, number>,
  }));
  const best = bestCardForCategory(cardProfiles, String(category));
  res.json(best);
});
