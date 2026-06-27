import { google } from "googleapis";
import { prisma } from "../prisma";
import { decrypt, encrypt } from "../crypto";
import { parseEmailBody, sourceLabelForSender } from "../emailParser";
import type { EmailAccount } from "../generated/prisma/client";

export function gmailOAuthClient() {
  const { GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REDIRECT_URI } = process.env;
  if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET || !GOOGLE_REDIRECT_URI) return null;
  return new google.auth.OAuth2(GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REDIRECT_URI);
}

interface GmailMessagePart {
  mimeType?: string | null;
  body?: { data?: string | null } | null;
  parts?: GmailMessagePart[] | null;
}

function extractPlainText(payload: GmailMessagePart | null | undefined): string {
  if (!payload) return "";
  if (payload.mimeType === "text/plain" && payload.body?.data) {
    return Buffer.from(payload.body.data, "base64url").toString("utf-8");
  }
  for (const part of payload.parts ?? []) {
    const text = extractPlainText(part);
    if (text) return text;
  }
  if (payload.body?.data) {
    return Buffer.from(payload.body.data, "base64url").toString("utf-8");
  }
  return "";
}

export async function syncGmailAccount(account: EmailAccount) {
  const client = gmailOAuthClient();
  if (!client) throw new Error("Google OAuth client not configured");

  const encryptedBlob = (account.credentials as { enc: string }).enc;
  const tokens = JSON.parse(decrypt(encryptedBlob));
  client.setCredentials(tokens);

  // Access tokens expire hourly; persist whatever googleapis refreshes so the next sync
  // doesn't have to re-authenticate.
  client.on("tokens", (newTokens) => {
    const merged = { ...tokens, ...newTokens };
    prisma.emailAccount
      .update({ where: { id: account.id }, data: { credentials: { enc: encrypt(JSON.stringify(merged)) } } })
      .catch(() => {});
  });

  const gmail = google.gmail({ version: "v1", auth: client });
  const sinceDate = account.lastSyncedAt ?? new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const afterEpoch = Math.floor(sinceDate.getTime() / 1000);

  let createdCount = 0;
  let pageToken: string | undefined;

  do {
    const list = await gmail.users.messages.list({
      userId: "me",
      q: `after:${afterEpoch}`,
      maxResults: 50,
      pageToken,
    });

    for (const m of list.data.messages ?? []) {
      if (!m.id) continue;
      const full = await gmail.users.messages.get({ userId: "me", id: m.id, format: "full" });
      const headers = full.data.payload?.headers ?? [];
      const from = headers.find((h) => h.name === "From")?.value ?? "";
      const subject = headers.find((h) => h.name === "Subject")?.value ?? "";
      const dateHeader = headers.find((h) => h.name === "Date")?.value;

      const bodyText = extractPlainText(full.data.payload);
      const result = parseEmailBody(subject, bodyText);
      if (!result) continue;

      await prisma.emailTransaction.create({
        data: {
          emailAccountId: account.id,
          receivedAt: dateHeader ? new Date(dateHeader) : new Date(),
          sourceLabel: sourceLabelForSender(from),
          mode: result.mode,
          parsedAmount: result.amount,
          parsedMerchant: result.merchant,
          rawSnippet: bodyText.slice(0, 300),
        },
      });
      createdCount += 1;
    }

    pageToken = list.data.nextPageToken ?? undefined;
  } while (pageToken);

  await prisma.emailAccount.update({ where: { id: account.id }, data: { lastSyncedAt: new Date() } });
  return createdCount;
}
