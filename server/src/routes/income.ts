import { Router } from "express";
import { prisma } from "../prisma";

export const incomeRouter = Router();

incomeRouter.get("/", async (_req, res) => {
  const income = await prisma.income.findMany({ orderBy: { month: "desc" } });
  res.json(income);
});

incomeRouter.post("/", async (req, res) => {
  const { month, source, amount } = req.body;
  const income = await prisma.income.create({ data: { month, source, amount } });
  res.status(201).json(income);
});

incomeRouter.put("/:id", async (req, res) => {
  const { month, source, amount } = req.body;
  const income = await prisma.income.update({
    where: { id: Number(req.params.id) },
    data: { month, source, amount },
  });
  res.json(income);
});

incomeRouter.delete("/:id", async (req, res) => {
  await prisma.income.delete({ where: { id: Number(req.params.id) } });
  res.status(204).end();
});
