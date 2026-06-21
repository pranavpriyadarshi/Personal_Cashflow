import { useEffect, useState } from "react";
import { api, currentMonth, formatCurrency } from "../api";
import type { Category, Transaction } from "../types";

const NECESSITY_LABELS: Record<string, string> = {
  must_have: "Must-have",
  good_to_have: "Good-to-have",
  not_needed: "Not-needed",
};

export default function Ledger() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [newCategory, setNewCategory] = useState({ name: "", group: "expense" });
  const month = currentMonth();

  async function load() {
    const [txRes, catRes] = await Promise.all([
      api.get<Transaction[]>("/transactions", { params: { month } }),
      api.get<Category[]>("/categories"),
    ]);
    setTransactions(txRes.data);
    setCategories(catRes.data);
  }

  useEffect(() => {
    load();
  }, []);

  async function addCategory(e: React.FormEvent) {
    e.preventDefault();
    await api.post("/categories", newCategory);
    setNewCategory({ name: "", group: "expense" });
    load();
  }

  async function removeTransaction(id: number) {
    await api.delete(`/transactions/${id}`);
    load();
  }

  const groups = ["must_have", "good_to_have", "not_needed"] as const;
  const totalsByGroup = groups.map((g) => ({
    g,
    total: transactions.filter((t) => t.necessity === g).reduce((sum, t) => sum + t.amount, 0),
  }));

  return (
    <div className="space-y-6">
      <section>
        <h2 className="mb-2 text-sm font-medium text-gray-500">Monthly ledger ({month})</h2>
        {groups.map((g) => {
          const items = transactions.filter((t) => t.necessity === g);
          const total = totalsByGroup.find((t) => t.g === g)!.total;
          return (
            <div key={g} className="mb-4">
              <div className="mb-1 flex justify-between text-sm font-medium">
                <span>{NECESSITY_LABELS[g]}</span>
                <span>{formatCurrency(total)}</span>
              </div>
              <ul className="divide-y divide-gray-100 rounded border border-gray-200">
                {items.length === 0 && <li className="p-2 text-xs text-gray-400">No entries</li>}
                {items.map((t) => (
                  <li key={t.id} className="flex items-center justify-between p-2 text-sm">
                    <span>
                      {t.category.name}
                      {t.remarks ? ` — ${t.remarks}` : ""}
                      {t.isReimbursable ? " (reimbursable)" : ""}
                    </span>
                    <span className="flex items-center gap-2">
                      {formatCurrency(t.amount)}
                      <button onClick={() => removeTransaction(t.id)} className="text-xs text-red-500">
                        ✕
                      </button>
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </section>

      <section className="rounded-lg border border-gray-200 p-4">
        <h2 className="mb-2 text-sm font-medium text-gray-500">Categories</h2>
        <ul className="mb-3 flex flex-wrap gap-2 text-xs">
          {categories.map((c) => (
            <li key={c.id} className="rounded-full bg-gray-100 px-2 py-1">
              {c.name} <span className="text-gray-400">({c.group})</span>
            </li>
          ))}
        </ul>
        <form onSubmit={addCategory} className="flex gap-2">
          <input
            className="flex-1 rounded border border-gray-300 px-2 py-1 text-sm"
            placeholder="New category"
            value={newCategory.name}
            onChange={(e) => setNewCategory({ ...newCategory, name: e.target.value })}
            required
          />
          <select
            className="rounded border border-gray-300 px-2 py-1 text-sm"
            value={newCategory.group}
            onChange={(e) => setNewCategory({ ...newCategory, group: e.target.value })}
          >
            <option value="expense">Expense</option>
            <option value="investment">Investment</option>
            <option value="credit_card">Credit card</option>
          </select>
          <button type="submit" className="rounded bg-purple-600 px-3 text-sm font-medium text-white">
            Add
          </button>
        </form>
      </section>
    </div>
  );
}
