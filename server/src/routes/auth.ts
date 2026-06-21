import { Router } from "express";
import { prisma } from "../prisma";
import { hashPassword, comparePassword, signToken } from "../auth";
import { requireAuth } from "../middleware/requireAuth";

export const authRouter = Router();

const PROFILE_FIELDS = [
  "name",
  "dateOfBirth",
  "employmentType",
  "monthlyIncomeEstimate",
  "phone",
  "dependentsCount",
  "existingMonthlyEmi",
  "riskAppetite",
  "cityTier",
  "maritalStatus",
  "lifeInsuranceCover",
  "healthInsuranceCover",
  "taxRegime",
  "emergencyFundMonths",
  "existingSavingsAmount",
  "existingSavingsNotes",
] as const;

function sanitizeUser(user: { passwordHash: string; [key: string]: unknown }) {
  const { passwordHash, ...rest } = user;
  return rest;
}

authRouter.post("/register", async (req, res) => {
  const { email, password, name } = req.body;
  if (!email || !password || !name) {
    return res.status(400).json({ error: "email, password, and name are required" });
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) return res.status(409).json({ error: "an account with this email already exists" });

  const passwordHash = await hashPassword(password);
  const user = await prisma.user.create({ data: { email, passwordHash, name } });

  res.status(201).json({ token: signToken(user.id), user: sanitizeUser(user) });
});

authRouter.post("/login", async (req, res) => {
  const { email, password } = req.body;
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !(await comparePassword(password, user.passwordHash))) {
    return res.status(401).json({ error: "invalid email or password" });
  }
  res.json({ token: signToken(user.id), user: sanitizeUser(user) });
});

authRouter.get("/me", requireAuth, async (req, res) => {
  const user = await prisma.user.findUnique({ where: { id: req.userId } });
  if (!user) return res.status(404).json({ error: "user not found" });
  res.json(sanitizeUser(user));
});

authRouter.put("/me", requireAuth, async (req, res) => {
  const data: Record<string, unknown> = {};
  for (const field of PROFILE_FIELDS) {
    if (req.body[field] === undefined) continue;
    if (field === "dateOfBirth") data[field] = req.body[field] ? new Date(req.body[field]) : null;
    else data[field] = req.body[field];
  }
  if (req.body.onboardingStep !== undefined) data.onboardingStep = req.body.onboardingStep;
  if (req.body.onboardingCompletedAt !== undefined) {
    data.onboardingCompletedAt = req.body.onboardingCompletedAt ? new Date(req.body.onboardingCompletedAt) : null;
  }

  const user = await prisma.user.update({ where: { id: req.userId }, data });
  res.json(sanitizeUser(user));
});

// Separate from profile updates: changing the login identifier needs uniqueness checking.
authRouter.put("/email", requireAuth, async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: "email is required" });
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing && existing.id !== req.userId) return res.status(409).json({ error: "that email is already in use" });
  const user = await prisma.user.update({ where: { id: req.userId }, data: { email } });
  res.json(sanitizeUser(user));
});

authRouter.put("/password", requireAuth, async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  const user = await prisma.user.findUnique({ where: { id: req.userId } });
  if (!user || !(await comparePassword(currentPassword, user.passwordHash))) {
    return res.status(401).json({ error: "current password is incorrect" });
  }
  const passwordHash = await hashPassword(newPassword);
  await prisma.user.update({ where: { id: req.userId }, data: { passwordHash } });
  res.json({ ok: true });
});
