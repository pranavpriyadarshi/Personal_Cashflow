import { useEffect, useState } from "react";
import { api, currentMonth, formatCurrency, groupCategoriesByParent } from "../api";
import type { Category, DashboardData } from "../types";

export default function Dashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [form, setForm] = useState({
    categoryId: "",
    amount: "",
    necessity: "must_have",
    remarks: "",
    isReimbursable: false,
    reimbursementParty: "",
  });
  const [incomeForm, setIncomeForm] = useState({ source: "", amount: "" });

  const month = currentMonth();

  async function load() {
    const [dashboardRes, categoriesRes] = await Promise.all([
      api.get<DashboardData>("/dashboard", { params: { month } }),
      api.get<Category[]>("/categories"),
    ]);
    setData(dashboardRes.data);
    setCategories(categoriesRes.data);
  }

  useEffect(() => {
    load();
  }, []);

  async function addTransaction(e: React.FormEvent) {
    e.preventDefault();
    await api.post("/transactions", {
      date: new Date().toISOString(),
      categoryId: Number(form.categoryId),
      amount: Number(form.amount),
      necessity: form.necessity,
      remarks: form.remarks,
      month,
      isReimbursable: form.isReimbursable,
      reimbursementParty: form.isReimbursable ? form.reimbursementParty : undefined,
    });
    setForm({ categoryId: "", amount: "", necessity: "must_have", remarks: "", isReimbursable: false, reimbursementParty: "" });
    load();
  }

  async function addIncome(e: React.FormEvent) {
    e.preventDefault();
    await api.post("/income", { month, source: incomeForm.source, amount: Number(incomeForm.amount) });
    setIncomeForm({ source: "", amount: "" });
    load();
  }

  if (!data) return <p className="text-sm text-gray-500">Loading…</p>;

  const ratioPct = Math.round(data.costRatio * 100);

  return (
    <div className="space-y-6">
      <section className="rounded-lg border border-gray-200 p-4">
        <h2 className="mb-2 text-sm font-medium text-gray-500">This month ({data.month})</h2>
        <div className="grid grid-cols-3 gap-2 text-center">
          <div>
            <p className="text-xs text-gray-500">Income</p>
            <p className="font-semibold">{formatCurrency(data.totalIncome)}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Expenses</p>
            <p className="font-semibold">{formatCurrency(data.netExpenses)}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Savings</p>
            <p className="font-semibold">{formatCurrency(data.savings)}</p>
          </div>
        </div>
      </section>

      <section className="rounded-lg border border-gray-200 p-4">
        <div className="mb-1 flex items-center justify-between text-sm">
          <span className="font-medium text-gray-500">Cost ratio vs 50% target</span>
          <span className={data.costRatioTargetMet ? "text-green-600" : "text-red-600"}>{ratioPct}%</span>
        </div>
        <div className="h-2 w-full overflow-hidden rounded bg-gray-100">
          <div
            className={`h-full ${data.costRatioTargetMet ? "bg-green-500" : "bg-red-500"}`}
            style={{ width: `${Math.min(ratioPct, 100)}%` }}
          />
          <div className="relative">
            <div className="absolute -top-2 h-2 w-px bg-gray-400" style={{ left: "50%" }} />
          </div>
        </div>
      </section>

      <section className="rounded-lg border border-gray-200 p-4">
        <h2 className="mb-2 text-sm font-medium text-gray-500">Necessity breakdown</h2>
        <ul className="space-y-1 text-sm">
          <li className="flex justify-between"><span>Must-have</span><span>{formatCurrency(data.necessity.must_have)}</span></li>
          <li className="flex justify-between"><span>Good-to-have</span><span>{formatCurrency(data.necessity.good_to_have)}</span></li>
          <li className="flex justify-between"><span>Not-needed</span><span>{formatCurrency(data.necessity.not_needed)}</span></li>
        </ul>
        {data.necessity.total > 0 && (
          <p className="mt-2 text-xs text-gray-500">
            {Math.round(data.necessity.notNeededPct * 100)}% of spend was avoidable
          </p>
        )}
      </section>

      {data.goalProjection && data.goal && (
        <section className="rounded-lg border border-gray-200 p-4">
          <h2 className="mb-2 text-sm font-medium text-gray-500">Goal: {data.goal.name}</h2>
          <p className="text-sm">
            Projected: {formatCurrency(data.goalProjection.projectedValue)} —{" "}
            <span className={data.goalProjection.onTrack ? "text-green-600" : "text-red-600"}>
              {data.goalProjection.onTrack ? "on track" : "behind"}
            </span>
          </p>
          {!data.goalProjection.onTrack && (
            <p className="mt-1 text-xs text-gray-500">
              Need {formatCurrency(data.goalProjection.requiredMonthlyContribution)}/month to hit the goal.
            </p>
          )}
        </section>
      )}

      <section className="rounded-lg border border-gray-200 p-4">
        <h2 className="mb-2 text-sm font-medium text-gray-500">Quick add expense</h2>
        <form onSubmit={addTransaction} className="space-y-2">
          <select
            className="w-full rounded border border-gray-300 px-2 py-1 text-sm"
            value={form.categoryId}
            onChange={(e) => setForm({ ...form, categoryId: e.target.value })}
            required
          >
            <option value="">Category…</option>
            {(() => {
              const { standalone, groups } = groupCategoriesByParent(categories);
              return (
                <>
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
                </>
              );
            })()}
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
            value={form.necessity}
            onChange={(e) => setForm({ ...form, necessity: e.target.value })}
          >
            <option value="must_have">Must-have</option>
            <option value="good_to_have">Good-to-have</option>
            <option value="not_needed">Not-needed</option>
          </select>
          <input
            className="w-full rounded border border-gray-300 px-2 py-1 text-sm"
            placeholder="Remarks"
            value={form.remarks}
            onChange={(e) => setForm({ ...form, remarks: e.target.value })}
          />
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={form.isReimbursable}
              onChange={(e) => setForm({ ...form, isReimbursable: e.target.checked })}
            />
            Reimbursable
          </label>
          {form.isReimbursable && (
            <input
              className="w-full rounded border border-gray-300 px-2 py-1 text-sm"
              placeholder="Reimbursement party"
              value={form.reimbursementParty}
              onChange={(e) => setForm({ ...form, reimbursementParty: e.target.value })}
            />
          )}
          <button type="submit" className="w-full rounded bg-purple-600 py-1.5 text-sm font-medium text-white">
            Add expense
          </button>
        </form>
      </section>

      <section className="rounded-lg border border-gray-200 p-4">
        <h2 className="mb-2 text-sm font-medium text-gray-500">Quick add income</h2>
        <form onSubmit={addIncome} className="space-y-2">
          <input
            className="w-full rounded border border-gray-300 px-2 py-1 text-sm"
            placeholder="Source"
            value={incomeForm.source}
            onChange={(e) => setIncomeForm({ ...incomeForm, source: e.target.value })}
            required
          />
          <input
            className="w-full rounded border border-gray-300 px-2 py-1 text-sm"
            type="number"
            placeholder="Amount"
            value={incomeForm.amount}
            onChange={(e) => setIncomeForm({ ...incomeForm, amount: e.target.value })}
            required
          />
          <button type="submit" className="w-full rounded bg-gray-800 py-1.5 text-sm font-medium text-white">
            Add income
          </button>
        </form>
      </section>
    </div>
  );
}
