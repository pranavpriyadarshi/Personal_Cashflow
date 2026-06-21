import { useEffect, useState } from "react";
import { api, formatCurrency, groupCategoriesByParent } from "../api";
import type { Category, Subscription } from "../types";

export default function Bills() {
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [form, setForm] = useState({
    name: "",
    categoryId: "",
    amount: "",
    billingCycle: "monthly",
    nextRenewalDate: "",
    autoDebit: false,
    notes: "",
  });

  async function load() {
    const [subRes, catRes] = await Promise.all([
      api.get<Subscription[]>("/subscriptions"),
      api.get<Category[]>("/categories"),
    ]);
    setSubscriptions(subRes.data);
    setCategories(catRes.data);
  }

  useEffect(() => {
    load();
  }, []);

  async function addSubscription(e: React.FormEvent) {
    e.preventDefault();
    await api.post("/subscriptions", {
      ...form,
      categoryId: Number(form.categoryId),
      amount: Number(form.amount),
    });
    setForm({ name: "", categoryId: "", amount: "", billingCycle: "monthly", nextRenewalDate: "", autoDebit: false, notes: "" });
    load();
  }

  async function markPaid(id: number) {
    await api.post(`/subscriptions/${id}/mark-paid`);
    load();
  }

  async function removeSubscription(id: number) {
    await api.delete(`/subscriptions/${id}`);
    load();
  }

  const today = new Date();
  const { standalone, groups } = groupCategoriesByParent(categories);

  return (
    <div className="space-y-6">
      <section>
        <h2 className="mb-2 text-sm font-medium text-gray-500">Bills & subscriptions</h2>
        <ul className="space-y-2">
          {subscriptions.map((s) => {
            const dueDate = new Date(s.nextRenewalDate);
            const overdue = dueDate < today;
            return (
              <li key={s.id} className="rounded-lg border border-gray-200 p-3 text-sm">
                <div className="flex justify-between font-medium">
                  <span>{s.name}</span>
                  <span>{formatCurrency(s.amount)}</span>
                </div>
                <p className="text-xs text-gray-500">
                  {s.category.name} · {s.billingCycle} · next due{" "}
                  <span className={overdue ? "font-medium text-red-600" : ""}>
                    {dueDate.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                  </span>
                  {s.autoDebit ? " · auto-debit" : ""}
                </p>
                {s.notes && <p className="text-xs text-gray-400">{s.notes}</p>}
                <div className="mt-2 flex gap-3">
                  <button onClick={() => markPaid(s.id)} className="text-xs text-purple-600">
                    Mark paid
                  </button>
                  <button onClick={() => removeSubscription(s.id)} className="text-xs text-red-500">
                    Remove
                  </button>
                </div>
              </li>
            );
          })}
          {subscriptions.length === 0 && <li className="text-xs text-gray-400">No bills onboarded yet.</li>}
        </ul>
      </section>

      <section className="rounded-lg border border-gray-200 p-4">
        <h2 className="mb-2 text-sm font-medium text-gray-500">Onboard a bill / subscription</h2>
        <form onSubmit={addSubscription} className="space-y-2">
          <input
            className="w-full rounded border border-gray-300 px-2 py-1 text-sm"
            placeholder="Name (e.g. Airtel Postpaid, JioFiber Wifi, Netflix)"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            required
          />
          <select
            className="w-full rounded border border-gray-300 px-2 py-1 text-sm"
            value={form.categoryId}
            onChange={(e) => setForm({ ...form, categoryId: e.target.value })}
            required
          >
            <option value="">Category…</option>
            {standalone.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
            {groups.map((g) => (
              <optgroup key={g.parent.id} label={g.parent.name}>
                <option value={g.parent.id}>{g.parent.name} (general)</option>
                {g.children.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </optgroup>
            ))}
          </select>
          <input
            className="w-full rounded border border-gray-300 px-2 py-1 text-sm"
            type="number"
            placeholder="Amount"
            value={form.amount}
            onChange={(e) => setForm({ ...form, amount: e.target.value })}
            required
          />
          <select
            className="w-full rounded border border-gray-300 px-2 py-1 text-sm"
            value={form.billingCycle}
            onChange={(e) => setForm({ ...form, billingCycle: e.target.value })}
          >
            <option value="monthly">Monthly</option>
            <option value="quarterly">Quarterly</option>
            <option value="yearly">Yearly</option>
          </select>
          <input
            className="w-full rounded border border-gray-300 px-2 py-1 text-sm"
            type="date"
            value={form.nextRenewalDate}
            onChange={(e) => setForm({ ...form, nextRenewalDate: e.target.value })}
            required
          />
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={form.autoDebit}
              onChange={(e) => setForm({ ...form, autoDebit: e.target.checked })}
            />
            Auto-debit
          </label>
          <input
            className="w-full rounded border border-gray-300 px-2 py-1 text-sm"
            placeholder="Notes (optional)"
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
          />
          <button type="submit" className="w-full rounded bg-purple-600 py-1.5 text-sm font-medium text-white">
            Add bill
          </button>
        </form>
      </section>
    </div>
  );
}
