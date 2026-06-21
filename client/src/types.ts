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
