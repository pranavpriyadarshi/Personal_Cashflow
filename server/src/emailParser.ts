// Best-effort regex parser for bank/UPI/credit-card alert emails. Bank email templates vary a lot,
// so this covers the common patterns (₹/Rs./INR amount + debited/credited/spent keywords) rather
// than hardcoding every bank — add a sender-keyed override below if a specific bank's format doesn't match.

export interface ParsedEmailTransaction {
  amount: number;
  merchant: string | null;
  mode: "credit_card" | "upi" | "bank_debit" | "bank_credit";
}

const SENDER_LABELS: Array<{ match: string; label: string }> = [
  { match: "sbicard", label: "SBI Card" },
  { match: "axisbank", label: "Axis Bank" },
  { match: "kotak", label: "Kotak Bank" },
  { match: "hdfcbank", label: "HDFC Bank" },
  { match: "icicibank", label: "ICICI Bank" },
  { match: "americanexpress", label: "American Express" },
];

export function sourceLabelForSender(fromAddress: string): string {
  const lower = fromAddress.toLowerCase();
  const known = SENDER_LABELS.find((s) => lower.includes(s.match));
  if (known) return known.label;
  const domain = lower.split("@")[1] ?? lower;
  return domain;
}

const AMOUNT_PATTERN = /(?:Rs\.?|INR|₹)\s?([\d,]+(?:\.\d{1,2})?)/i;
const MERCHANT_PATTERN = /(?:at|to|towards)\s+([A-Za-z0-9 &.,'_-]{3,40})/i;

export function parseEmailBody(subject: string, body: string): ParsedEmailTransaction | null {
  const text = `${subject}\n${body}`;
  const amountMatch = text.match(AMOUNT_PATTERN);
  if (!amountMatch) return null;
  const amount = Number(amountMatch[1]!.replace(/,/g, ""));
  if (!Number.isFinite(amount) || amount <= 0) return null;

  const lower = text.toLowerCase();
  let mode: ParsedEmailTransaction["mode"] = "bank_debit";
  if (lower.includes("upi")) mode = "upi";
  else if (lower.includes("credit card") || lower.includes("card ending")) mode = "credit_card";
  else if (lower.includes("credited") || lower.includes("received")) mode = "bank_credit";
  else if (lower.includes("debited") || lower.includes("spent") || lower.includes("withdrawn"))
    mode = "bank_debit";

  const merchantMatch = text.match(MERCHANT_PATTERN);
  const merchant = merchantMatch ? merchantMatch[1]!.trim() : null;

  return { amount, merchant, mode };
}
