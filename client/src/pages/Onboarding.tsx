import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api, currentMonth, formatCurrency } from "../api";
import { useAuth } from "../AuthContext";
import type { AllocationAdvice, BudgetEstimate, Goal, Income } from "../types";

const STEPS = ["profile", "income", "fixed_costs", "invest"] as const;
type Step = (typeof STEPS)[number];

const STEP_LABELS: Record<Step, string> = {
  profile: "Profile",
  income: "Income",
  fixed_costs: "Fixed costs",
  invest: "Invest & goals",
};

const OPTIONAL_FIELD_IMPACT: { key: string; label: string; impact: string }[] = [
  { key: "dependentsCount", label: "Dependents", impact: "We can't size your emergency-fund or insurance recommendations accurately." },
  { key: "existingMonthlyEmi", label: "Existing EMI/debt (quick total)", impact: "We'll assume zero existing debt, overstating your investable surplus until you add loans individually." },
  { key: "riskAppetite", label: "Risk appetite", impact: "We'll default to an age-based risk profile until you tell us otherwise." },
  { key: "cityTier", label: "City tier", impact: "We won't be able to benchmark your spending against peers in your city." },
  { key: "maritalStatus", label: "Marital status", impact: "Family-income aggregation and per-head benchmarking won't be available." },
  { key: "lifeInsuranceCover", label: "Life insurance cover", impact: "We can't flag insurance gaps relative to your income and dependents." },
  { key: "healthInsuranceCover", label: "Health insurance cover", impact: "We can't flag health-cover gaps relative to your dependents." },
  { key: "taxRegime", label: "Tax regime", impact: "Tax-saving suggestions (80C, NPS, etc.) will use generic defaults instead of your slab." },
  { key: "emergencyFundMonths", label: "Emergency fund (months saved)", impact: "We can't tell you whether to build a safety net before investing more aggressively." },
];

export default function Onboarding() {
  const { user, refreshUser } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>("profile");

  useEffect(() => {
    if (user && STEPS.includes(user.onboardingStep as Step)) setStep(user.onboardingStep as Step);
  }, [user]);

  async function goTo(next: Step) {
    await api.put("/auth/me", { onboardingStep: next });
    await refreshUser();
    setStep(next);
  }

  async function finish() {
    await api.put("/auth/me", { onboardingStep: "done", onboardingCompletedAt: new Date().toISOString() });
    await refreshUser();
    navigate("/");
  }

  if (!user) return null;

  return (
    <div className="mx-auto max-w-2xl px-4 py-6">
      <h1 className="mb-1 text-lg font-semibold text-gray-900">Set up your Personal CFO</h1>
      <div className="mb-6 flex gap-2 text-xs">
        {STEPS.map((s, i) => (
          <div
            key={s}
            className={`flex-1 rounded py-1 text-center ${
              s === step ? "bg-purple-600 text-white" : i < STEPS.indexOf(step) ? "bg-purple-100 text-purple-600" : "bg-gray-100 text-gray-400"
            }`}
          >
            {STEP_LABELS[s]}
          </div>
        ))}
      </div>

      {step === "profile" && <ProfileStep onContinue={() => goTo("income")} />}
      {step === "income" && <IncomeStep onContinue={() => goTo("fixed_costs")} />}
      {step === "fixed_costs" && <FixedCostsStep onContinue={() => goTo("invest")} />}
      {step === "invest" && <InvestStep onFinish={finish} />}
    </div>
  );
}

