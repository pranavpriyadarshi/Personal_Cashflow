import "dotenv/config";
import express from "express";
import cors from "cors";

import { incomeRouter } from "./routes/income";
import { categoriesRouter } from "./routes/categories";
import { transactionsRouter } from "./routes/transactions";
import { creditCardsRouter } from "./routes/creditCards";
import { investmentsRouter } from "./routes/investments";
import { goalsRouter } from "./routes/goals";
import { dashboardRouter } from "./routes/dashboard";
import { importedTransactionsRouter } from "./routes/importedTransactions";
import { emailAccountsRouter } from "./routes/emailAccounts";
import { emailTransactionsRouter } from "./routes/emailTransactions";
import { subscriptionsRouter } from "./routes/subscriptions";
import { loansRouter } from "./routes/loans";

const app = express();
app.use(cors());
app.use(express.json());

app.get("/api/health", (_req, res) => res.json({ ok: true }));

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

const PORT = process.env.PORT ? Number(process.env.PORT) : 4000;
app.listen(PORT, () => console.log(`Server listening on http://localhost:${PORT}`));
