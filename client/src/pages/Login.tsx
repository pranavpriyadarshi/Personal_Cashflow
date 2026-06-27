import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../AuthContext";
import { isValidEmail } from "../validation";
import GoogleSignInButton, { isGoogleSignInConfigured } from "../components/GoogleSignInButton";

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!isValidEmail(email)) {
      setError("Enter a valid email address.");
      return;
    }
    try {
      await login(email, password);
      navigate("/");
    } catch (err: any) {
      setError(err?.response?.data?.error ?? "Invalid email or password.");
    }
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-sm flex-col justify-center px-4">
      <h1 className="mb-1 text-xl font-semibold text-gray-900 dark:text-gray-100">Personal CFO</h1>
      <p className="mb-6 text-sm text-gray-500 dark:text-gray-400">Log in to your account</p>
      <form onSubmit={handleSubmit} className="space-y-3">
        <input
          className="w-full rounded border border-gray-300 dark:border-gray-600 px-3 py-2 text-sm"
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <input
          className="w-full rounded border border-gray-300 dark:border-gray-600 px-3 py-2 text-sm"
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        {error && <p className="text-xs text-red-600 dark:text-red-400">{error}</p>}
        <button type="submit" className="w-full rounded bg-purple-600 dark:bg-purple-500 py-2 text-sm font-medium text-white">
          Log in
        </button>
      </form>
      {isGoogleSignInConfigured && (
        <>
          <div className="my-4 flex items-center gap-2 text-xs text-gray-400 dark:text-gray-500">
            <div className="h-px flex-1 bg-gray-200 dark:bg-gray-700" />
            or
            <div className="h-px flex-1 bg-gray-200 dark:bg-gray-700" />
          </div>
          <GoogleSignInButton onError={setError} />
        </>
      )}
      <p className="mt-4 text-center text-xs text-gray-500 dark:text-gray-400">
        No account?{" "}
        <Link to="/register" className="text-purple-600 dark:text-purple-400">
          Register
        </Link>
      </p>
    </div>
  );
}
