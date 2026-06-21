import axios from "axios";
import type { Category } from "./types";

export const api = axios.create({ baseURL: "/api" });

export function groupCategoriesByParent(categories: Category[]) {
  const byParent = new Map<number, Category[]>();
  for (const c of categories) {
    if (c.parentId == null) continue;
    if (!byParent.has(c.parentId)) byParent.set(c.parentId, []);
    byParent.get(c.parentId)!.push(c);
  }
  const standalone = categories.filter((c) => c.parentId == null && !byParent.has(c.id));
  const groups = categories
    .filter((c) => c.parentId == null && byParent.has(c.id))
    .map((parent) => ({ parent, children: byParent.get(parent.id)! }));
  return { standalone, groups };
}

export function currentMonth() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

export function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(
    amount
  );
}
