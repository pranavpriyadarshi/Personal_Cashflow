import { useEffect, useState } from "react";
import { api, formatCurrency } from "../api";
import type { Transaction } from "../types";

export default function ReimbursementTracker() {
  const [reimbursements, setReimbursements] = useState<Transaction[]>([]);
  const [pendingTotal, setPendingTotal] = useState(0);

  async function load() {
    const res = await api.get<{ reimbursements: Transaction[]; pendingTotal: number }>("/transactions/reimbursements");
    setReimbursements(res.data.reimbursements);
    setPendingTotal(res.data.pendingTotal);
  }

  useEffect(() => {
    load();
  }, []);

  async function markReceived(t: Transaction) {
    await api.put(`/transactions/${t.id}`, {
      ...t,
      reimbursementStatus: "received",
    });
    load();
  }

  return (
    <div className="space-y-6">
      <section className="rounded-lg border border-gray-200 p-4">
        <h2 className="mb-1 text-sm font-medium text-gray-500">Pending reimbursements</h2>
        <p className="text-xl font-semibold">{formatCurrency(pendingTotal)}</p>
        <p className="text-xs text-gray-500">Excluded from your expense totals until received.</p>
      </section>

      <section>
        <ul className="divide-y divide-gray-100 rounded border border-gray-200">
          {reimbursements.map((t) => (
            <li key={t.id} className="flex items-center justify-between p-2 text-sm">
              <span>
                {t.category.name} — {t.reimbursementParty}
                {t.remarks ? ` (${t.remarks})` : ""}
              </span>
              <span className="flex items-center gap-2">
                {formatCurrency(t.amount)}
                {t.reimbursementStatus === "received" ? (
                  <span className="text-xs text-green-600">Received</span>
                ) : (
                  <button onClick={() => markReceived(t)} className="text-xs text-purple-600">
                    Mark received
                  </button>
                )}
              </span>
            </li>
          ))}
          {reimbursements.length === 0 && <li className="p-2 text-xs text-gray-400">No reimbursable expenses logged.</li>}
        </ul>
      </section>
    </div>
  );
}
