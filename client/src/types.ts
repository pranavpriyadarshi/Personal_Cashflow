export interface EmailAccount {
  id: number;
  emailAddress: string;
  provider: "gmail" | "imap";
  authType: "oauth" | "imap_password";
  lastSyncedAt: string | null;
  createdAt: string;
}

export interface EmailTransaction {
  id: number;
  emailAccountId: number;
  emailAccount: { emailAddress: string };
  receivedAt: string;
  sourceLabel: string;
  mode: "credit_card" | "upi" | "bank_debit" | "bank_credit";
  parsedAmount: number;
  parsedMerchant: string | null;
  rawSnippet: string;
  reconciled: boolean;
  linkedTransactionId: number | null;
}

export interface User {
  id: number;
  email: string;
  name: string;
  dateOfBirth: string | null;
  employmentType: "salaried" | "self_employed" | "business" | "student" | "retired" | null;
  monthlyIncomeEstimate: number | null;
  phone: string | null;
  dependentsCount: number | null;
  existingMonthlyEmi: number | null;
  riskAppetite: "conservative" | "moderate" | "aggressive" | null;
  cityTier: "metro" | "tier2" | "tier3" | "rural" | null;
  maritalStatus: "single" | "married" | null;
  lifeInsuranceCover: number | null;
  healthInsuranceCover: number | null;
  taxRegime: "old" | "new" | null;
  emergencyFundMonths: number | null;
  existingSavingsAmount: number | null;
  existingSavingsNotes: string | null;
  onboardingStep: "profile" | "income" | "fixed_costs" | "invest" | "done";
  onboardingCompletedAt: string | null;
}

export interface BudgetEstimate {
  id: number;
  category: "rent" | "fees" | "travel" | "dining" | "shopping" | "other";
  label: string | null;
  minAmount: number;
  maxAmount: number;
}

export interface AllocationAdvice {
  monthlyIncome: number;
  fixedCosts: { emiTotal: number; subscriptionTotal: number; budgetTotal: number; total: number };
  investableMonthlyAmount: number;
  riskAppetiteUsed: "conservative" | "moderate" | "aggressive";
  riskAppetiteIsDefaulted: boolean;
  emergencyFundGapAmount: number;
  lumpSumAllocation: { name: string; pct: number | null; amount: number }[];
  monthlyAllocation: { name: string; pct: number; amount: number }[];
}

export interface Category {
  id: number;
  name: string;
  group: "expense" | "investment" | "credit_card";
  parentId: number | null;
}

export interface Subscription {
  id: number;
  name: string;
  categoryId: number;
  category: Category;
  amount: number;
  billingCycle: "monthly" | "quarterly" | "yearly";
  nextRenewalDate: string;
  autoDebit: boolean;
  notes: string | null;
}

export interface Transaction {
  id: number;
  date: string;
  categoryId: number;
  category: Category;
  amount: number;
  remarks: string | null;
  month: string;
  necessity: "must_have" | "good_to_have" | "not_needed";
  isReimbursable: boolean;
  reimbursementParty: string | null;
  reimbursementStatus: "pending" | "received" | null;
}

export interface Income {
  id: number;
  month: string;
  source: string;
  amount: number;
  type: "salary" | "passive" | "reimbursement";
  isFamilyIncome: boolean;
  linkedTransactionId: number | null;
}

export interface LoanStage {
  emisPaid: number;
  emisRemaining: number;
  percentComplete: number;
  estimatedOutstanding: number;
  payoffDate: string;
  isClosed: boolean;
}

export interface Loan {
  id: number;
  name: string;
  lenderName: string | null;
  loanType: "home" | "personal" | "car" | "education" | "other";
  principalAmount: number;
  interestRatePct: number;
  tenureMonths: number;
  emiAmount: number;
  loanStartDate: string;
  firstEmiDate: string;
  outstandingPrincipal: number | null;
  status: "active" | "closed";
  stage: LoanStage;
}

export interface CreditCard {
  id: number;
  name: string;
  rewardProfile: Record<string, number>;
  payments: CreditCardPayment[];
}

export interface CreditCardPayment {
  id: number;
  creditCardId: number;
  month: string;
  amount: number;
  estimatedRewardsEarned: number;
}

export interface InvestmentInstrument {
  id: number;
  name: string;
  expectedAnnualReturnPct: number;
  lockInYears: number | null;
  taxBenefitNotes: string | null;
  contributions: InvestmentContribution[];
}

export interface InvestmentContribution {
  id: number;
  instrumentId: number;
  month: string;
  amount: number;
  runningValue: number;
}

export interface Goal {
  id: number;
  name: string;
  targetAmount: number;
  targetDate: string;
  riskAppetite: "conservative" | "moderate" | "aggressive" | null;
}

export interface DashboardData {
  month: string;
  totalIncome: number;
  netExpenses: number;
  savings: number;
  costRatio: number;
  costRatioTargetMet: boolean;
  necessity: {
    must_have: number;
    good_to_have: number;
    not_needed: number;
    total: number;
    notNeededPct: number;
  };
  goal: Goal | null;
  goalProjection: {
    projectedValue: number;
    shortfall: number;
    onTrack: boolean;
    requiredMonthlyContribution: number;
  } | null;
}
