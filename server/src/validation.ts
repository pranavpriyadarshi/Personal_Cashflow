const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isValidEmail(email: unknown): email is string {
  return typeof email === "string" && email.length <= 254 && EMAIL_RE.test(email);
}

// Requires 8+ chars with at least one uppercase, one lowercase, and one digit —
// enforced server-side since client-side checks alone are trivially bypassed.
export function passwordStrengthError(password: unknown): string | null {
  if (typeof password !== "string") return "password is required";
  if (password.length < 8) return "password must be at least 8 characters";
  if (!/[a-z]/.test(password)) return "password must include a lowercase letter";
  if (!/[A-Z]/.test(password)) return "password must include an uppercase letter";
  if (!/[0-9]/.test(password)) return "password must include a number";
  return null;
}
