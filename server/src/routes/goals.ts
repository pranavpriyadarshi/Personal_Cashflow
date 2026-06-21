import { Router } from "express";
import { prisma } from "../prisma";

export const goalsRouter = Router();

goalsRouter.get("/", async (req, res) => {
  const goals = await prisma.goal.findMany({ where: { userId: req.userId } });
  res.json(goals);
});

goalsRouter.post("/", async (req, res) => {
  const { name, targetAmount, targetDate, riskAppetite } = req.body;
  const goal = await prisma.goal.create({
    data: { userId: req.userId, name, targetAmount, targetDate: new Date(targetDate), riskAppetite },
  });
  res.status(201).json(goal);
});

goalsRouter.put("/:id", async (req, res) => {
  const { name, targetAmount, targetDate } = req.body;
  const goal = await prisma.goal.update({
    where: { id: Number(req.params.id) },
    data: { name, targetAmount, targetDate: targetDate ? new Date(targetDate) : undefined },
  });
  res.json(goal);
});
