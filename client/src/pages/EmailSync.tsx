import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { api, formatCurrency } from "../api";
import type { EmailAccount, EmailTransaction } from "../types";

export default function EmailSync() {
  const [params] = useSearchParams();
  const [accounts, setAccounts] = useState<EmailAccount[]>([]);
  const [transactions, setTransactions] = useState<EmailTransaction[]>([]);
  const [syncingId, setSyncingId] = useState<number | null>(null);
  const [message, setMessage] = useState("");
  const [imapForm, setImapForm] = useState({ emailAddress: "", host: "", port: "993", user: "", password: "" });
  const [showImap, setShowImap] = useState(false);

  async function load() {
    const [accountsRes, txRes] = await Promise.all([
      api.get<EmailAccount[]>("/email-accounts"),
      api.get<EmailTransaction[]>("/email-transactions", { params: { reconciled: false } }),
    ]);
    setAccounts(accountsRes.data);
    setTransactions(txRes.data);
  }

  useEffect(() => {
    load();
    if (params.get("connected")) setMessage("Gmail account connected.");
    if (params.get("error")) setMessage(`Connection failed: ${params.get("error")}`);
  }, []);

  async function connectGmail() {
    const res = await api.get<{ url: string }>("/email-accounts/gmail/auth-url");
    window.location.href = res.data.url;
  }

  async function syncAccount(id: number) {
    setSyncingId(id);
    setMessage("");
    try {
      const res = await api.post<{ created: number }>(`/email-accounts/${id}/sync`);
      setMessage(`Synced — found ${res.data.created} new transaction(s).`);
      load();
    } catch (err: any) {
      setMessage(err?.response?.data?.error ?? "Sync failed.");
    } finally {
      setSyncingId(null);
    }
  }

  async function disconnect(id: number) {
    await api.delete(`/email-accounts/${id}`);
    load();
  }

  async function dismiss(id: number) {
    await api.put(`/email-transactions/${id}/reconcile`, {});
    load();
  }

  async function connectImap(e: React.FormEvent) {
    e.preventDefault();
    await api.post("/email-accounts/imap", imapForm);
    setImapForm({ emailAddress: "", host: "", port: "993", user: "", password: "" });
    setShowImap(false);
    load();
  }

  return (
    <div className="space-y-6">
      <section className="rounded-lg border border-gray-200 dark:border-gray-700 p-4">
        <h2 className="mb-2 text-sm font-medium text-gray-500 dark:text-gray-400">Connected inboxes</h2>
        {message && <p className="mb-2 text-xs text-purple-600 dark:text-purple-400">{message}</p>}
        <ul className="space-y-2">
          {accounts.map((a) => (
            <li key={a.id} className="rounded border border-gray-200 dark:border-gray-700 p-3 text-sm">
              <div className="flex justify-between font-medium">
                <span>{a.emailAddress}</span>
                <span className="text-xs text-gray-500 dark:text-gray-400">{a.provider}</span>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Last synced: {a.lastSyncedAt ? new Date(a.lastSyncedAt).toLocaleString("en-IN") : "never"}
              </p>
              <div className="mt-2 flex gap-3">
                <button
                  onClick={() => syncAccount(a.id)}
                  disabled={syncingId === a.id}
                  className="text-xs text-purple-600 dark:text-purple-400 disabled:opacity-40"
                >
                  {syncingId === a.id ? "Syncing…" : "Sync now"}
                </button>
                <button onClick={() => disconnect(a.id)} className="text-xs text-red-500 dark:text-red-400">
                  Disconnect
                </button>
              </div>
            </li>
          ))}
          {accounts.length === 0 && <li className="text-xs text-gray-400 dark:text-gray-500">No inboxes connected yet.</li>}
        </ul>

        <div className="mt-3 flex flex-col gap-2">
          <button onClick={connectGmail} className="w-full rounded bg-purple-600 dark:bg-purple-500 py-1.5 text-sm font-medium text-white">
            Connect Gmail
          </button>
          <button onClick={() => setShowImap(!showImap)} className="text-xs text-gray-500 dark:text-gray-400">
            {showImap ? "Cancel" : "Connect another inbox via IMAP (Outlook, Yahoo, etc.)"}
          </button>
        </div>

        {showImap && (
          <form onSubmit={connectImap} className="mt-3 space-y-2 rounded border border-dashed border-gray-300 dark:border-gray-600 p-2">
            <input
              className="w-full rounded border border-gray-300 dark:border-gray-600 px-2 py-1 text-sm"
              placeholder="Email address"
              value={imapForm.emailAddress}
              onChange={(e) => setImapForm({ ...imapForm, emailAddress: e.target.value })}
              required
            />
            <input
              className="w-full rounded border border-gray-300 dark:border-gray-600 px-2 py-1 text-sm"
              placeholder="IMAP host (e.g. outlook.office365.com)"
              value={imapForm.host}
              onChange={(e) => setImapForm({ ...imapForm, host: e.target.value })}
              required
            />
            <input
              className="w-full rounded border border-gray-300 dark:border-gray-600 px-2 py-1 text-sm"
              placeholder="Port"
              value={imapForm.port}
              onChange={(e) => setImapForm({ ...imapForm, port: e.target.value })}
              required
            />
            <input
              className="w-full rounded border border-gray-300 dark:border-gray-600 px-2 py-1 text-sm"
              placeholder="Username"
              value={imapForm.user}
              onChange={(e) => setImapForm({ ...imapForm, user: e.target.value })}
              required
            />
            <input
              className="w-full rounded border border-gray-300 dark:border-gray-600 px-2 py-1 text-sm"
              type="password"
              placeholder="App-specific password"
              value={imapForm.password}
              onChange={(e) => setImapForm({ ...imapForm, password: e.target.value })}
              required
            />
            <button type="submit" className="w-full rounded bg-gray-800 dark:bg-gray-600 py-1.5 text-sm font-medium text-white">
              Connect
            </button>
          </form>
        )}
      </section>

      <section className="rounded-lg border border-gray-200 dark:border-gray-700 p-4">
        <h2 className="mb-2 text-sm font-medium text-gray-500 dark:text-gray-400">Parsed from email — pending review</h2>
        <ul className="space-y-2">
          {transactions.map((t) => (
            <li key={t.id} className="rounded border border-gray-200 dark:border-gray-700 p-3 text-sm">
              <div className="flex justify-between font-medium">
                <span>{t.parsedMerchant ?? t.sourceLabel}</span>
                <span>{formatCurrency(t.parsedAmount)}</span>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {t.sourceLabel} · {t.mode.replace("_", " ")} ·{" "}
                {new Date(t.receivedAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
              </p>
              <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">{t.rawSnippet}</p>
              <button onClick={() => dismiss(t.id)} className="mt-2 text-xs text-purple-600 dark:text-purple-400">
                Mark reviewed
              </button>
            </li>
          ))}
          {transactions.length === 0 && (
            <li className="text-xs text-gray-400 dark:text-gray-500">Nothing parsed yet — sync a connected inbox above.</li>
          )}
        </ul>
      </section>
    </div>
  );
}
