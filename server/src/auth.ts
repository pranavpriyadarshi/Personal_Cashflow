import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET as string;
if (!JWT_SECRET) throw new Error("JWT_SECRET is not set");

export function hashPassword(password: string) {
  return bcrypt.hash(password, 10);
}

export function comparePassword(password: string, hash: string) {
  return bcrypt.compare(password, hash);
}

export function signToken(userId: number) {
  return jwt.sign({ userId }, JWT_SECRET, { expiresIn: "30d" });
}

export function verifyToken(token: string): { userId: number } {
  return jwt.verify(token, JWT_SECRET) as { userId: number };
}

// Short-lived, purpose-scoped token used to carry the initiating user's identity through a
// browser redirect (e.g. Google's OAuth callback), which can't carry an Authorization header.
export function signOAuthState(userId: number, purpose: string) {
  return jwt.sign({ userId, purpose }, JWT_SECRET, { expiresIn: "10m" });
}

export function verifyOAuthState(state: string, purpose: string): number {
  const payload = jwt.verify(state, JWT_SECRET) as { userId: number; purpose: string };
  if (payload.purpose !== purpose) throw new Error("state purpose mismatch");
  return payload.userId;
}
