import { Router, type Request, type Response } from "express";
import { google } from "googleapis";
import { prisma } from "../prisma";
import { encrypt } from "../crypto";
import { signOAuthState, verifyOAuthState } from "../auth";
import { syncImapAccount, type ImapCredentials } from "../email/imapSync";
import { gmailOAuthClient, syncGmailAccount } from "../email/gmailSync";

export const emailAccountsRouter = Router();

const GMAIL_STATE_PURPOSE = "gmail_connect";
const CLIENT_URL = process.env.CLIENT_URL || "http://localhost:5173";

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
  await prisma.emailAccount.deleteMany({ where: { id: Number(req.params.id), userId: req.userId } });
  res.status(204).end();
});

emailAccountsRouter.post("/:id/sync", async (req, res) => {
  const account = await prisma.emailAccount.findFirst({ where: { id: Number(req.params.id), userId: req.userId } });
  if (!account) return res.status(404).json({ error: "account not found" });
  try {
    const created = account.provider === "imap" ? await syncImapAccount(account) : await syncGmailAccount(account);
    res.json({ created });
  } catch (err) {
    console.error("email sync failed:", err);
    res.status(502).json({ error: "sync failed", detail: (err as Error).message });
  }
});

// Gmail connection requires a Google Cloud OAuth client (manual one-time setup, see plan).
emailAccountsRouter.get("/gmail/auth-url", (req, res) => {
  const client = gmailOAuthClient();
  if (!client) {
    return res
      .status(501)
      .json({ error: "Google OAuth client not configured. Set GOOGLE_CLIENT_ID/SECRET/REDIRECT_URI." });
  }
  const url = client.generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    scope: ["https://www.googleapis.com/auth/gmail.readonly", "https://www.googleapis.com/auth/userinfo.email"],
    state: signOAuthState(req.userId!, GMAIL_STATE_PURPOSE),
  });
  res.json({ url });
});

// Hit directly by Google's browser redirect — no Authorization header is possible here, so the
// initiating user is recovered from the signed `state` param instead of the usual Bearer auth.
// Registered in index.ts BEFORE the global requireAuth middleware.
export async function gmailOAuthCallback(req: Request, res: Response) {
  const client = gmailOAuthClient();
  if (!client) return res.status(501).send("Google OAuth client not configured");

  const { code, state, error } = req.query;
  if (error) return res.redirect(`${CLIENT_URL}/email-sync?error=${encodeURIComponent(String(error))}`);

  let userId: number;
  try {
    userId = verifyOAuthState(String(state), GMAIL_STATE_PURPOSE);
  } catch {
    return res.redirect(`${CLIENT_URL}/email-sync?error=invalid_or_expired_state`);
  }

  try {
    const { tokens } = await client.getToken(String(code));
    client.setCredentials(tokens);
    const oauth2 = google.oauth2({ version: "v2", auth: client });
    const { data: profile } = await oauth2.userinfo.get();
    if (!profile.email) throw new Error("could not read connected account's email");

    await prisma.emailAccount.create({
      data: {
        userId,
        emailAddress: profile.email,
        provider: "gmail",
        authType: "oauth",
        credentials: { enc: encrypt(JSON.stringify(tokens)) },
      },
    });
    res.redirect(`${CLIENT_URL}/email-sync?connected=1`);
  } catch (err) {
    res.redirect(`${CLIENT_URL}/email-sync?error=${encodeURIComponent((err as Error).message)}`);
  }
}
