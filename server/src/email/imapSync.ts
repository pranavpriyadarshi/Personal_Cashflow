import Imap from "imap";
import { simpleParser } from "mailparser";
import { prisma } from "../prisma";
import { decrypt } from "../crypto";
import { parseEmailBody, sourceLabelForSender } from "../emailParser";
import type { EmailAccount } from "../generated/prisma/client";

export interface ImapCredentials {
  host: string;
  port: number;
  tls: boolean;
  user: string;
  password: string;
}

export async function syncImapAccount(account: EmailAccount) {
  const encryptedBlob = (account.credentials as { enc: string }).enc;
  const creds: ImapCredentials = JSON.parse(decrypt(encryptedBlob));
  const sinceDate = account.lastSyncedAt ?? new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const imap = new Imap({
    host: creds.host,
    port: creds.port,
    tls: creds.tls,
    user: creds.user,
    password: creds.password,
  });

  let createdCount = 0;

  await new Promise<void>((resolve, reject) => {
    imap.once("ready", () => {
      imap.openBox("INBOX", true, (err) => {
        if (err) return reject(err);
        imap.search(["ALL", ["SINCE", sinceDate]], (searchErr, uids) => {
          if (searchErr) return reject(searchErr);
          if (uids.length === 0) {
            imap.end();
            return resolve();
          }
          const fetch = imap.fetch(uids, { bodies: "" });
          const parsePromises: Promise<void>[] = [];

          fetch.on("message", (msg) => {
            msg.on("body", (stream) => {
              parsePromises.push(
                simpleParser(stream as any).then(async (parsed) => {
                  const from = parsed.from?.value[0]?.address ?? "";
                  const result = parseEmailBody(parsed.subject ?? "", parsed.text ?? "");
                  if (!result) return;
                  await prisma.emailTransaction.create({
                    data: {
                      emailAccountId: account.id,
                      receivedAt: parsed.date ?? new Date(),
                      sourceLabel: sourceLabelForSender(from),
                      mode: result.mode,
                      parsedAmount: result.amount,
                      parsedMerchant: result.merchant,
                      rawSnippet: (parsed.text ?? "").slice(0, 300),
                    },
                  });
                  createdCount += 1;
                })
              );
            });
          });

          fetch.once("error", reject);
          fetch.once("end", () => {
            Promise.all(parsePromises)
              .then(() => {
                imap.end();
                resolve();
              })
              .catch(reject);
          });
        });
      });
    });
    imap.once("error", reject);
    imap.connect();
  });

  await prisma.emailAccount.update({
    where: { id: account.id },
    data: { lastSyncedAt: new Date() },
  });

  return createdCount;
}
