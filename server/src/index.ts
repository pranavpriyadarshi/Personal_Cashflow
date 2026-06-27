import "dotenv/config";
import express from "express";
import cors from "cors";
import helmet from "helmet";

import { incomeRouter } from "./routes/income";
import { categoriesRouter } from "./routes/categories";
import { transactionsRouter } from "./routes/transactions";
import { creditCardsRouter } from "./routes/creditCards";
import { investmentsRouter } from "./routes/investments";
import { goalsRouter } from "./routes/goals";
import { dashboardRouter } from "./routes/dashboard";
import { importedTransactionsRouter } from "./routes/importedTransactions";
import { emailAccountsRouter, gmailOAuthCallback } from "./routes/emailAccounts";
import { emailTransactionsRouter } from "./routes/emailTransactions";
import { subscriptionsRouter } from "./routes/subscriptions";
import { loansRouter } from "./routes/loans";
import { authRouter } from "./routes/auth";
import { budgetEstimatesRouter } from "./routes/budgetEstimates";
import { adviceRouter } from "./routes/advice";
import { requireAuth } from "./middleware/requireAuth";

const app = express();
app.use(helmet());
app.use(cors({ origin: process.env.CLIENT_URL || true }));
app.use(express.json());

app.get("/api/health", (_req, res) => res.json({ ok: true }));
app.use("/api/auth", authRouter);

// Hit by Google's browser redirect, which can't carry our usual Bearer token — must be
// registered before the blanket auth middleware below. Identity is recovered from a signed
// state param instead (see gmailOAuthCallback).
app.get("/api/email-accounts/gmail/callback", gmailOAuthCallback);

app.use("/api", requireAuth);

app.use("/api/income", incomeRouter);
app.use("/api/categories", categoriesRouter);
app.use("/api/transactions", transactionsRouter);
app.use("/api/credit-cards", creditCardsRouter);
app.use("/api/investments", investmentsRouter);
app.use("/api/goals", goalsRouter);
app.use("/api/dashboard", dashboardRouter);
app.use("/api/imported-transactions", importedTransactionsRouter);
app.use("/api/email-accounts", emailAccountsRouter);
app.use("/api/email-transactions", emailTransactionsRouter);
app.use("/api/subscriptions", subscriptionsRouter);
app.use("/api/loans", loansRouter);
app.use("/api/budget-estimates", budgetEstimatesRouter);
app.use("/api/advice", adviceRouter);

const PORT = process.env.PORT ? Number(process.env.PORT) : 4000;
app.listen(PORT, () => console.log(`Server listening on http://localhost:${PORT}`));
