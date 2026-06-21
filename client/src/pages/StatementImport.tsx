import { useEffect, useState } from "react";
import { api, formatCurrency } from "../api";

interface ImportedTransaction {
  id: number;
  date: string;
  description: string;
  amount: number;
  categoryGuess: string | null;
  sourceFile: string;
  reconciled: boolean;
}

interface EmailTransaction {
  id: number;
  receivedAt: string;
  sourceLabel: string;
  mode: string;
  parsedAmount: number;
  parsedMerchant: string | null;
  reconciled: boolean;
}

interface EmailAccount {
  id: number;
  emailAddress: string;
  provider: string;
  lastSyncedAt: string | null;
}

export default function StatementImport() {
  const [file, setFile] = useState<File | null>(null);
  const [imported, setImported] = useState<ImportedTransaction[]>([]);
  const [emailTransactions, setEmailTransactions] = useState<EmailTransaction[]>([]);
  const [emailAccounts, setEmailAccounts] = useState<EmailAccount[]>([]);
  const [imapForm, setImapForm] = useState({ emailAddress: "", host: "", port: "993", user: "", password: "" });

  async function load() {
    const [impRes, emailTxRes, emailAccRes] = await Promise.all([
      api.get<ImportedTransaction[]>("/imported-transactions"),
      api.get<EmailTransaction[]>("/email-transactions"),
      api.get<EmailAccount[]>("/email-accounts"),
    ]);
    setImported(impRes.data);
    setEmailTransactions(emailTxRes.data);
    setEmailAccounts(emailAccRes.data);
  }

  useEffect(() => {
    load();
  }, []);

  async function upload(e: React.FormEvent) {
    e.preventDefault();
    if (!file) return;
    const formData = new FormData();
    formData.append("file", file);
    await api.post("/imported-transactions/upload", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    setFile(null);
    load();
  }

  async function reconcileImported(id: number) {
    await api.put(`/imported-transactions/${id}/reconcile`, {});
    load();
  }

  async function reconcileEmail(id: number) {
    await api.put(`/email-transactions/${id}/reconcile`, {});
    load();
  }

  async function connectImap(e: React.FormEvent) {
    e.preventDefault();
    await api.post("/email-accounts/imap", { ...imapForm, port: Number(imapForm.port) });
    setImapForm({ emailAddress: "", host: "", port: "993", user: "", password: "" });
    load();
  }

  async function syncAccount(id: number) {
    await api.post(`/email-accounts/${id}/sync`);
    load();
  }

  return (
    <div className="space-y-6">
      <section className="rounded-lg border border-gray-200 p-4">
        <h2 className="mb-2 text-sm font-medium text-gray-500">Upload statement export</h2>
        <form onSubmit={upload} className="space-y-2">
          <input
            type="file"
            accept=".xlsx,.xls"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            className="block w-full text-sm"
          />
          <button type="submit" className="w-full rounded bg-purple-600 py-1.5 text-sm font-medium text-white">
            Upload & parse
          </button>
        </form>
      </section>

      <section>
        <h2 className="mb-2 text-sm font-medium text-gray-500">Imported transactions</h2>
        <ul className="divide-y divide-gray-100 rounded border border-gray-200">
          {imported.map((t) => (
            <li key={t.id} className="flex items-center justify-between p-2 text-sm">
              <span>
                {t.description} {t.categoryGuess ? `(${t.categoryGuess})` : ""}
              </span>
              <span className="flex items-center gap-2">
                {formatCurrency(t.amount)}
                {!t.reconciled && (
                  <button onClick={() => reconcileImported(t.id)} className="text-xs text-purple-600">
                    Reconcile
                  </button>
                )}
              </span>
            </li>
          ))}
        </ul>
      </section>

      <section className="rounded-lg border border-gray-200 p-4">
        <h2 className="mb-2 text-sm font-medium text-gray-500">Connected email accounts</h2>
        <ul className="mb-3 space-y-1 text-sm">
          {emailAccounts.map((a) => (
            <li key={a.id} className="flex items-center justify-between">
              <span>
                {a.emailAddress} ({a.provider})
              </span>
              <button onClick={() => syncAccount(a.id)} className="text-xs text-purple-600">
                Sync now
              </button>
            </li>
          ))}
        </ul>
        <form onSubmit={connectImap} className="space-y-2">
          <input
            className="w-full rounded border border-gray-300 px-2 py-1 text-sm"
            placeholder="Email address"
            value={imapForm.emailAddress}
            onChange={(e) => setImapForm({ ...imapForm, emailAddress: e.target.value })}
            required
          />
          <div className="flex gap-2">
            <input
              className="flex-1 rounded border border-gray-300 px-2 py-1 text-sm"
              placeholder="IMAP host"
              value={imapForm.host}
              onChange={(e) => setImapForm({ ...imapForm, host: e.target.value })}
              required
            />
            <input
              className="w-20 rounded border border-gray-300 px-2 py-1 text-sm"
              placeholder="Port"
              value={imapForm.port}
              onChange={(e) => setImapForm({ ...imapForm, port: e.target.value })}
            />
          </div>
          <input
            className="w-full rounded border border-gray-300 px-2 py-1 text-sm"
            placeholder="Username"
            value={imapForm.user}
            onChange={(e) => setImapForm({ ...imapForm, user: e.target.value })}
            required
          />
          <input
            className="w-full rounded border border-gray-300 px-2 py-1 text-sm"
            placeholder="App password"
            type="password"
            value={imapForm.password}
            onChange={(e) => setImapForm({ ...imapForm, password: e.target.value })}
            required
          />
          <button type="submit" className="w-full rounded bg-gray-800 py-1.5 text-sm font-medium text-white">
            Connect inbox
          </button>
        </form>
      </section>

      <section>
        <h2 className="mb-2 text-sm font-medium text-gray-500">Parsed email transactions</h2>
        <ul className="divide-y divide-gray-100 rounded border border-gray-200">
          {emailTransactions.map((t) => (
            <li key={t.id} className="flex items-center justify-between p-2 text-sm">
              <span>
                {t.sourceLabel} — {t.parsedMerchant ?? t.mode}
              </span>
              <span className="flex items-center gap-2">
                {formatCurrency(t.parsedAmount)}
                {!t.reconciled && (
                  <button onClick={() => reconcileEmail(t.id)} className="text-xs text-purple-600">
                    Reconcile
                  </button>
                )}
              </span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
