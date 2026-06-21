import { useEffect, useState } from "react";
import { api, formatCurrency } from "../api";
import type { Loan } from "../types";

const LOAN_TYPE_LABELS: Record<string, string> = {
  home: "Home Loan",
  personal: "Personal Loan",
  car: "Car Loan",
  education: "Education Loan",
  other: "Other",
};

export default function Loans() {
  const [loans, setLoans] = useState<Loan[]>([]);
  const [outstandingEdits, setOutstandingEdits] = useState<Record<number, string>>({});
  const [form, setForm] = useState({
    name: "",
    lenderName: "",
    loanType: "personal",
    principalAmount: "",
    interestRatePct: "",
    tenureMonths: "",
    emiAmount: "",
    loanStartDate: "",
    firstEmiDate: "",
    outstandingPrincipal: "",
  });

  async function load() {
    const res = await api.get<Loan[]>("/loans");
    setLoans(res.data);
  }

  useEffect(() => {
    load();
  }, []);

  async function addLoan(e: React.FormEvent) {
    e.preventDefault();
    await api.post("/loans", form);
    setForm({
      name: "",
      lenderName: "",
      loanType: "personal",
      principalAmount: "",
      interestRatePct: "",
      tenureMonths: "",
      emiAmount: "",
      loanStartDate: "",
      firstEmiDate: "",
      outstandingPrincipal: "",
    });
    load();
  }

  async function logEmi(id: number) {
    const outstandingPrincipal = outstandingEdits[id];
    await api.post(`/loans/${id}/log-emi`, outstandingPrincipal ? { outstandingPrincipal } : {});
    setOutstandingEdits({ ...outstandingEdits, [id]: "" });
    load();
  }

  async function updateOutstanding(id: number) {
    const outstandingPrincipal = outstandingEdits[id];
    if (!outstandingPrincipal) return;
    await api.put(`/loans/${id}`, { outstandingPrincipal });
    setOutstandingEdits({ ...outstandingEdits, [id]: "" });
    load();
  }

  async function removeLoan(id: number) {
    await api.delete(`/loans/${id}`);
    load();
  }

  return (
    <div className="space-y-6">
      <section className="space-y-3">
        <h2 className="text-sm font-medium text-gray-500">Loans & EMIs</h2>
        {loans.map((loan) => {
          const pct = Math.round(loan.stage.percentComplete * 100);
          return (
            <div key={loan.id} className="rounded-lg border border-gray-200 p-3">
              <div className="flex justify-between text-sm font-medium">
                <span>
                  {loan.name} {loan.stage.isClosed && <span className="text-green-600">(closed)</span>}
                </span>
                <span>{formatCurrency(loan.emiAmount)}/mo</span>
              </div>
              <p className="text-xs text-gray-500">
                {LOAN_TYPE_LABELS[loan.loanType] ?? loan.loanType}
                {loan.lenderName ? ` · ${loan.lenderName}` : ""} · {loan.interestRatePct}% p.a.
              </p>

              <div className="mt-2 h-2 w-full overflow-hidden rounded bg-gray-100">
                <div className="h-full bg-purple-600" style={{ width: `${Math.min(pct, 100)}%` }} />
              </div>
              <p className="mt-1 text-xs text-gray-500">
                EMI {loan.stage.emisPaid} of {loan.tenureMonths} paid ({pct}%) · {loan.stage.emisRemaining} remaining
              </p>
              <p className="text-xs text-gray-500">
                Outstanding: {formatCurrency(loan.stage.estimatedOutstanding)}
                {loan.outstandingPrincipal == null && " (estimated from schedule)"}
              </p>
              <p className="text-xs text-gray-500">
                Payoff: {new Date(loan.stage.payoffDate).toLocaleDateString("en-IN", { month: "short", year: "numeric" })}
              </p>

              <div className="mt-2 flex flex-wrap items-center gap-2">
                <input
                  className="w-32 rounded border border-gray-300 px-2 py-1 text-xs"
                  placeholder="Latest outstanding"
                  type="number"
                  value={outstandingEdits[loan.id] ?? ""}
                  onChange={(e) => setOutstandingEdits({ ...outstandingEdits, [loan.id]: e.target.value })}
                />
                <button onClick={() => updateOutstanding(loan.id)} className="text-xs text-purple-600">
                  Update outstanding
                </button>
                <button onClick={() => logEmi(loan.id)} className="text-xs text-gray-800">
                  Log this month's EMI
                </button>
                <button onClick={() => removeLoan(loan.id)} className="text-xs text-red-500">
                  Remove
                </button>
              </div>
            </div>
          );
        })}
        {loans.length === 0 && <p className="text-xs text-gray-400">No loans onboarded yet.</p>}
      </section>

      <section className="rounded-lg border border-gray-200 p-4">
        <h2 className="mb-2 text-sm font-medium text-gray-500">Onboard a loan</h2>
        <form onSubmit={addLoan} className="space-y-2">
          <input
            className="w-full rounded border border-gray-300 px-2 py-1 text-sm"
            placeholder="Name (e.g. Home Loan - HDFC)"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            required
          />
          <input
            className="w-full rounded border border-gray-300 px-2 py-1 text-sm"
            placeholder="Lender (optional)"
            value={form.lenderName}
            onChange={(e) => setForm({ ...form, lenderName: e.target.value })}
          />
          <select
            className="w-full rounded border border-gray-300 px-2 py-1 text-sm"
            value={form.loanType}
            onChange={(e) => setForm({ ...form, loanType: e.target.value })}
          >
            <option value="home">Home Loan</option>
            <option value="personal">Personal Loan</option>
            <option value="car">Car Loan</option>
            <option value="education">Education Loan</option>
            <option value="other">Other</option>
          </select>
          <input
            className="w-full rounded border border-gray-300 px-2 py-1 text-sm"
            placeholder="Principal amount"
            type="number"
            value={form.principalAmount}
            onChange={(e) => setForm({ ...form, principalAmount: e.target.value })}
            required
          />
          <input
            className="w-full rounded border border-gray-300 px-2 py-1 text-sm"
            placeholder="Annual interest rate %"
            type="number"
            value={form.interestRatePct}
            onChange={(e) => setForm({ ...form, interestRatePct: e.target.value })}
            required
          />
          <input
            className="w-full rounded border border-gray-300 px-2 py-1 text-sm"
            placeholder="Tenure (months)"
            type="number"
            value={form.tenureMonths}
            onChange={(e) => setForm({ ...form, tenureMonths: e.target.value })}
            required
          />
          <input
            className="w-full rounded border border-gray-300 px-2 py-1 text-sm"
            placeholder="EMI amount"
            type="number"
            value={form.emiAmount}
            onChange={(e) => setForm({ ...form, emiAmount: e.target.value })}
            required
          />
          <label className="block text-xs text-gray-500">Loan start / disbursement date</label>
          <input
            className="w-full rounded border border-gray-300 px-2 py-1 text-sm"
            type="date"
            value={form.loanStartDate}
            onChange={(e) => setForm({ ...form, loanStartDate: e.target.value })}
            required
          />
          <label className="block text-xs text-gray-500">First EMI date</label>
          <input
            className="w-full rounded border border-gray-300 px-2 py-1 text-sm"
            type="date"
            value={form.firstEmiDate}
            onChange={(e) => setForm({ ...form, firstEmiDate: e.target.value })}
            required
          />
          <input
            className="w-full rounded border border-gray-300 px-2 py-1 text-sm"
            placeholder="Current outstanding principal (optional, from latest statement)"
            type="number"
            value={form.outstandingPrincipal}
            onChange={(e) => setForm({ ...form, outstandingPrincipal: e.target.value })}
          />
          <button type="submit" className="w-full rounded bg-purple-600 py-1.5 text-sm font-medium text-white">
            Add loan
          </button>
        </form>
      </section>
    </div>
  );
}
