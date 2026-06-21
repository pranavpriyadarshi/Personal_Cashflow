import { useEffect, useState } from "react";
import { api, currentMonth, formatCurrency } from "../api";
import type { DashboardData, InvestmentInstrument } from "../types";

export default function InvestmentPlanner() {
  const [instruments, setInstruments] = useState<InvestmentInstrument[]>([]);
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [form, setForm] = useState({ name: "", expectedAnnualReturnPct: "", lockInYears: "" });
  const [contribForms, setContribForms] = useState<Record<number, { amount: string; runningValue: string }>>({});

  async function load() {
    const [instRes, dashRes] = await Promise.all([
      api.get<InvestmentInstrument[]>("/investments"),
      api.get<DashboardData>("/dashboard", { params: { month: currentMonth() } }),
    ]);
    setInstruments(instRes.data);
    setDashboard(dashRes.data);
  }

  useEffect(() => {
    load();
  }, []);

  async function addInstrument(e: React.FormEvent) {
    e.preventDefault();
    await api.post("/investments", {
      name: form.name,
      expectedAnnualReturnPct: Number(form.expectedAnnualReturnPct),
      lockInYears: form.lockInYears ? Number(form.lockInYears) : null,
    });
    setForm({ name: "", expectedAnnualReturnPct: "", lockInYears: "" });
    load();
  }

  async function addContribution(instrumentId: number) {
    const f = contribForms[instrumentId];
    if (!f?.amount || !f?.runningValue) return;
    await api.post(`/investments/${instrumentId}/contributions`, {
      month: currentMonth(),
      amount: Number(f.amount),
      runningValue: Number(f.runningValue),
    });
    setContribForms({ ...contribForms, [instrumentId]: { amount: "", runningValue: "" } });
    load();
  }

  return (
    <div className="space-y-6">
      {dashboard?.goal && dashboard.goalProjection && (
        <section className="rounded-lg border border-gray-200 p-4">
          <h2 className="mb-1 text-sm font-medium text-gray-500">{dashboard.goal.name}</h2>
          <p className="text-sm">
            Target {formatCurrency(dashboard.goal.targetAmount)} by{" "}
            {new Date(dashboard.goal.targetDate).toLocaleDateString("en-IN", { month: "short", year: "numeric" })}
          </p>
          <p className="text-sm">
            Projected: {formatCurrency(dashboard.goalProjection.projectedValue)} —{" "}
            <span className={dashboard.goalProjection.onTrack ? "text-green-600" : "text-red-600"}>
              {dashboard.goalProjection.onTrack ? "on track" : "behind"}
            </span>
          </p>
        </section>
      )}

      <section className="space-y-3">
        <h2 className="text-sm font-medium text-gray-500">Instruments</h2>
        {instruments.map((inst) => {
          const latest = [...inst.contributions].sort((a, b) => (a.month < b.month ? 1 : -1))[0];
          const f = contribForms[inst.id] ?? { amount: "", runningValue: "" };
          return (
            <div key={inst.id} className="rounded-lg border border-gray-200 p-3">
              <div className="flex justify-between text-sm font-medium">
                <span>{inst.name}</span>
                <span>{inst.expectedAnnualReturnPct}% p.a.</span>
              </div>
              <p className="text-xs text-gray-500">
                Current value: {formatCurrency(latest?.runningValue ?? 0)}
                {inst.lockInYears ? ` · ${inst.lockInYears}y lock-in` : ""}
              </p>
              <div className="mt-2 flex gap-2">
                <input
                  className="w-24 rounded border border-gray-300 px-2 py-1 text-xs"
                  placeholder="Contribution"
                  type="number"
                  value={f.amount}
                  onChange={(e) => setContribForms({ ...contribForms, [inst.id]: { ...f, amount: e.target.value } })}
                />
                <input
                  className="w-28 rounded border border-gray-300 px-2 py-1 text-xs"
                  placeholder="New total value"
                  type="number"
                  value={f.runningValue}
                  onChange={(e) => setContribForms({ ...contribForms, [inst.id]: { ...f, runningValue: e.target.value } })}
                />
                <button
                  onClick={() => addContribution(inst.id)}
                  className="rounded bg-gray-800 px-3 text-xs font-medium text-white"
                >
                  Log
                </button>
              </div>
            </div>
          );
        })}
      </section>

      <section className="rounded-lg border border-gray-200 p-4">
        <h2 className="mb-2 text-sm font-medium text-gray-500">Add instrument</h2>
        <form onSubmit={addInstrument} className="space-y-2">
          <input
            className="w-full rounded border border-gray-300 px-2 py-1 text-sm"
            placeholder="Name (e.g. PPF)"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            required
          />
          <input
            className="w-full rounded border border-gray-300 px-2 py-1 text-sm"
            placeholder="Expected annual return %"
            type="number"
            value={form.expectedAnnualReturnPct}
            onChange={(e) => setForm({ ...form, expectedAnnualReturnPct: e.target.value })}
            required
          />
          <input
            className="w-full rounded border border-gray-300 px-2 py-1 text-sm"
            placeholder="Lock-in years (optional)"
            type="number"
            value={form.lockInYears}
            onChange={(e) => setForm({ ...form, lockInYears: e.target.value })}
          />
          <button type="submit" className="w-full rounded bg-purple-600 py-1.5 text-sm font-medium text-white">
            Add instrument
          </button>
        </form>
      </section>
    </div>
  );
}
