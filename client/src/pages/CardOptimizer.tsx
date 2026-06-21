import { useEffect, useState } from "react";
import { api, currentMonth, formatCurrency } from "../api";
import type { CreditCard } from "../types";

export default function CardOptimizer() {
  const [cards, setCards] = useState<CreditCard[]>([]);
  const [form, setForm] = useState({ name: "", defaultRate: "1", categoryRates: "" });
  const [paymentForms, setPaymentForms] = useState<Record<number, { amount: string; category: string }>>({});

  async function load() {
    const res = await api.get<CreditCard[]>("/credit-cards");
    setCards(res.data);
  }

  useEffect(() => {
    load();
  }, []);

  async function addCard(e: React.FormEvent) {
    e.preventDefault();
    const rewardProfile: Record<string, number> = { default: Number(form.defaultRate) };
    form.categoryRates
      .split(",")
      .map((pair) => pair.trim())
      .filter(Boolean)
      .forEach((pair) => {
        const [cat, rate] = pair.split(":").map((s) => s.trim());
        if (cat && rate) rewardProfile[cat] = Number(rate);
      });
    await api.post("/credit-cards", { name: form.name, rewardProfile });
    setForm({ name: "", defaultRate: "1", categoryRates: "" });
    load();
  }

  async function logPayment(cardId: number) {
    const f = paymentForms[cardId];
    if (!f?.amount) return;
    await api.post(`/credit-cards/${cardId}/payments`, {
      month: currentMonth(),
      amount: Number(f.amount),
      category: f.category || "default",
    });
    setPaymentForms({ ...paymentForms, [cardId]: { amount: "", category: "" } });
    load();
  }

  return (
    <div className="space-y-6">
      <section>
        <h2 className="mb-2 text-sm font-medium text-gray-500">Your cards</h2>
        <div className="space-y-3">
          {cards.map((card) => {
            const totalRewards = card.payments.reduce((sum, p) => sum + p.estimatedRewardsEarned, 0);
            const f = paymentForms[card.id] ?? { amount: "", category: "" };
            return (
              <div key={card.id} className="rounded-lg border border-gray-200 p-3">
                <div className="flex justify-between text-sm font-medium">
                  <span>{card.name}</span>
                  <span className="text-green-600">{formatCurrency(totalRewards)} earned</span>
                </div>
                <p className="mt-1 text-xs text-gray-500">
                  {Object.entries(card.rewardProfile)
                    .map(([k, v]) => `${k}: ${v}%`)
                    .join(" · ")}
                </p>
                <div className="mt-2 flex gap-2">
                  <input
                    className="w-24 rounded border border-gray-300 px-2 py-1 text-xs"
                    placeholder="Amount"
                    type="number"
                    value={f.amount}
                    onChange={(e) => setPaymentForms({ ...paymentForms, [card.id]: { ...f, amount: e.target.value } })}
                  />
                  <input
                    className="flex-1 rounded border border-gray-300 px-2 py-1 text-xs"
                    placeholder="Category (optional)"
                    value={f.category}
                    onChange={(e) => setPaymentForms({ ...paymentForms, [card.id]: { ...f, category: e.target.value } })}
                  />
                  <button
                    onClick={() => logPayment(card.id)}
                    className="rounded bg-gray-800 px-3 text-xs font-medium text-white"
                  >
                    Log
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <section className="rounded-lg border border-gray-200 p-4">
        <h2 className="mb-2 text-sm font-medium text-gray-500">Add a card</h2>
        <form onSubmit={addCard} className="space-y-2">
          <input
            className="w-full rounded border border-gray-300 px-2 py-1 text-sm"
            placeholder="Card name (e.g. Axis Bank)"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            required
          />
          <input
            className="w-full rounded border border-gray-300 px-2 py-1 text-sm"
            placeholder="Default reward rate %"
            type="number"
            value={form.defaultRate}
            onChange={(e) => setForm({ ...form, defaultRate: e.target.value })}
          />
          <input
            className="w-full rounded border border-gray-300 px-2 py-1 text-sm"
            placeholder="Category rates, e.g. Grocery:5, Dining:10"
            value={form.categoryRates}
            onChange={(e) => setForm({ ...form, categoryRates: e.target.value })}
          />
          <button type="submit" className="w-full rounded bg-purple-600 py-1.5 text-sm font-medium text-white">
            Add card
          </button>
        </form>
      </section>
    </div>
  );
}
