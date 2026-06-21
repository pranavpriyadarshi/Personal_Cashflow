import { Router } from "express";
import { prisma } from "../prisma";
import { addMonths, monthKey } from "../dateUtils";

export const subscriptionsRouter = Router();

const CYCLE_MONTHS: Record<string, number> = { monthly: 1, quarterly: 3, yearly: 12 };

subscriptionsRouter.get("/", async (req, res) => {
  const subscriptions = await prisma.subscription.findMany({
    where: { userId: req.userId },
    include: { category: true },
    orderBy: { nextRenewalDate: "asc" },
  });
  res.json(subscriptions);
});

subscriptionsRouter.post("/", async (req, res) => {
  const { name, categoryId, amount, billingCycle, nextRenewalDate, autoDebit, notes } = req.body;
  const subscription = await prisma.subscription.create({
    data: {
      userId: req.userId,
      name,
      categoryId: Number(categoryId),
      amount: Number(amount),
      billingCycle,
      nextRenewalDate: new Date(nextRenewalDate),
      autoDebit: Boolean(autoDebit),
      notes,
    },
  });
  res.status(201).json(subscription);
});

subscriptionsRouter.put("/:id", async (req, res) => {
  const { name, categoryId, amount, billingCycle, nextRenewalDate, autoDebit, notes } = req.body;
  const subscription = await prisma.subscription.update({
    where: { id: Number(req.params.id) },
    data: {
      name,
      categoryId: categoryId ? Number(categoryId) : undefined,
      amount: amount !== undefined ? Number(amount) : undefined,
      billingCycle,
      nextRenewalDate: nextRenewalDate ? new Date(nextRenewalDate) : undefined,
      autoDebit,
      notes,
    },
  });
  res.json(subscription);
});

subscriptionsRouter.delete("/:id", async (req, res) => {
  await prisma.subscription.delete({ where: { id: Number(req.params.id) } });
  res.status(204).end();
});

// Logs the renewal as an expense transaction and rolls nextRenewalDate forward by the billing cycle.
subscriptionsRouter.post("/:id/mark-paid", async (req, res) => {
  const subscription = await prisma.subscription.findUnique({ where: { id: Number(req.params.id) } });
  if (!subscription) return res.status(404).json({ error: "subscription not found" });

  const paidOn = new Date();
  const transaction = await prisma.transaction.create({
    data: {
      userId: req.userId,
      date: paidOn,
      categoryId: subscription.categoryId,
      amount: subscription.amount,
      month: monthKey(paidOn),
      necessity: "must_have",
      remarks: `Subscription: ${subscription.name}`,
    },
  });

  const monthsToAdd = CYCLE_MONTHS[subscription.billingCycle] ?? 1;
  const updated = await prisma.subscription.update({
    where: { id: subscription.id },
    data: { nextRenewalDate: addMonths(subscription.nextRenewalDate, monthsToAdd) },
  });

  res.json({ subscription: updated, transaction });
});
