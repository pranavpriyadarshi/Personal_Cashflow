import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../AuthContext";

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    try {
      await register(email, password, name);
      navigate("/onboarding");
    } catch (err: any) {
      setError(err?.response?.data?.error ?? "Could not create account.");
    }
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-sm flex-col justify-center px-4">
      <h1 className="mb-1 text-xl font-semibold text-gray-900">Personal CFO</h1>
      <p className="mb-6 text-sm text-gray-500">Create your account</p>
      <form onSubmit={handleSubmit} className="space-y-3">
        <input
          className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
          placeholder="Full name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
        <input
          className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <input
          className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          minLength={8}
          required
        />
        {error && <p className="text-xs text-red-600">{error}</p>}
        <button type="submit" className="w-full rounded bg-purple-600 py-2 text-sm font-medium text-white">
          Register
        </button>
      </form>
      <p className="mt-4 text-center text-xs text-gray-500">
        Already have an account?{" "}
        <Link to="/login" className="text-purple-600">
          Log in
        </Link>
      </p>
    </div>
  );
}