function ProfileStep({ onContinue }: { onContinue: () => void }) {
  const { user, refreshUser } = useAuth();
  const [form, setForm] = useState({
    dateOfBirth: user?.dateOfBirth?.slice(0, 10) ?? "",
    employmentType: user?.employmentType ?? "",
    monthlyIncomeEstimate: user?.monthlyIncomeEstimate?.toString() ?? "",
    phone: user?.phone ?? "",
    dependentsCount: user?.dependentsCount?.toString() ?? "",
    existingMonthlyEmi: user?.existingMonthlyEmi?.toString() ?? "",
    riskAppetite: user?.riskAppetite ?? "",
    cityTier: user?.cityTier ?? "",
    maritalStatus: user?.maritalStatus ?? "",
    lifeInsuranceCover: user?.lifeInsuranceCover?.toString() ?? "",
    healthInsuranceCover: user?.healthInsuranceCover?.toString() ?? "",
    taxRegime: user?.taxRegime ?? "",
    emergencyFundMonths: user?.emergencyFundMonths?.toString() ?? "",
  });
  const [showOptional, setShowOptional] = useState(false);
  const [error, setError] = useState("");

  const filledOptionalKeys = new Set(
    Object.entries(form)
      .filter(([k, v]) => OPTIONAL_FIELD_IMPACT.some((f) => f.key === k) && v !== "")
      .map(([k]) => k)
  );

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.dateOfBirth || !form.employmentType || !form.monthlyIncomeEstimate) {
      setError("Date of birth, employment type, and monthly income are required to continue.");
      return;
    }
    await api.put("/auth/me", {
      ...form,
      monthlyIncomeEstimate: Number(form.monthlyIncomeEstimate),
      dependentsCount: form.dependentsCount ? Number(form.dependentsCount) : null,
      existingMonthlyEmi: form.existingMonthlyEmi ? Number(form.existingMonthlyEmi) : null,
      lifeInsuranceCover: form.lifeInsuranceCover ? Number(form.lifeInsuranceCover) : null,
      healthInsuranceCover: form.healthInsuranceCover ? Number(form.healthInsuranceCover) : null,
      emergencyFundMonths: form.emergencyFundMonths ? Number(form.emergencyFundMonths) : null,
      riskAppetite: form.riskAppetite || null,
      cityTier: form.cityTier || null,
      maritalStatus: form.maritalStatus || null,
      taxRegime: form.taxRegime || null,
      phone: form.phone || null,
    });
    await refreshUser();
    onContinue();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <section className="rounded-lg border border-gray-200 p-4">
        <h2 className="mb-2 text-sm font-medium text-gray-500">Required</h2>
        <div className="space-y-2">
          <label className="block text-xs text-gray-500">Date of birth</label>
          <input
            className="w-full rounded border border-gray-300 px-2 py-1 text-sm"
            type="date"
            value={form.dateOfBirth}
            onChange={(e) => setForm({ ...form, dateOfBirth: e.target.value })}
            required
          />
          <label className="block text-xs text-gray-500">Employment type</label>
          <select
            className="w-full rounded border border-gray-300 px-2 py-1 text-sm"
            value={form.employmentType}
            onChange={(e) => setForm({ ...form, employmentType: e.target.value })}
            required
          >
            <option value="">Select…</option>
            <option value="salaried">Salaried</option>
            <option value="self_employed">Self-employed</option>
            <option value="business">Business owner</option>
            <option value="student">Student</option>
            <option value="retired">Retired</option>
          </select>
          <label className="block text-xs text-gray-500">Monthly net (post-tax) income estimate</label>
          <input
            className="w-full rounded border border-gray-300 px-2 py-1 text-sm"
            type="number"
            value={form.monthlyIncomeEstimate}
            onChange={(e) => setForm({ ...form, monthlyIncomeEstimate: e.target.value })}
            required
          />
          <label className="block text-xs text-gray-500">Phone (optional)</label>
          <input
            className="w-full rounded border border-gray-300 px-2 py-1 text-sm"
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
          />
        </div>
      </section>

      <section className="rounded-lg border border-gray-200 p-4">
        <button
          type="button"
          onClick={() => setShowOptional(!showOptional)}
          className="mb-2 text-sm font-medium text-gray-500"
        >
          Optional — {filledOptionalKeys.size}/{OPTIONAL_FIELD_IMPACT.length} filled {showOptional ? "▲" : "▼"}
        </button>
        {showOptional && (
          <div className="space-y-3">
            {OPTIONAL_FIELD_IMPACT.map((f) => (
              <div key={f.key}>
                <label className="block text-xs text-gray-500">{f.label}</label>
                {f.key === "riskAppetite" ? (
                  <select
                    className="w-full rounded border border-gray-300 px-2 py-1 text-sm"
                    value={form.riskAppetite}
                    onChange={(e) => setForm({ ...form, riskAppetite: e.target.value })}
                  >
                    <option value="">Not set</option>
                    <option value="conservative">Conservative</option>
                    <option value="moderate">Moderate</option>
                    <option value="aggressive">Aggressive</option>
                  </select>
                ) : f.key === "cityTier" ? (
                  <select
                    className="w-full rounded border border-gray-300 px-2 py-1 text-sm"
                    value={form.cityTier}
                    onChange={(e) => setForm({ ...form, cityTier: e.target.value })}
                  >
                    <option value="">Not set</option>
                    <option value="metro">Metro</option>
                    <option value="tier2">Tier 2</option>
                    <option value="tier3">Tier 3</option>
                    <option value="rural">Rural</option>
                  </select>
                ) : f.key === "maritalStatus" ? (
                  <select
                    className="w-full rounded border border-gray-300 px-2 py-1 text-sm"
                    value={form.maritalStatus}
                    onChange={(e) => setForm({ ...form, maritalStatus: e.target.value })}
                  >
                    <option value="">Not set</option>
                    <option value="single">Single</option>
                    <option value="married">Married</option>
                  </select>
                ) : f.key === "taxRegime" ? (
                  <select
                    className="w-full rounded border border-gray-300 px-2 py-1 text-sm"
                    value={form.taxRegime}
                    onChange={(e) => setForm({ ...form, taxRegime: e.target.value })}
                  >
                    <option value="">Not set</option>
                    <option value="old">Old regime</option>
                    <option value="new">New regime</option>
                  </select>
                ) : (
                  <input
                    className="w-full rounded border border-gray-300 px-2 py-1 text-sm"
                    type="number"
                    value={(form as any)[f.key]}
                    onChange={(e) => setForm({ ...form, [f.key]: e.target.value })}
                  />
                )}
                {!(form as any)[f.key] && <p className="mt-0.5 text-xs text-amber-600">{f.impact}</p>}
              </div>
            ))}
          </div>
        )}
      </section>

      {error && <p className="text-xs text-red-600">{error}</p>}
      <button type="submit" className="w-full rounded bg-purple-600 py-2 text-sm font-medium text-white">
        Continue
      </button>
    </form>
  );
}

