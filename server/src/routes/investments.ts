import { Router } from "express";
import { prisma } from "../prisma";
import { reallocationSuggestions } from "../advisor";

export const investmentsRouter = Router();

investmentsRouter.get("/", async (req, res) => {
  const instruments = await prisma.investmentInstrument.findMany({
    where: { userId: req.userId },
    include: { contributions: true },
  });
  res.json(instruments);
});

investmentsRouter.post("/", async (req, res) => {
  const { name, expectedAnnualReturnPct, lockInYears, taxBenefitNotes } = req.body;
  const instrument = await prisma.investmentInstrument.create({
    data: { userId: req.userId, name, expectedAnnualReturnPct, lockInYears, taxBenefitNotes },
  });
  res.status(201).json(instrument);
});

investmentsRouter.put("/:id", async (req, res) => {
  const { name, expectedAnnualReturnPct, lockInYears, taxBenefitNotes } = req.body;
  const instrument = await prisma.investmentInstrument.update({
    where: { id: Number(req.params.id) },
    data: { name, expectedAnnualReturnPct, lockInYears, taxBenefitNotes },
  });
  res.json(instrument);
});

investmentsRouter.delete("/:id", async (req, res) => {
  await prisma.investmentInstrument.delete({ where: { id: Number(req.params.id) } });
  res.status(204).end();
});

investmentsRouter.post("/:id/contributions", async (req, res) => {
  const { month, amount, runningValue } = req.body;
  const contribution = await prisma.investmentContribution.create({
    data: { instrumentId: Number(req.params.id), month, amount, runningValue },
  });
  res.status(201).json(contribution);
});

investmentsRouter.get("/reallocation-suggestions", async (req, res) => {
  const instruments = await prisma.investmentInstrument.findMany({ where: { userId: req.userId } });
  res.json(reallocationSuggestions(instruments));
});
