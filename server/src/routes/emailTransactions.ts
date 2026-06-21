import { Router } from "express";
import { prisma } from "../prisma";

export const emailTransactionsRouter = Router();

emailTransactionsRouter.get("/", async (req, res) => {
  const { reconciled } = req.query;
  const transactions = await prisma.emailTransaction.findMany({
    where: reconciled !== undefined ? { reconciled: reconciled === "true" } : undefined,
    include: { emailAccount: { select: { emailAddress: true } } },
    orderBy: { receivedAt: "desc" },
  });
  res.json(transactions);
});

emailTransactionsRouter.put("/:id/reconcile", async (req, res) => {
  const { linkedTransactionId } = req.body;
  const updated = await prisma.emailTransaction.update({
    where: { id: Number(req.params.id) },
    data: { reconciled: true, linkedTransactionId },
  });
  res.json(updated);
});