function IncomeStep({ onContinue }: { onContinue: () => void }) {
  const [incomes, setIncomes] = useState<Income[]>([]);
  const [form, setForm] = useState({ source: "", amount: "", type: "salary", isFamilyIncome: false });
  const month = currentMonth();

  async function load() {
    const res = await api.get<Income[]>("/income");
    setIncomes(res.data.filter((i) => i.month === month));
  }

  useEffect(() => {
    load();
  }, []);

  async function addIncome(e: React.FormEvent) {
    e.preventDefault();
    await api.post("/income", { ...form, month, amount: Number(form.amount) });
    setForm({ source: "", amount: "", type: "salary", isFamilyIncome: false });
    load();
  }

  return (
    <div className="space-y-4">
      <section className="rounded-lg border border-gray-200 p-4">
        <h2 className="mb-2 text-sm font-medium text-gray-500">This month's income sources</h2>
        <ul className="mb-3 space-y-1 text-sm">
          {incomes.map((i) => (
            <li key={i.id} className="flex justify-between">
              <span>
                {i.source} {i.isFamilyIncome && <span className="text-xs text-gray-400">(family)</span>}
              </span>
              <span>{formatCurrency(i.amount)}</span>
            </li>
          ))}
          {incomes.length === 0 && <li className="text-xs text-gray-400">No income added yet.</li>}
        </ul>
        <form onSubmit={addIncome} className="space-y-2">
          <select
            className="w-full rounded border border-gray-300 px-2 py-1 text-sm"
            value={form.type}
            onChange={(e) => setForm({ ...form, type: e.target.value })}
          >
            <option value="salary">Salary</option>
            <option value="passive">Passive income</option>
          </select>
          <input
            className="w-full rounded border border-gray-300 px-2 py-1 text-sm"
            placeholder="Source (e.g. Employer, Rental income)"
            value={form.source}
            onChange={(e) => setForm({ ...form, source: e.target.value })}
            required
          />
          <input
            className="w-full rounded border border-gray-300 px-2 py-1 text-sm"
            type="number"
            placeholder="Amount"
            value={form.amount}
            onChange={(e) => setForm({ ...form, amount: e.target.value })}
            required
          />
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={form.isFamilyIncome}
              onChange={(e) => setForm({ ...form, isFamilyIncome: e.target.checked })}
            />
            This is family income, not individual
          </label>
          <button type="submit" className="w-full rounded bg-gray-800 py-1.5 text-sm font-medium text-white">
            Add income
          </button>
        </form>
      </section>
      <button
        onClick={onContinue}
        disabled={incomes.length === 0}
        className="w-full rounded bg-purple-600 py-2 text-sm font-medium text-white disabled:opacity-40"
      >
        Continue
      </button>
      {incomes.length === 0 && <p className="text-center text-xs text-gray-400">Add at least one income source to continue.</p>}
    </div>
  );
}

