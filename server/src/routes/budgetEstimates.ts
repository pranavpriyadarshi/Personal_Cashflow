import { Router } from "express";
import { prisma } from "../prisma";

export const budgetEstimatesRouter = Router();

budgetEstimatesRouter.get("/", async (req, res) => {
  const estimates = await prisma.budgetEstimate.findMany({
    where: { userId: req.userId },
    orderBy: { createdAt: "asc" },
  });
  res.json(estimates);
});

budgetEstimatesRouter.post("/", async (req, res) => {
  const { category, label, minAmount, maxAmount } = req.body;
  const estimate = await prisma.budgetEstimate.create({
    data: {
      userId: req.userId,
      category,
      label,
      minAmount: Number(minAmount),
      maxAmount: maxAmount !== undefined && maxAmount !== "" ? Number(maxAmount) : Number(minAmount),
    },
  });
  res.status(201).json(estimate);
});

budgetEstimatesRouter.put("/:id", async (req, res) => {
  const { category, label, minAmount, maxAmount } = req.body;
  const estimate = await prisma.budgetEstimate.update({
    where: { id: Number(req.params.id) },
    data: {
      category,
      label,
      minAmount: minAmount !== undefined ? Number(minAmount) : undefined,
      maxAmount: maxAmount !== undefined ? Number(maxAmount) : undefined,
    },
  });
  res.json(estimate);
});

budgetEstimatesRouter.delete("/:id", async (req, res) => {
  await prisma.budgetEstimate.delete({ where: { id: Number(req.params.id) } });
  res.status(204).end();
});
