import { Router } from "express";
import { google } from "googleapis";
import { prisma } from "../prisma";
import { encrypt } from "../crypto";
import { syncImapAccount, type ImapCredentials } from "../email/imapSync";

export const emailAccountsRouter = Router();

emailAccountsRouter.get("/", async (req, res) => {
  const accounts = await prisma.emailAccount.findMany({
    where: { userId: req.userId },
    select: { id: true, emailAddress: true, provider: true, authType: true, lastSyncedAt: true, createdAt: true },
  });
  res.json(accounts);
});

// Connect an inbox via plain IMAP + app-specific password (Outlook, Yahoo, self-hosted, etc).
emailAccountsRouter.post("/imap", async (req, res) => {
  const { emailAddress, host, port, tls, user, password } = req.body;
  const creds: ImapCredentials = { host, port: Number(port), tls: tls !== false, user, password };
  const account = await prisma.emailAccount.create({
    data: {
      userId: req.userId,
      emailAddress,
      provider: "imap",
      authType: "imap_password",
      credentials: { enc: encrypt(JSON.stringify(creds)) },
    },
  });
  res.status(201).json({ id: account.id, emailAddress: account.emailAddress });
});

emailAccountsRouter.delete("/:id", async (req, res) => {
  await prisma.emailAccount.delete({ where: { id: Number(req.params.id) } });
  res.status(204).end();
});

emailAccountsRouter.post("/:id/sync", async (req, res) => {
  const account = await prisma.emailAccount.findUnique({ where: { id: Number(req.params.id) } });
  if (!account) return res.status(404).json({ error: "account not found" });
  if (account.provider !== "imap") {
    return res.status(501).json({ error: "Gmail OAuth sync not yet wired up — see /api/email-accounts/gmail/auth-url" });
  }
  try {
    const created = await syncImapAccount(account);
    res.json({ created });
  } catch (err) {
    res.status(502).json({ error: "IMAP sync failed", detail: (err as Error).message });
  }
});

// Gmail connection requires a Google Cloud OAuth client (manual one-time setup, see plan).
// These routes are ready to use as soon as GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET / GOOGLE_REDIRECT_URI are set.
function gmailOAuthClient() {
  const { GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REDIRECT_URI } = process.env;
  if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET || !GOOGLE_REDIRECT_URI) return null;
  return new google.auth.OAuth2(GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REDIRECT_URI);
}

emailAccountsRouter.get("/gmail/auth-url", (_req, res) => {
  const client = gmailOAuthClient();
  if (!client) {
    return res
      .status(501)
      .json({ error: "Google OAuth client not configured. Set GOOGLE_CLIENT_ID/SECRET/REDIRECT_URI." });
  }
  const url = client.generateAuthUrl({
    access_type: "offline",
    scope: ["https://www.googleapis.com/auth/gmail.readonly"],
  });
  res.json({ url });
});

emailAccountsRouter.get("/gmail/callback", async (req, res) => {
  const client = gmailOAuthClient();
  if (!client) return res.status(501).json({ error: "Google OAuth client not configured" });
  const { code, email } = req.query;
  const { tokens } = await client.getToken(String(code));
  const account = await prisma.emailAccount.create({
    data: {
      userId: req.userId,
      emailAddress: String(email),
      provider: "gmail",
      authType: "oauth",
      credentials: { enc: encrypt(JSON.stringify(tokens)) },
    },
  });
  res.status(201).json({ id: account.id, emailAddress: account.emailAddress });
});