const BUDGET_CATEGORIES: { key: BudgetEstimate["category"]; label: string; isRange: boolean }[] = [
  { key: "rent", label: "Rent", isRange: false },
  { key: "fees", label: "Fees (school, membership, etc.)", isRange: false },
  { key: "travel", label: "Approx. travel costs", isRange: true },
  { key: "dining", label: "Approx. dining costs", isRange: true },
  { key: "shopping", label: "Approx. shopping/purchases", isRange: true },
];

function FixedCostsStep({ onContinue }: { onContinue: () => void }) {
  const [estimates, setEstimates] = useState<BudgetEstimate[]>([]);
  const [forms, setForms] = useState<Record<string, { min: string; max: string }>>({});

  async function load() {
    const res = await api.get<BudgetEstimate[]>("/budget-estimates");
    setEstimates(res.data);
  }

  useEffect(() => {
    load();
  }, []);

  async function save(category: BudgetEstimate["category"]) {
    const f = forms[category];
    if (!f?.min) return;
    await api.post("/budget-estimates", {
      category,
      minAmount: f.min,
      maxAmount: f.max || f.min,
    });
    setForms({ ...forms, [category]: { min: "", max: "" } });
    load();
  }

  async function remove(id: number) {
    await api.delete(`/budget-estimates/${id}`);
    load();
  }

  return (
    <div className="space-y-4">
      <section className="rounded-lg border border-gray-200 p-4">
        <h2 className="mb-1 text-sm font-medium text-gray-500">Fixed costs</h2>
        <p className="mb-3 text-xs text-gray-400">
          EMIs and bills/subscriptions you've already onboarded in the Loans and Bills tabs are counted automatically — no
          need to re-enter them here.
        </p>
        <div className="space-y-4">
          {BUDGET_CATEGORIES.map((c) => {
            const rows = estimates.filter((e) => e.category === c.key);
            const f = forms[c.key] ?? { min: "", max: "" };
            return (
              <div key={c.key}>
                <p className="text-sm font-medium">{c.label}</p>
                <ul className="mb-1 space-y-1 text-xs text-gray-500">
                  {rows.map((r) => (
                    <li key={r.id} className="flex justify-between">
                      <span>
                        {c.isRange ? `${formatCurrency(r.minAmount)} – ${formatCurrency(r.maxAmount)}` : formatCurrency(r.minAmount)}
                      </span>
                      <button onClick={() => remove(r.id)} className="text-red-500">
                        Remove
                      </button>
                    </li>
                  ))}
                </ul>
                <div className="flex gap-2">
                  <input
                    className="w-24 rounded border border-gray-300 px-2 py-1 text-xs"
                    type="number"
                    placeholder={c.isRange ? "Min" : "Amount"}
                    value={f.min}
                    onChange={(e) => setForms({ ...forms, [c.key]: { ...f, min: e.target.value } })}
                  />
                  {c.isRange && (
                    <input
                      className="w-24 rounded border border-gray-300 px-2 py-1 text-xs"
                      type="number"
                      placeholder="Max"
                      value={f.max}
                      onChange={(e) => setForms({ ...forms, [c.key]: { ...f, max: e.target.value } })}
                    />
                  )}
                  <button onClick={() => save(c.key)} className="rounded bg-gray-800 px-3 text-xs font-medium text-white">
                    Add
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </section>
      <button onClick={onContinue} className="w-full rounded bg-purple-600 py-2 text-sm font-medium text-white">
        Continue
      </button>
    </div>
  );
}

function InvestStep({ onFinish }: { onFinish: () => void }) {
  const { user, refreshUser } = useAuth();
  const [advice, setAdvice] = useState<AllocationAdvice | null>(null);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [profileForm, setProfileForm] = useState({
    riskAppetite: user?.riskAppetite ?? "",
    existingSavingsAmount: user?.existingSavingsAmount?.toString() ?? "",
    emergencyFundMonths: user?.emergencyFundMonths?.toString() ?? "",
  });
  const [goalForm, setGoalForm] = useState({ name: "", targetAmount: "", targetDate: "" });

  async function load() {
    const [adviceRes, goalsRes] = await Promise.all([
      api.get<AllocationAdvice>("/advice/allocation"),
      api.get<Goal[]>("/goals"),
    ]);
    setAdvice(adviceRes.data);
    setGoals(goalsRes.data);
  }

  useEffect(() => {
    load();
  }, []);

  async function savePreferences(e: React.FormEvent) {
    e.preventDefault();
    await api.put("/auth/me", {
      riskAppetite: profileForm.riskAppetite || null,
      existingSavingsAmount: profileForm.existingSavingsAmount ? Number(profileForm.existingSavingsAmount) : null,
      emergencyFundMonths: profileForm.emergencyFundMonths ? Number(profileForm.emergencyFundMonths) : null,
    });
    await refreshUser();
    load();
  }

  async function addGoal(e: React.FormEvent) {
    e.preventDefault();
    await api.post("/goals", {
      name: goalForm.name,
      targetAmount: Number(goalForm.targetAmount),
      targetDate: goalForm.targetDate,
      riskAppetite: profileForm.riskAppetite || null,
    });
    setGoalForm({ name: "", targetAmount: "", targetDate: "" });
    load();
  }

  return (
    <div className="space-y-4">
      <section className="rounded-lg border border-gray-200 p-4">
        <h2 className="mb-2 text-sm font-medium text-gray-500">Risk profile & existing savings</h2>
        <form onSubmit={savePreferences} className="space-y-2">
          <label className="block text-xs text-gray-500">Risk appetite</label>
          <select
            className="w-full rounded border border-gray-300 px-2 py-1 text-sm"
            value={profileForm.riskAppetite}
            onChange={(e) => setProfileForm({ ...profileForm, riskAppetite: e.target.value })}
          >
            <option value="">Default by age</option>
            <option value="conservative">Conservative</option>
            <option value="moderate">Moderate</option>
            <option value="aggressive">Aggressive</option>
          </select>
          <label className="block text-xs text-gray-500">Existing savings / lump sum to invest</label>
          <input
            className="w-full rounded border border-gray-300 px-2 py-1 text-sm"
            type="number"
            value={profileForm.existingSavingsAmount}
            onChange={(e) => setProfileForm({ ...profileForm, existingSavingsAmount: e.target.value })}
          />
          <label className="block text-xs text-gray-500">Emergency fund already saved (months of expenses)</label>
          <input
            className="w-full rounded border border-gray-300 px-2 py-1 text-sm"
            type="number"
            value={profileForm.emergencyFundMonths}
            onChange={(e) => setProfileForm({ ...profileForm, emergencyFundMonths: e.target.value })}
          />
          <button type="submit" className="w-full rounded bg-gray-800 py-1.5 text-sm font-medium text-white">
            Save & recompute
          </button>
        </form>
      </section>

      {advice && (
        <section className="rounded-lg border border-gray-200 p-4">
          <h2 className="mb-1 text-sm font-medium text-gray-500">
            Suggested allocation ({advice.riskAppetiteUsed}
            {advice.riskAppetiteIsDefaulted ? ", defaulted by age" : ""})
          </h2>
          <p className="text-xs text-gray-500">
            Income {formatCurrency(advice.monthlyIncome)} − fixed costs {formatCurrency(advice.fixedCosts.total)} ={" "}
            <span className="font-medium text-gray-700">{formatCurrency(advice.investableMonthlyAmount)}</span> investable/month
          </p>
          {advice.emergencyFundGapAmount > 0 && (
            <p className="mt-1 text-xs text-amber-600">
              Emergency fund gap: {formatCurrency(advice.emergencyFundGapAmount)} — existing savings are routed here first.
            </p>
          )}
          <p className="mt-3 text-xs font-medium text-gray-500">Monthly surplus</p>
          <ul className="text-sm">
            {advice.monthlyAllocation.map((b) => (
              <li key={b.name} className="flex justify-between">
                <span>{b.name} ({b.pct}%)</span>
                <span>{formatCurrency(b.amount)}</span>
              </li>
            ))}
          </ul>
          {advice.lumpSumAllocation.some((b) => b.amount > 0) && (
            <>
              <p className="mt-3 text-xs font-medium text-gray-500">Existing savings</p>
              <ul className="text-sm">
                {advice.lumpSumAllocation
                  .filter((b) => b.amount > 0)
                  .map((b) => (
                    <li key={b.name} className="flex justify-between">
                      <span>{b.name}{b.pct != null ? ` (${b.pct}%)` : ""}</span>
                      <span>{formatCurrency(b.amount)}</span>
                    </li>
                  ))}
              </ul>
            </>
          )}
        </section>
      )}

      <section className="rounded-lg border border-gray-200 p-4">
        <h2 className="mb-2 text-sm font-medium text-gray-500">Goals</h2>
        <ul className="mb-3 space-y-1 text-sm">
          {goals.map((g) => (
            <li key={g.id} className="flex justify-between">
              <span>{g.name}</span>
              <span className="text-gray-500">
                {formatCurrency(g.targetAmount)} by {new Date(g.targetDate).toLocaleDateString("en-IN", { month: "short", year: "numeric" })}
              </span>
            </li>
          ))}
          {goals.length === 0 && <li className="text-xs text-gray-400">No goals yet.</li>}
        </ul>
        <form onSubmit={addGoal} className="space-y-2">
          <input
            className="w-full rounded border border-gray-300 px-2 py-1 text-sm"
            placeholder="Goal name (e.g. ₹30L by Apr 2030)"
            value={goalForm.name}
            onChange={(e) => setGoalForm({ ...goalForm, name: e.target.value })}
            required
          />
          <input
            className="w-full rounded border border-gray-300 px-2 py-1 text-sm"
            type="number"
            placeholder="Target amount"
            value={goalForm.targetAmount}
            onChange={(e) => setGoalForm({ ...goalForm, targetAmount: e.target.value })}
            required
          />
          <input
            className="w-full rounded border border-gray-300 px-2 py-1 text-sm"
            type="date"
            value={goalForm.targetDate}
            onChange={(e) => setGoalForm({ ...goalForm, targetDate: e.target.value })}
            required
          />
          <button type="submit" className="w-full rounded bg-gray-800 py-1.5 text-sm font-medium text-white">
            Add goal
          </button>
        </form>
      </section>

      <button onClick={onFinish} className="w-full rounded bg-purple-600 py-2 text-sm font-medium text-white">
        Finish setup
      </button>
    </div>
  );
}
