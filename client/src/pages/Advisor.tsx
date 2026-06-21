import { useEffect, useState } from "react";
import { api, currentMonth, formatCurrency } from "../api";
import type { DashboardData } from "../types";

interface ReallocationSuggestion {
  tier: string;
  laggingInstrument: string;
  betterInstrument: string;
  returnGapPct: number;
}

export default function Advisor() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [suggestions, setSuggestions] = useState<ReallocationSuggestion[]>([]);

  useEffect(() => {
    api.get<DashboardData>("/dashboard", { params: { month: currentMonth() } }).then((r) => setData(r.data));
    api.get<ReallocationSuggestion[]>("/investments/reallocation-suggestions").then((r) => setSuggestions(r.data));
  }, []);

  if (!data) return <p className="text-sm text-gray-500">Loading…</p>;

  const ratioPct = Math.round(data.costRatio * 100);
  const notNeededPct = Math.round(data.necessity.notNeededPct * 100);
  const nudges: string[] = [];

  if (!data.costRatioTargetMet) {
    nudges.push(
      `Your cost ratio is ${ratioPct}% of income, above the 50% target. Trim ${formatCurrency(
        data.netExpenses - data.totalIncome * 0.5
      )} to get back under target.`
    );
  } else {
    nudges.push(`Cost ratio is ${ratioPct}%, within the 50% target. Keep it up.`);
  }

  if (data.necessity.not_needed > 0) {
    nudges.push(
      `${notNeededPct}% of this month's spend (${formatCurrency(
        data.necessity.not_needed
      )}) was tagged "not-needed" — redirecting it to investments would speed up your goal.`
    );
  }

  return (
    <div className="space-y-6">
      <section className="rounded-lg border border-gray-200 p-4">
        <h2 className="mb-2 text-sm font-medium text-gray-500">This month's nudges</h2>
        <ul className="space-y-2 text-sm">
          {nudges.map((n, i) => (
            <li key={i} className="rounded bg-purple-50 p-2 text-purple-900">
              {n}
            </li>
          ))}
        </ul>
      </section>

      <section className="rounded-lg border border-gray-200 p-4">
        <h2 className="mb-2 text-sm font-medium text-gray-500">Investment reallocation suggestions</h2>
        {suggestions.length === 0 && <p className="text-xs text-gray-400">No reallocation suggestions right now.</p>}
        <ul className="space-y-2 text-sm">
          {suggestions.map((s, i) => (
            <li key={i} className="rounded bg-amber-50 p-2 text-amber-900">
              In the {s.tier} tier, {s.betterInstrument} outperforms {s.laggingInstrument} by{" "}
              {s.returnGapPct.toFixed(1)}pp — consider directing new contributions there.
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
