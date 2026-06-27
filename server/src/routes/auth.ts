import { Router } from "express";
import rateLimit from "express-rate-limit";
import { OAuth2Client } from "google-auth-library";
import { prisma } from "../prisma";
import { hashPassword, comparePassword, signToken } from "../auth";
import { requireAuth } from "../middleware/requireAuth";
import { isValidEmail, passwordStrengthError } from "../validation";

export const authRouter = Router();

// Brute-force protection on credential endpoints — generous enough for normal typos,
// tight enough to make password-guessing impractical.
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "too many attempts — try again in a few minutes" },
});

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const googleClient = GOOGLE_CLIENT_ID ? new OAuth2Client(GOOGLE_CLIENT_ID) : null;

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

function sanitizeUser(user: { passwordHash: string | null; [key: string]: unknown }) {
  const { passwordHash, ...rest } = user;
  return rest;
}

authRouter.post("/register", authLimiter, async (req, res) => {
  const { email, password, name } = req.body;
  if (!email || !password || !name) {
    return res.status(400).json({ error: "email, password, and name are required" });
  }
  if (!isValidEmail(email)) return res.status(400).json({ error: "enter a valid email address" });
  const passwordError = passwordStrengthError(password);
  if (passwordError) return res.status(400).json({ error: passwordError });

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) return res.status(409).json({ error: "an account with this email already exists" });

  const passwordHash = await hashPassword(password);
  const user = await prisma.user.create({ data: { email, passwordHash, name } });

  res.status(201).json({ token: signToken(user.id), user: sanitizeUser(user) });
});

authRouter.post("/login", authLimiter, async (req, res) => {
  const { email, password } = req.body;
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) return res.status(401).json({ error: "invalid email or password" });
  if (!user.passwordHash) {
    return res.status(401).json({ error: "this account uses Google sign-in — use the Google button instead" });
  }
  if (!(await comparePassword(password, user.passwordHash))) {
    return res.status(401).json({ error: "invalid email or password" });
  }
  res.json({ token: signToken(user.id), user: sanitizeUser(user) });
});

// Verifies the ID token Google's Identity Services widget hands the client — never trusts
// a client-asserted email directly. Links to an existing local account by email on first
// Google sign-in, otherwise creates a new (password-less) account.
authRouter.post("/google", authLimiter, async (req, res) => {
  if (!googleClient) return res.status(501).json({ error: "Google sign-in is not configured on this server" });
  const { idToken } = req.body;
  if (!idToken) return res.status(400).json({ error: "idToken is required" });

  let payload;
  try {
    const ticket = await googleClient.verifyIdToken({ idToken, audience: GOOGLE_CLIENT_ID });
    payload = ticket.getPayload();
  } catch {
    return res.status(401).json({ error: "invalid Google token" });
  }
  if (!payload?.email || !payload.email_verified || !payload.sub) {
    return res.status(401).json({ error: "Google account email is not verified" });
  }

  let user = await prisma.user.findUnique({ where: { googleId: payload.sub } });
  if (!user) {
    const existingByEmail = await prisma.user.findUnique({ where: { email: payload.email } });
    user = existingByEmail
      ? await prisma.user.update({ where: { id: existingByEmail.id }, data: { googleId: payload.sub } })
      : await prisma.user.create({
          data: { email: payload.email, googleId: payload.sub, name: payload.name ?? payload.email },
        });
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
  if (!isValidEmail(email)) return res.status(400).json({ error: "enter a valid email address" });
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing && existing.id !== req.userId) return res.status(409).json({ error: "that email is already in use" });
  const user = await prisma.user.update({ where: { id: req.userId }, data: { email } });
  res.json(sanitizeUser(user));
});

authRouter.put("/password", requireAuth, async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  const user = await prisma.user.findUnique({ where: { id: req.userId } });
  if (!user?.passwordHash || !(await comparePassword(currentPassword, user.passwordHash))) {
    return res.status(401).json({ error: "current password is incorrect" });
  }
  const passwordError = passwordStrengthError(newPassword);
  if (passwordError) return res.status(400).json({ error: passwordError });
  const passwordHash = await hashPassword(newPassword);
  await prisma.user.update({ where: { id: req.userId }, data: { passwordHash } });
  res.json({ ok: true });
});
