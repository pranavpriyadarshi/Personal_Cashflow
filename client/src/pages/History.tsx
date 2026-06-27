import { useEffect, useState } from "react";
import { Line, LineChart, CartesianGrid, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { api } from "../api";
import type { DashboardData } from "../types";

function lastMonths(n: number): string[] {
  const months: string[] = [];
  const now = new Date();
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
  }
  return months;
}

export default function History() {
  const [rows, setRows] = useState<Array<{ month: string; income: number; expenses: number; savings: number; costRatioPct: number }>>([]);

  useEffect(() => {
    const months = lastMonths(6);
    Promise.all(months.map((m) => api.get<DashboardData>("/dashboard", { params: { month: m } }))).then((results) => {
      setRows(
        results.map((r, i) => ({
          month: months[i]!,
          income: r.data.totalIncome,
          expenses: r.data.netExpenses,
          savings: r.data.savings,
          costRatioPct: Math.round(r.data.costRatio * 100),
        }))
      );
    });
  }, []);

  return (
    <div className="space-y-6">
      <section className="rounded-lg border border-gray-200 dark:border-gray-700 p-4">
        <h2 className="mb-2 text-sm font-medium text-gray-500 dark:text-gray-400">Last 6 months</h2>
        <ResponsiveContainer width="100%" height={250}>
          <LineChart data={rows}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="month" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} />
            <Tooltip />
            <Legend />
            <Line type="monotone" dataKey="income" stroke="#16a34a" />
            <Line type="monotone" dataKey="expenses" stroke="#dc2626" />
            <Line type="monotone" dataKey="savings" stroke="#9333ea" />
          </LineChart>
        </ResponsiveContainer>
      </section>

      <section className="rounded-lg border border-gray-200 dark:border-gray-700 p-4">
        <h2 className="mb-2 text-sm font-medium text-gray-500 dark:text-gray-400">Cost ratio % (target 50%)</h2>
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={rows}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="month" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} domain={[0, 100]} />
            <Tooltip />
            <Line type="monotone" dataKey="costRatioPct" stroke="#2563eb" />
          </LineChart>
        </ResponsiveContainer>
      </section>
    </div>
  );
}
