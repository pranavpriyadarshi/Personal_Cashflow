import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api, currentMonth, formatCurrency } from "../api";
import type { CreditCard, DashboardData, InvestmentInstrument, Loan, Subscription, Transaction } from "../types";

export default function Overview() {
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [loans, setLoans] = useState<Loan[]>([]);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [cards, setCards] = useState<CreditCard[]>([]);
  const [instruments, setInstruments] = useState<InvestmentInstrument[]>([]);
  const [reimbursements, setReimbursements] = useState<{ reimbursements: Transaction[]; pendingTotal: number }>({
    reimbursements: [],
    pendingTotal: 0,
  });

  useEffect(() => {
    const month = currentMonth();
    api.get<DashboardData>("/dashboard", { params: { month } }).then((r) => setDashboard(r.data));
    api.get<Loan[]>("/loans").then((r) => setLoans(r.data));
    api.get<Subscription[]>("/subscriptions").then((r) => setSubscriptions(r.data));
    api.get<CreditCard[]>("/credit-cards").then((r) => setCards(r.data));
    api.get<InvestmentInstrument[]>("/investments").then((r) => setInstruments(r.data));
    api
      .get<{ reimbursements: Transaction[]; pendingTotal: number }>("/transactions/reimbursements")
      .then((r) => setReimbursements(r.data));
  }, []);

  if (!dashboard) return <p className="text-sm text-gray-500 dark:text-gray-400">Loading…</p>;

  const ratioPct = Math.round(dashboard.costRatio * 100);
  const activeLoans = loans.filter((l) => !l.stage.isClosed);
  const totalOutstandingLoans = activeLoans.reduce((sum, l) => sum + l.stage.estimatedOutstanding, 0);
  const totalMonthlyEmi = activeLoans.reduce((sum, l) => sum + l.emiAmount, 0);

  const upcomingBills = [...subscriptions]
    .sort((a, b) => new Date(a.nextRenewalDate).getTime() - new Date(b.nextRenewalDate).getTime())
    .slice(0, 3);

  const totalCardRewards = cards.reduce(
    (sum, c) => sum + c.payments.reduce((s, p) => s + p.estimatedRewardsEarned, 0),
    0
  );

  const totalInvested = instruments.reduce((sum, inst) => {
    const latest = [...inst.contributions].sort((a, b) => (a.month < b.month ? 1 : -1))[0];
    return sum + (latest?.runningValue ?? 0);
  }, 0);

  return (
    <div className="space-y-5">
      <section className="rounded-lg border border-gray-200 dark:border-gray-700 p-4">
        <h2 className="mb-2 text-sm font-medium text-gray-500 dark:text-gray-400">This month ({dashboard.month})</h2>
        <div className="grid grid-cols-3 gap-2 text-center">
          <div>
            <p className="text-xs text-gray-500 dark:text-gray-400">Income</p>
            <p className="font-semibold">{formatCurrency(dashboard.totalIncome)}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500 dark:text-gray-400">Expenses</p>
            <p className="font-semibold">{formatCurrency(dashboard.netExpenses)}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500 dark:text-gray-400">Savings</p>
            <p className="font-semibold">{formatCurrency(dashboard.savings)}</p>
          </div>
        </div>
        <div className="mt-3 flex items-center justify-between text-xs">
          <span className="text-gray-500 dark:text-gray-400">Cost ratio vs 50% target</span>
          <span className={dashboard.costRatioTargetMet ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}>{ratioPct}%</span>
        </div>
        <div className="mt-1 h-2 w-full overflow-hidden rounded bg-gray-100 dark:bg-gray-700">
          <div
            className={`h-full ${dashboard.costRatioTargetMet ? "bg-green-500" : "bg-red-500"}`}
            style={{ width: `${Math.min(ratioPct, 100)}%` }}
          />
        </div>
        <Link to="/add" className="mt-2 inline-block text-xs text-purple-600 dark:text-purple-400">
          Add transaction / income →
        </Link>
      </section>

      {dashboard.goal && dashboard.goalProjection && (
        <section className="rounded-lg border border-gray-200 dark:border-gray-700 p-4">
          <h2 className="mb-1 text-sm font-medium text-gray-500 dark:text-gray-400">Goal: {dashboard.goal.name}</h2>
          <p className="text-sm">
            Projected {formatCurrency(dashboard.goalProjection.projectedValue)} —{" "}
            <span className={dashboard.goalProjection.onTrack ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}>
              {dashboard.goalProjection.onTrack ? "on track" : "behind"}
            </span>
          </p>
          <Link to="/investments" className="mt-1 inline-block text-xs text-purple-600 dark:text-purple-400">
            View investments →
          </Link>
        </section>
      )}

      <section className="rounded-lg border border-gray-200 dark:border-gray-700 p-4">
        <div className="mb-1 flex items-center justify-between">
          <h2 className="text-sm font-medium text-gray-500 dark:text-gray-400">Loans</h2>
          <Link to="/loans" className="text-xs text-purple-600 dark:text-purple-400">View all →</Link>
        </div>
        {activeLoans.length === 0 ? (
          <p className="text-xs text-gray-400 dark:text-gray-500">No active loans.</p>
        ) : (
          <>
            <p className="text-sm">
              {formatCurrency(totalOutstandingLoans)} outstanding · {formatCurrency(totalMonthlyEmi)}/mo across{" "}
              {activeLoans.length} loan{activeLoans.length > 1 ? "s" : ""}
            </p>
            <ul className="mt-2 space-y-1 text-xs text-gray-500 dark:text-gray-400">
              {activeLoans.map((l) => (
                <li key={l.id} className="flex justify-between">
                  <span>{l.name}</span>
                  <span>{Math.round(l.stage.percentComplete * 100)}% paid</span>
                </li>
              ))}
            </ul>
          </>
        )}
      </section>

      <section className="rounded-lg border border-gray-200 dark:border-gray-700 p-4">
        <div className="mb-1 flex items-center justify-between">
          <h2 className="text-sm font-medium text-gray-500 dark:text-gray-400">Upcoming bills</h2>
          <Link to="/bills" className="text-xs text-purple-600 dark:text-purple-400">View all →</Link>
        </div>
        {upcomingBills.length === 0 ? (
          <p className="text-xs text-gray-400 dark:text-gray-500">No bills onboarded.</p>
        ) : (
          <ul className="space-y-1 text-sm">
            {upcomingBills.map((b) => (
              <li key={b.id} className="flex justify-between">
                <span>{b.name}</span>
                <span className="text-gray-500 dark:text-gray-400">
                  {formatCurrency(b.amount)} ·{" "}
                  {new Date(b.nextRenewalDate).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-lg border border-gray-200 dark:border-gray-700 p-4">
        <div className="mb-1 flex items-center justify-between">
          <h2 className="text-sm font-medium text-gray-500 dark:text-gray-400">Credit cards</h2>
          <Link to="/cards" className="text-xs text-purple-600 dark:text-purple-400">View all →</Link>
        </div>
        {cards.length === 0 ? (
          <p className="text-xs text-gray-400 dark:text-gray-500">No cards onboarded.</p>
        ) : (
          <>
            <p className="text-sm">{formatCurrency(totalCardRewards)} rewards earned across {cards.length} card{cards.length > 1 ? "s" : ""}</p>
            <ul className="mt-2 space-y-1 text-xs text-gray-500 dark:text-gray-400">
              {cards.map((c) => (
                <li key={c.id} className="flex justify-between">
                  <span>{c.name}</span>
                  <span>{formatCurrency(c.payments.reduce((s, p) => s + p.amount, 0))} paid</span>
                </li>
              ))}
            </ul>
          </>
        )}
      </section>

      <section className="rounded-lg border border-gray-200 dark:border-gray-700 p-4">
        <div className="mb-1 flex items-center justify-between">
          <h2 className="text-sm font-medium text-gray-500 dark:text-gray-400">Investments</h2>
          <Link to="/investments" className="text-xs text-purple-600 dark:text-purple-400">View all →</Link>
        </div>
        {instruments.length === 0 ? (
          <p className="text-xs text-gray-400 dark:text-gray-500">No instruments onboarded.</p>
        ) : (
          <p className="text-sm">{formatCurrency(totalInvested)} invested across {instruments.length} instrument{instruments.length > 1 ? "s" : ""}</p>
        )}
      </section>

      <section className="rounded-lg border border-gray-200 dark:border-gray-700 p-4">
        <div className="mb-1 flex items-center justify-between">
          <h2 className="text-sm font-medium text-gray-500 dark:text-gray-400">Reimbursements pending</h2>
          <Link to="/reimbursements" className="text-xs text-purple-600 dark:text-purple-400">View all →</Link>
        </div>
        <p className="text-sm">
          {formatCurrency(reimbursements.pendingTotal)} pending across{" "}
          {reimbursements.reimbursements.filter((t) => t.reimbursementStatus !== "received").length} claim(s)
        </p>
      </section>
    </div>
  );
}
