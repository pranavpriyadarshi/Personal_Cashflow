import { Router } from "express";
import { prisma } from "../prisma";
import { estimatedReward } from "../advisor";

export const creditCardsRouter = Router();

creditCardsRouter.get("/", async (_req, res) => {
  const cards = await prisma.creditCard.findMany({ include: { payments: true } });
  res.json(cards);
});

creditCardsRouter.post("/", async (req, res) => {
  const { name, rewardProfile } = req.body;
  const card = await prisma.creditCard.create({ data: { name, rewardProfile } });
  res.status(201).json(card);
});

creditCardsRouter.put("/:id", async (req, res) => {
  const { name, rewardProfile } = req.body;
  const card = await prisma.creditCard.update({
    where: { id: Number(req.params.id) },
    data: { name, rewardProfile },
  });
  res.json(card);
});

creditCardsRouter.delete("/:id", async (req, res) => {
  await prisma.creditCard.delete({ where: { id: Number(req.params.id) } });
  res.status(204).end();
});

creditCardsRouter.post("/:id/payments", async (req, res) => {
  const { month, amount, category } = req.body;
  const card = await prisma.creditCard.findUnique({ where: { id: Number(req.params.id) } });
  if (!card) return res.status(404).json({ error: "card not found" });
  const rewardProfile = card.rewardProfile as Record<string, number>;
  const rate = rewardProfile[category] ?? rewardProfile["default"] ?? 0;
  const payment = await prisma.creditCardPayment.create({
    data: {
      creditCardId: card.id,
      month,
      amount,
      estimatedRewardsEarned: estimatedReward(amount, rate),
    },
  });
  res.status(201).json(payment);
});
