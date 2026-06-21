import { Router } from "express";
import { prisma } from "../prisma";

export const categoriesRouter = Router();

categoriesRouter.get("/", async (_req, res) => {
  const categories = await prisma.category.findMany({ orderBy: { name: "asc" } });
  res.json(categories);
});

categoriesRouter.post("/", async (req, res) => {
  const { name, group } = req.body;
  const category = await prisma.category.create({ data: { name, group } });
  res.status(201).json(category);
});

categoriesRouter.put("/:id", async (req, res) => {
  const { name, group } = req.body;
  const category = await prisma.category.update({
    where: { id: Number(req.params.id) },
    data: { name, group },
  });
  res.json(category);
});

categoriesRouter.delete("/:id", async (req, res) => {
  await prisma.category.delete({ where: { id: Number(req.params.id) } });
  res.status(204).end();
});
